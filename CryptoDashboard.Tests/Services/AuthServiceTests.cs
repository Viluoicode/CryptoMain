using CryptoDashboard.Application.DTOs.Auth;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using CryptoDashboard.Infrastructure.Security;
using CryptoDashboard.Infrastructure.Services;
using CryptoDashboard.Tests.Helpers;
using FluentAssertions;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace CryptoDashboard.Tests.Services
{
    public class AuthServiceTests
    {
        // ── Fake tokens được mock JwtService trả về ────────────────────────────
        private const string FakeAccessToken = "fake-access-token";
        private const string FakeRefreshToken = "fake-refresh-token";

        private readonly Mock<IJwtService> _jwtMock;

        public AuthServiceTests()
        {
            _jwtMock = new Mock<IJwtService>();

            _jwtMock
                .Setup(j => j.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(FakeAccessToken);

            _jwtMock
                .Setup(j => j.GenerateRefreshToken())
                .Returns(FakeRefreshToken);
        }

        private AuthService CreateService(CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx)
            => new AuthService(ctx, _jwtMock.Object);

        // ══════════════════════════════════════════════════════════════════════
        //  RegisterAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task RegisterAsync_NewUser_ReturnsAuthResponseWithTokens()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            var svc = CreateService(ctx);
            var req = new RegisterRequest
            {
                Username = "alice",
                Email = "alice@test.com",
                Password = "P@ssw0rd!"
            };

            // Act
            var result = await svc.RegisterAsync(req);

            // Assert
            result.Should().NotBeNull();
            result.AccessToken.Should().Be(FakeAccessToken);
            result.RefreshToken.Should().Be(FakeRefreshToken);
            result.Username.Should().Be("alice");
            result.Email.Should().Be("alice@test.com");
            result.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(15), TimeSpan.FromSeconds(10));
        }

        [Fact]
        public async Task RegisterAsync_NewUser_PersistsUserWithHashedPassword()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            var svc = CreateService(ctx);
            var req = new RegisterRequest
            {
                Username = "bob",
                Email = "bob@test.com",
                Password = "MySecret123!"
            };

            // Act
            await svc.RegisterAsync(req);

            // Assert
            var user = ctx.Users.Single();
            user.Username.Should().Be("bob");
            user.PasswordHash.Should().NotBe("MySecret123!"); // Không lưu plain text
            BCrypt.Net.BCrypt.Verify("MySecret123!", user.PasswordHash).Should().BeTrue();
        }

        [Fact]
        public async Task RegisterAsync_NewUser_StoresHashedRefreshTokenInDb()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            var svc = CreateService(ctx);
            var req = new RegisterRequest { Username = "carol", Email = "carol@test.com", Password = "P@ss!" };

            // Act
            await svc.RegisterAsync(req);

            // Assert – token trong DB phải là hash, KHÔNG phải raw token
            var user = ctx.Users.Single();
            user.RefreshToken.Should().NotBeNull();
            user.RefreshToken.Should().NotBe(FakeRefreshToken);
            user.RefreshTokenExpiryTime.Should().BeCloseTo(DateTime.UtcNow.AddDays(7), TimeSpan.FromSeconds(10));
        }

        [Fact]
        public async Task RegisterAsync_DuplicateEmail_ThrowsInvalidOperationException()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            ctx.Users.Add(new User
            {
                Username = "existing",
                Email = "dup@test.com",
                PasswordHash = "hash"
            });
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            var req = new RegisterRequest
            {
                Username = "newuser",
                Email = "dup@test.com",   // email trùng
                Password = "pass"
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.RegisterAsync(req));
        }

        [Fact]
        public async Task RegisterAsync_DuplicateEmail_ErrorMessageMentionsEmail()
        {
            using var ctx = TestDbContextFactory.Create();
            ctx.Users.Add(new User { Username = "x", Email = "dup@test.com", PasswordHash = "h" });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.RegisterAsync(new RegisterRequest { Username = "y", Email = "dup@test.com", Password = "p" }));

            ex.Message.Should().Be("Email already exists");
        }

        [Fact]
        public async Task RegisterAsync_DuplicateUsername_ThrowsInvalidOperationException()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            ctx.Users.Add(new User
            {
                Username = "alice",
                Email = "other@test.com",
                PasswordHash = "hash"
            });
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            var req = new RegisterRequest
            {
                Username = "alice",        // username trùng
                Email = "new@test.com",
                Password = "pass"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.RegisterAsync(req));

            ex.Message.Should().Be("Username already exists");
        }

        // ══════════════════════════════════════════════════════════════════════
        //  LoginAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task LoginAsync_ValidCredentials_ReturnsAuthResponseWithCorrectUser()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            ctx.Users.Add(new User
            {
                Username = "dave",
                Email = "dave@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct-pass")
            });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            // Act
            var result = await svc.LoginAsync(new LoginRequest
            {
                Email = "dave@test.com",
                Password = "correct-pass"
            });

            // Assert
            result.Should().NotBeNull();
            result.AccessToken.Should().Be(FakeAccessToken);
            result.RefreshToken.Should().Be(FakeRefreshToken);
            result.Username.Should().Be("dave");
            result.Email.Should().Be("dave@test.com");
        }

        [Fact]
        public async Task LoginAsync_ValidCredentials_UpdatesLastLoginAtInDb()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            ctx.Users.Add(new User
            {
                Username = "eve",
                Email = "eve@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("p")
            });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            // Act
            await svc.LoginAsync(new LoginRequest { Email = "eve@test.com", Password = "p" });

            // Assert
            var user = ctx.Users.Single();
            user.LastLoginAt.Should().NotBeNull();
            user.LastLoginAt!.Value.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        }

        [Fact]
        public async Task LoginAsync_EmailNotFound_ThrowsUnauthorizedAccessException()
        {
            using var ctx = TestDbContextFactory.Create();
            var svc = CreateService(ctx);

            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => svc.LoginAsync(new LoginRequest
                {
                    Email = "nobody@test.com",
                    Password = "p"
                }));

            ex.Message.Should().Be("Invalid email or password");
        }

        [Fact]
        public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedAccessException()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            ctx.Users.Add(new User
            {
                Username = "frank",
                Email = "frank@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("real-pass")
            });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => svc.LoginAsync(new LoginRequest
                {
                    Email = "frank@test.com",
                    Password = "wrong-pass"
                }));

            ex.Message.Should().Be("Invalid email or password");
        }

        [Fact]
        public async Task LoginAsync_ValidCredentials_RotatesRefreshTokenInDb()
        {
            using var ctx = TestDbContextFactory.Create();
            ctx.Users.Add(new User
            {
                Username = "gina",
                Email = "gina@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
                RefreshToken = "old-hash"
            });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            await svc.LoginAsync(new LoginRequest { Email = "gina@test.com", Password = "pass" });

            var user = ctx.Users.Single();
            user.RefreshToken.Should().NotBe("old-hash"); // phải được cập nhật
        }

        // ══════════════════════════════════════════════════════════════════════
        //  RefreshTokenAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokens()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            const string rawToken = "raw-refresh-token";
            ctx.Users.Add(new User
            {
                Username = "henry",
                Email = "henry@test.com",
                PasswordHash = "hash",
                RefreshToken = TokenHasher.Hash(rawToken),
                RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
            });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            // Act
            var result = await svc.RefreshTokenAsync(rawToken);

            // Assert
            result.Should().NotBeNull();
            result.AccessToken.Should().Be(FakeAccessToken);
            result.RefreshToken.Should().Be(FakeRefreshToken);
            result.Username.Should().Be("henry");
        }

        [Fact]
        public async Task RefreshTokenAsync_ValidToken_RotatesTokenInDb()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            const string rawToken = "original-token";
            var originalHash = TokenHasher.Hash(rawToken);
            ctx.Users.Add(new User
            {
                Username = "iris",
                Email = "iris@test.com",
                PasswordHash = "hash",
                RefreshToken = originalHash,
                RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7)
            });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            // Act
            await svc.RefreshTokenAsync(rawToken);

            // Assert – hash mới phải được ghi vào DB (token rotation)
            var user = ctx.Users.Single();
            user.RefreshToken.Should().NotBe(originalHash);
            user.RefreshTokenExpiryTime.Should().BeCloseTo(DateTime.UtcNow.AddDays(7), TimeSpan.FromSeconds(10));
        }

        [Fact]
        public async Task RefreshTokenAsync_InvalidToken_ThrowsSecurityTokenException()
        {
            using var ctx = TestDbContextFactory.Create();
            var svc = CreateService(ctx);

            var ex = await Assert.ThrowsAsync<SecurityTokenException>(
                () => svc.RefreshTokenAsync("totally-wrong-token"));

            ex.Message.Should().Be("Invalid or expired refresh token");
        }

        [Fact]
        public async Task RefreshTokenAsync_ExpiredToken_ThrowsSecurityTokenException()
        {
            // Arrange
            using var ctx = TestDbContextFactory.Create();
            const string rawToken = "expired-token";
            ctx.Users.Add(new User
            {
                Username = "jack",
                Email = "jack@test.com",
                PasswordHash = "hash",
                RefreshToken = TokenHasher.Hash(rawToken),
                RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(-1) // ĐÃ hết hạn
            });
            await ctx.SaveChangesAsync();
            var svc = CreateService(ctx);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<SecurityTokenException>(
                () => svc.RefreshTokenAsync(rawToken));

            ex.Message.Should().Be("Invalid or expired refresh token");
        }
    }
}
