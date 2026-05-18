using CryptoDashboard.Application.DTOs.Position;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PositionController : ControllerBase
    {
        private readonly IPositionService _positionService;
        private readonly IIdempotencyService _idempotency;

        public PositionController(IPositionService positionService, IIdempotencyService idempotency)
        {
            _positionService = positionService;
            _idempotency = idempotency;
        }

        [HttpGet]
        public async Task<IActionResult> GetPositions()
        {
            var userId = GetCurrentUserId();
            var positions = await _positionService.GetUserPositionsAsync(userId);
            return Ok(positions);
        }

        [HttpPost]
        public async Task<IActionResult> OpenPosition([FromBody] OpenPositionRequest request)
        {
            var userId = GetCurrentUserId();

            // Optional Idempotency-Key header — prevents double-click duplicates.
            if (Request.Headers.TryGetValue("Idempotency-Key", out var keyValues))
            {
                var key = keyValues.ToString();
                if (!_idempotency.TryRegister(userId, key))
                {
                    return Conflict(new { message = "Duplicate request — this position was already opened." });
                }
            }

            var position = await _positionService.OpenPositionAsync(userId, request);
            return CreatedAtAction(nameof(GetPositions), position);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> ClosePosition(Guid id)
        {
            var userId = GetCurrentUserId();
            var position = await _positionService.ClosePositionAsync(id, userId);
            return Ok(position);
        }

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? throw new UnauthorizedAccessException("User ID claim not found");
            return Guid.Parse(claim);
        }
    }
}
