using CryptoDashboard.Application.DTOs.Wallet;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WalletController : Controller
    {
      private readonly IWalletService _walletService;
        public WalletController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        /// <summary>
        /// Tạo ví mới
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateWallet([FromBody] CreateWalletRequest request)
        {
            var userId = GetCurrentUserId();
            var wallet = await _walletService.CreateWalletAsync(userId, request);
            return CreatedAtAction(nameof(GetWalletById), new { id = wallet.Id }, wallet);
        }

        /// <summary>
        /// Lấy danh sách ví của user hiện tại
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetWallets()
        {
            var userId = GetCurrentUserId();
            var wallets = await _walletService.GetUserWalletsAsync(userId);
            return Ok(wallets);
        }

        /// <summary>
        /// Lấy chi tiết 1 ví (bao gồm holdings)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetWalletById(Guid id)
        {
            var userId = GetCurrentUserId();
            var wallet = await _walletService.GetWalletByIdAsync(id, userId);

            if (wallet == null)
            {
                return NotFound(new { message = "Wallet not found or you don't have permission" });
            }

            return Ok(wallet);
        }

        /// <summary>
        /// Cập nhật tên ví
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateWallet(Guid id, [FromBody] UpdateWalletRequest request)
        {
            var userId = GetCurrentUserId();
            var wallet = await _walletService.UpdateWalletAsync(id, userId, request);

            if (wallet == null)
            {
                return NotFound(new { message = "Wallet not found or you don't have permission" });
            }

            return Ok(wallet);
        }

        /// <summary>
        /// Xóa ví (cascade xóa luôn transactions)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWallet(Guid id)
        {
            var userId = GetCurrentUserId();
            var success = await _walletService.DeleteWalletAsync(id, userId);

            if (!success)
            {
                return NotFound(new { message = "Wallet not found or you don't have permission" });
            }

            return NoContent();
        }

        // Helper: Lấy UserId từ JWT token
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim!);
        }
    }
}
