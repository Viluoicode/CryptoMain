using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;


namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [EnableRateLimiting("crypto")]
    public class CryptoController : ControllerBase
    {
        private readonly ICryptoService _cryptoService;

        public CryptoController(ICryptoService cryptoService)
        {
            _cryptoService = cryptoService;
        }
        /// <summary>
        /// Lấy danh sách top cryptocurrency theo market cap
        /// </summary>
        /// 
        [HttpGet("top")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTopCryptocurrencies(int limit = 50)
        {
            try
            {
                var result = await _cryptoService.GetTopCryptocurrenciesAsync(limit);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to fetch crypto data", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết của 1 coin
        /// </summary>
        [HttpGet("{coinId}")]
        public async Task<IActionResult> GetCryptocurrencyById(string coinId)
        {
            try
            {
                var result = await _cryptoService.GetCryptocurrencyByIdAsync(coinId);

                if (result == null)
                {
                    return NotFound(new { message = $"Cryptocurrency '{coinId}' not found" });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to fetch crypto data", error = ex.Message });
            }
        }

        [HttpGet("{coinId}/history")]
        public async Task<IActionResult> GetPriceHistory(string coinId, [FromQuery] int days = 7)
        {
            try
            {
                var result = await _cryptoService.GetPriceHistoryAsync(coinId, days);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to fetch price history", error = ex.Message });
            }
        }
        [HttpGet("{coinId}/ohlc")]
        public async Task<IActionResult> GetOhlc(string coinId, [FromQuery] int days = 7)
        {
            try
            {
                var result = await _cryptoService.GetOhlcAsync(coinId, days);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to fetch OHLC data", error = ex.Message });
            }
        }

    }
}
