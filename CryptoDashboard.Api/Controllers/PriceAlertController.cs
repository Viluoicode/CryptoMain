// CryptoDashboard.Api/Controllers/PriceAlertController.cs
using CryptoDashboard.Application.DTOs.PriceAlert;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PriceAlertController : ControllerBase
    {
        private readonly IPriceAlertService _alertService;

        public PriceAlertController(IPriceAlertService alertService)
        {
            _alertService = alertService;
        }

        /// <summary>Get all active alerts for current user</summary>
        [HttpGet]
        public async Task<IActionResult> GetAlerts()
        {
            var userId = GetUserId();
            var alerts = await _alertService.GetUserAlertsAsync(userId);
            return Ok(alerts);
        }

        /// <summary>Create a new price alert</summary>
        [HttpPost]
        public async Task<IActionResult> CreateAlert([FromBody] CreatePriceAlertRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CoinId))
                return BadRequest(new { message = "CoinId is required." });
            if (request.TargetPrice <= 0)
                return BadRequest(new { message = "TargetPrice must be positive." });

            var userId = GetUserId();
            try
            {
                var alert = await _alertService.CreateAlertAsync(userId, request);
                return CreatedAtAction(nameof(GetAlerts), new { }, alert);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Delete (dismiss) an alert — called after it triggers or by user manually</summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteAlert(Guid id)
        {
            var userId = GetUserId();
            var success = await _alertService.DeleteAlertAsync(id, userId);
            if (!success) return NotFound(new { message = "Alert not found." });
            return NoContent();
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
