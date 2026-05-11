using CryptoDashboard.Application.DTOs.Transaction;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy tất cả giao dịch của user hiện tại (có filter, search, sort)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] TransactionType? type = null,
            [FromQuery] string? search = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = null)
        {
            pageSize = Math.Min(pageSize, 100);
            var userId = GetCurrentUserId();
            var result = await _transactionService.GetUserTransactionsAsync(
                userId, page, pageSize, type, search, sortBy, sortDir);
            return Ok(result);
        }

        [HttpGet("wallet/{walletId}")]
        public async Task<IActionResult> GetWalletTransactions(
            Guid walletId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] TransactionType? type = null,
            [FromQuery] string? search = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = null)
        {
            try
            {
                pageSize = Math.Min(pageSize, 100);
                var userId = GetCurrentUserId();
                var result = await _transactionService.GetWalletTransactionsAsync(
                    walletId, userId, page, pageSize, type, search, sortBy, sortDir);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật giao dịch
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTransaction(Guid id, [FromBody] UpdateTransactionRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _transactionService.UpdateTransactionAsync(id, userId, request);
                if (result == null)
                    return NotFound(new { message = "Transaction not found or you don't have permission" });
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
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
