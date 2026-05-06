using CryptoDashboard.Api.Controllers;
using CryptoDashboard.Application.DTOs.Auth;
using CryptoDashboard.Application.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace CryptoDashboard.Tests.Controllers
{
    /// <summary>
    /// Unit tests cho AuthController.
    /// AuthService được mock hoàn toàn — chỉ kiểm tra logic của controller.
    /// </summary>
    public class AuthControllerTests
    {
        private readonly Mock<IAuthService> _authMock;
        private readonly AuthController _controller;

        private static readonly AuthResponse FakeResponse = new()
        {
            AccessToken  = "access-token",
            RefreshToken = "refresh-token",
            ExpiresAt    = DateTime.UtcNow.AddMinutes(15),
            Username     = "testuser",
            Email        = "test@test.com"
        };

        public AuthControllerTests()
        {
            _authMock   = new Mock<IAuthService>();
            _controller = new AuthController(_authMock.Object);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  POST /api/auth/register
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Register_ValidRequest_Returns200WithAuthResponse()
        {
            // Arrange
            _authMock
                .Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>()))
                .ReturnsAsync(FakeResponse);

            var req = new RegisterRequest
            {
                Username = "testuser",
                Email    = "test@test.com",
                Password = "P@ssw0rd!"
            };

            // Act
            var result = await _controller.Register(req);

            // Assert
            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.StatusCode.Should().Be(200);

            var body = ok.Value.Should().BeOfType<AuthResponse>().Subject;
            body.Username.Should().Be("testuser");
            body.AccessToken.Should().Be("access-token");
        }

        [Fact]
        public async Task Register_DuplicateEmail_Returns400BadRequest()
        {
            // Arrange
            _authMock
                .Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>()))
                .ThrowsAsync(new InvalidOperationException("Email already exists"));

            // Act
            var result = await _controller.Register(new RegisterRequest
            {
                Username = "u",
                Email    = "dup@test.com",
                Password = "p"
            });

            // Assert
            var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            bad.StatusCode.Should().Be(400);
        }

        [Fact]
        public async Task Register_DuplicateEmail_ErrorMessagePropagated()
        {
            _authMock
                .Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>()))
                .ThrowsAsync(new InvalidOperationException("Email already exists"));

            var result = await _controller.Register(new RegisterRequest { Username = "u", Email = "e", Password = "p" });

            var bad  = (BadRequestObjectResult)result;
            var body = bad.Value!.ToString();
            body.Should().Contain("Email already exists");
        }

        // ══════════════════════════════════════════════════════════════════════
        //  POST /api/auth/login
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Login_ValidCredentials_Returns200WithAuthResponse()
        {
            _authMock
                .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .ReturnsAsync(FakeResponse);

            var result = await _controller.Login(new LoginRequest
            {
                Email    = "test@test.com",
                Password = "correct-pass"
            });

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.StatusCode.Should().Be(200);

            var body = ok.Value.Should().BeOfType<AuthResponse>().Subject;
            body.Email.Should().Be("test@test.com");
        }

        [Fact]
        public async Task Login_InvalidCredentials_Returns401Unauthorized()
        {
            _authMock
                .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .ThrowsAsync(new UnauthorizedAccessException("Invalid email or password"));

            var result = await _controller.Login(new LoginRequest
            {
                Email    = "test@test.com",
                Password = "wrong-pass"
            });

            var unauth = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauth.StatusCode.Should().Be(401);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  POST /api/auth/refresh
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task RefreshToken_ValidToken_Returns200WithNewTokens()
        {
            _authMock
                .Setup(s => s.RefreshTokenAsync(It.IsAny<string>()))
                .ReturnsAsync(FakeResponse);

            var result = await _controller.RefreshToken(new RefreshTokenRequest
            {
                RefreshToken = "valid-refresh-token"
            });

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task RefreshToken_InvalidToken_Returns401Unauthorized()
        {
            _authMock
                .Setup(s => s.RefreshTokenAsync(It.IsAny<string>()))
                .ThrowsAsync(new SecurityTokenException("Invalid or expired refresh token"));

            var result = await _controller.RefreshToken(new RefreshTokenRequest
            {
                RefreshToken = "bad-token"
            });

            var unauth = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauth.StatusCode.Should().Be(401);
        }

        [Fact]
        public async Task RefreshToken_ServiceThrowsGenericException_Returns401()
        {
            _authMock
                .Setup(s => s.RefreshTokenAsync(It.IsAny<string>()))
                .ThrowsAsync(new Exception("unexpected error"));

            var result = await _controller.RefreshToken(new RefreshTokenRequest
            {
                RefreshToken = "whatever"
            });

            result.Should().BeOfType<UnauthorizedObjectResult>()
                  .Which.StatusCode.Should().Be(401);
        }
    }
}
