using CryptoDashboard.Application.DTOs.Auth;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using CryptoDashboard.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly IApplicationDbContext _context;
        private readonly IJwtService _jwtService;

        public AuthService(IApplicationDbContext context, IJwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }
        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            // Kiểm tra email đã tồn tại
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                throw new InvalidOperationException("Email already exists");
            }

            // Kiểm tra username đã tồn tại
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            {
                throw new InvalidOperationException("Username already exists");
            }

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user.Id, user.Email, user.Username);
            var refreshToken = _jwtService.GenerateRefreshToken();

            // Hash refresh token trước khi lưu (nhất quán với Login)
            user.RefreshToken = TokenHasher.Hash(refreshToken);
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                Username = user.Username,
                Email = user.Email
            };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);


            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            var accessToken = _jwtService.GenerateAccessToken(user.Id, user.Email, user.Username);
            var refreshToken = _jwtService.GenerateRefreshToken();
            var refreshTokenHash = TokenHasher.Hash(refreshToken);

            user.RefreshToken = refreshTokenHash;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            user.LastLoginAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                Username = user.Username,
                Email = user.Email
            };
        }

        public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                throw new UnauthorizedAccessException("Current password is incorrect");

            if (request.NewPassword.Length < 8)
                throw new ArgumentException("New password must be at least 8 characters");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            // Invalidate all existing refresh tokens — force re-login on other devices
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;

            await _context.SaveChangesAsync();
        }

        public async Task RevokeRefreshTokenAsync(Guid userId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _context.SaveChangesAsync();
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
        {
            var tokenHash = TokenHasher.Hash(refreshToken);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == tokenHash);

            if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                throw new SecurityTokenException("Invalid or expired refresh token");
            }

            var newAccessToken = _jwtService.GenerateAccessToken(user.Id, user.Email, user.Username);
            var newRefreshToken = _jwtService.GenerateRefreshToken();

            user.RefreshToken = TokenHasher.Hash(newRefreshToken);
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

            await _context.SaveChangesAsync();

            return new AuthResponse
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                Username = user.Username,
                Email = user.Email
            };
        }
    }
}