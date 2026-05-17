using CryptoDashboard.Application.DTOs.OnChain;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OnChainWalletController : ControllerBase
    {
        private readonly IOnChainWalletService _service;

        public OnChainWalletController(IOnChainWalletService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetWallets()
        {
            var userId = GetCurrentUserId();
            var wallets = await _service.GetUserWalletsAsync(userId);
            return Ok(wallets);
        }

        [HttpPost]
        public async Task<IActionResult> AddWallet([FromBody] AddOnChainWalletRequest request)
        {
            var userId = GetCurrentUserId();
            var wallet = await _service.AddWalletAsync(userId, request);
            return CreatedAtAction(nameof(GetWallets), wallet);
        }

        [HttpPost("{id:guid}/sync")]
        public async Task<IActionResult> SyncWallet(Guid id)
        {
            var userId = GetCurrentUserId();
            var wallet = await _service.SyncWalletAsync(id, userId);
            return Ok(wallet);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> RemoveWallet(Guid id)
        {
            var userId = GetCurrentUserId();
            var result = await _service.RemoveWalletAsync(id, userId);
            if (!result) return NotFound();
            return NoContent();
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
