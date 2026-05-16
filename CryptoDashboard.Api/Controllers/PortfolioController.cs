using System.Security.Claims;
using CryptoDashboard.Application.DTOs.Portfolio;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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

        /// <summary>Tổng quan portfolio (allocations, P&L)</summary>
        [HttpGet]
        public async Task<IActionResult> GetSummary()
        {
            var result = await _portfolioService.GetPortfolioSummaryAsync(GetCurrentUserId());
            return Ok(result);
        }

        /// <summary>Hiệu suất portfolio (buy/sell amounts, unrealized P&L)</summary>
        [HttpGet("performance")]
        public async Task<IActionResult> GetPerformance()
        {
            var result = await _portfolioService.GetPortfolioPerformanceAsync(GetCurrentUserId());
            return Ok(result);
        }

        /// <summary>Lịch sử giá trị portfolio theo ngày (từ snapshots DB)</summary>
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int days = 30)
        {
            days = Math.Clamp(days, 7, 365);
            var result = await _portfolioService.GetPortfolioHistoryAsync(GetCurrentUserId(), days);
            return Ok(result);
        }

        /// <summary>Tạo snapshot ngay lập tức cho user hiện tại (dùng để test)</summary>
        [HttpPost("snapshot")]
        public async Task<IActionResult> TakeSnapshot()
        {
            await _portfolioService.SaveDailySnapshotAsync(GetCurrentUserId());
            return Ok(new { message = "Snapshot saved" });
        }

        /// <summary>Bảng xếp hạng người dùng theo P&L%</summary>
        [HttpGet("leaderboard")]
        [AllowAnonymous]
        [EnableRateLimiting("leaderboard")]
        public async Task<IActionResult> GetLeaderboard(
            [FromQuery] LeaderboardPeriod period = LeaderboardPeriod.Week,
            [FromQuery] int top = 50)
        {
            top = Math.Clamp(top, 1, 100);
            var result = await _portfolioService.GetLeaderboardAsync(period, top);
            return Ok(result);
        }

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(claim!);
        }
    }
}
