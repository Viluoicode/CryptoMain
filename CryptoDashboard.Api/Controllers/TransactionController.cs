using CryptoDashboard.Application.DTOs.Transaction;
using CryptoDashboard.Application.Interfaces;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly ITransactionService _transactionService;

        public TransactionController(ITransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        /// <summary>
        /// Thêm giao dịch mua/bán coin
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var transaction = await _transactionService.CreateTransactionAsync(userId, request);
                return CreatedAtAction(nameof(GetWalletTransactions),
                    new { walletId = transaction.WalletId }, transaction);
            }
            catch (UnauthorizedAccessException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy tất cả giao dịch của user hiện tại
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTransactions()
        {
            var userId = GetCurrentUserId();
            var transactions = await _transactionService.GetUserTransactionsAsync(userId);
            return Ok(transactions);
        }

        /// <summary>
        /// Lấy giao dịch của 1 ví cụ thể
        /// </summary>
        [HttpGet("wallet/{walletId}")]
        public async Task<IActionResult> GetWalletTransactions(Guid walletId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var transactions = await _transactionService.GetWalletTransactionsAsync(walletId, userId);
                return Ok(transactions);
            }
            catch (UnauthorizedAccessException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa giao dịch
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(Guid id)
        {
            var userId = GetCurrentUserId();
            var success = await _transactionService.DeleteTransactionAsync(id, userId);

            if (!success)
            {
                return NotFound(new { message = "Transaction not found or you don't have permission" });
            }

            return NoContent();
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim!);
        }
    }
}
