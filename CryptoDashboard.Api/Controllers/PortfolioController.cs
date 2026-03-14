using System.Security.Claims;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PortfolioController : ControllerBase
    {
      private readonly IPortfolioService _portfolioService;
      
        public PortfolioController(IPortfolioService portfolioService)
        {
            _portfolioService = portfolioService;
        }
        [HttpGet]
        public async Task<IActionResult> GetSummary()
        {
            var userId = GetCurrentUserId();
            var result = await _portfolioService.GetPortfolioPerformanceAsync(userId);
            return Ok(result);
        }
        [HttpGet("performance")] // <- endpoint bạn đang thiếu
        public async Task<IActionResult> GetPerformance()
        {
            var userId = GetCurrentUserId();
            var result = await _portfolioService.GetPortfolioPerformanceAsync(userId);
            return Ok(result);
        }
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim!);
        }
    }
}
