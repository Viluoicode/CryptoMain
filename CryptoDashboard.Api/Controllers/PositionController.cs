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

        public PositionController(IPositionService positionService)
        {
            _positionService = positionService;
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
