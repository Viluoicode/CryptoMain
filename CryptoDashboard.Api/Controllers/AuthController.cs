using Microsoft.AspNetCore.Mvc;
using CryptoDashboard.Application.DTOs.Auth;
using CryptoDashboard.Application.Interfaces;

namespace CryptoDashboard.Api.Controllers
{
        [ApiController]
        [Route("api/[controller]")]
        public class AuthController : ControllerBase
        {
            private readonly IAuthService _authService;

            public AuthController(IAuthService authService)
            {
                _authService = authService;
            }

            [HttpPost("register")]
            public async Task<IActionResult> Register([FromBody] RegisterRequest request)
            {
                try
                {
                    var response = await _authService.RegisterAsync(request);
                    return Ok(response);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }

            [HttpPost("login")]
            public async Task<IActionResult> Login([FromBody] LoginRequest request)
            {
                try
                {
                    var response = await _authService.LoginAsync(request);
                    return Ok(response);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Unauthorized(new { message = ex.Message });
                }
            }

            [HttpPost("refresh")]
            public async Task<IActionResult> RefreshToken([FromBody] string refreshToken)
            {
                try
                {
                    var response = await _authService.RefreshTokenAsync(refreshToken);
                    return Ok(response);
                }
                catch (Exception ex)
                {
                    return Unauthorized(new { message = ex.Message });
                }
            }
        }
}
