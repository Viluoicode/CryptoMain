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

        /// <summary>Export tất cả giao dịch ra file CSV</summary>
        [HttpGet("export")]
        public async Task<IActionResult> ExportCsv([FromQuery] TransactionType? type = null)
        {
            var userId = GetCurrentUserId();
            var result = await _transactionService.GetUserTransactionsAsync(
                userId, page: 1, pageSize: 10_000, type: type);

            var lines = new System.Text.StringBuilder();
            lines.AppendLine("Date,Type,Coin,Symbol,Quantity,PricePerCoin,TotalAmount,Wallet,Notes");

            foreach (var tx in result.Items)
            {
                var line = string.Join(",",
                    tx.TransactionDate.ToString("yyyy-MM-dd"),
                    tx.Type == TransactionType.Buy ? "Buy" : "Sell",
                    EscapeCsv(tx.CoinName),
                    tx.CoinSymbol.ToUpper(),
                    tx.Quantity.ToString("F8"),
                    tx.PricePerCoin.ToString("F8"),
                    tx.TotalAmount.ToString("F2"),
                    EscapeCsv(tx.WalletName),
                    EscapeCsv(tx.Notes ?? "")
                );
                lines.AppendLine(line);
            }

            var bytes = System.Text.Encoding.UTF8.GetBytes(lines.ToString());
            var fileName = $"transactions_{DateTime.UtcNow:yyyyMMdd}.csv";
            return File(bytes, "text/csv", fileName);
        }

        private static string EscapeCsv(string value)
        {
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return $"\"{value.Replace("\"", "\"\"")}\"";
            return value;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.Parse(userIdClaim!);
        }
    }
}
