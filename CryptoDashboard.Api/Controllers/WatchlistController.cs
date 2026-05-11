using CryptoDashboard.Application.DTOs.Watchlist;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WatchlistController : ControllerBase
    {
        private readonly IWatchlistService _watchlistService;

        public WatchlistController(IWatchlistService watchlistService)
        {
            _watchlistService = watchlistService;
        }

        /// <summary>Get all watched coins for current user</summary>
        [HttpGet]
        public async Task<IActionResult> GetWatchlist()
        {
            var userId = GetCurrentUserId();
            var items = await _watchlistService.GetWatchlistAsync(userId);
            return Ok(items);
        }

        /// <summary>Add a coin to watchlist</summary>
        [HttpPost]
        public async Task<IActionResult> AddToWatchlist([FromBody] AddWatchlistRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CoinId))
                return BadRequest(new { message = "CoinId is required" });

            var userId = GetCurrentUserId();
            var item = await _watchlistService.AddToWatchlistAsync(userId, request);
            return Ok(item);
        }

        /// <summary>Remove a coin from watchlist</summary>
        [HttpDelete("{coinId}")]
        public async Task<IActionResult> RemoveFromWatchlist(string coinId)
        {
            var userId = GetCurrentUserId();
            var success = await _watchlistService.RemoveFromWatchlistAsync(userId, coinId);
            if (!success)
                return NotFound(new { message = "Coin not in watchlist" });
            return NoContent();
        }

        /// <summary>Check if a coin is watched</summary>
        [HttpGet("{coinId}/status")]
        public async Task<IActionResult> IsWatched(string coinId)
        {
            var userId = GetCurrentUserId();
            var watched = await _watchlistService.IsWatchedAsync(userId, coinId);
            return Ok(new { coinId, watched });
        }

        /// <summary>Sync watchlist from localStorage (called once after login)</summary>
        [HttpPost("sync")]
        public async Task<IActionResult> SyncFromLocalStorage([FromBody] List<AddWatchlistRequest> items)
        {
            var userId = GetCurrentUserId();
            await _watchlistService.SyncFromLocalStorageAsync(userId, items);
            var updated = await _watchlistService.GetWatchlistAsync(userId);
            return Ok(updated);
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim!);
        }
    }
}
