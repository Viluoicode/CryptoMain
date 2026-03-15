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

        /// <summary>
        /// Lấy tổng quan portfolio (allocations, P&L)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSummary()
        {
            var userId = GetCurrentUserId();
            var result = await _portfolioService.GetPortfolioSummaryAsync(userId);
            return Ok(result);
        }

        /// <summary>
        /// Lấy hiệu suất portfolio (buy/sell amounts, unrealized P&L)
        /// </summary>
        [HttpGet("performance")]
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
