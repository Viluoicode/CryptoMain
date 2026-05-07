// CryptoDashboard.Infrastructure/Services/TransactionService.cs
using CryptoDashboard.Application.DTOs.Common;
using CryptoDashboard.Application.DTOs.Transaction;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{
    public class TransactionService : ITransactionService
    {
        private readonly IApplicationDbContext _context;
        private readonly ICryptoService _cryptoService;

        public TransactionService(IApplicationDbContext context, ICryptoService cryptoService)
        {
            _context = context;
            _cryptoService = cryptoService;
        }

        public async Task<TransactionResponse> CreateTransactionAsync(Guid userId, CreateTransactionRequest request)
        {
            // ── Bọc toàn bộ trong DB Transaction ──────────────────────────────
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Verify wallet belongs to user
                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.Id == request.WalletId && w.UserId == userId);

                if (wallet == null)
                    throw new UnauthorizedAccessException("Wallet not found or you don't have permission");

                // Get coin info from CoinGecko
                var coinData = await _cryptoService.GetCryptocurrencyByIdAsync(request.CoinId);
                if (coinData == null)
                    throw new ArgumentException($"Coin '{request.CoinId}' not found");

                // ── Validate Sell: kiểm tra số dư ────────────────────────────
                if (request.Type == TransactionType.Sell)
                {
                    var currentQty = await GetCoinQuantityAsync(request.WalletId, request.CoinId);
                    if (request.Quantity > currentQty)
                        throw new InvalidOperationException(
                            $"Insufficient balance. Available: {currentQty}, Requested: {request.Quantity}");
                }

                // Create transaction
                var transaction = new Transaction
                {
                    Id = Guid.NewGuid(),
                    WalletId = request.WalletId,
                    CoinId = request.CoinId,
                    CoinSymbol = coinData.Symbol,
                    CoinName = coinData.Name,
                    Type = request.Type,
                    Quantity = request.Quantity,
                    PricePerCoin = request.PricePerCoin,
                    TotalAmount = request.Quantity * request.PricePerCoin,
                    TransactionDate = request.TransactionDate ?? DateTime.UtcNow,
                    Notes = request.Notes
                };

                _context.Transactions.Add(transaction);

                // Update wallet UpdatedAt
                wallet.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                return MapToResponse(transaction, wallet.Name);
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResult<TransactionResponse>> GetUserTransactionsAsync(
       Guid userId, int page = 1, int pageSize = 20)
        {
            var query = _context.Transactions
                .Include(t => t.Wallet)
                .Where(t => t.Wallet.UserId == userId)
                .OrderByDescending(t => t.TransactionDate);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new TransactionResponse { /* ... giữ nguyên */ })
                .ToListAsync();

            return new PagedResult<TransactionResponse>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        public async Task<PagedResult<TransactionResponse>> GetWalletTransactionsAsync(
            Guid walletId, Guid userId, int page = 1, int pageSize = 20)
        {
            var walletExists = await _context.Wallets
                .AnyAsync(w => w.Id == walletId && w.UserId == userId);

            if (!walletExists)
                throw new UnauthorizedAccessException("Wallet not found or you don't have permission");

            var query = _context.Transactions
                .Include(t => t.Wallet)
                .Where(t => t.WalletId == walletId)
                .OrderByDescending(t => t.TransactionDate);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new TransactionResponse { /* ... giữ nguyên */ })
                .ToListAsync();

            return new PagedResult<TransactionResponse>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        public async Task<bool> DeleteTransactionAsync(Guid transactionId, Guid userId)
        {
            var transaction = await _context.Transactions
                .Include(t => t.Wallet)
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.Wallet.UserId == userId);

            if (transaction == null) return false;

            // Soft Delete — ApplicationDbContext.SaveChangesAsync tự chuyển
            // EntityState.Deleted → IsDeleted = true, DeletedAt = UtcNow
            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return true;
        }

        // ── Helper: tính số coin hiện có trong ví ─────────────────────────────
        private async Task<decimal> GetCoinQuantityAsync(Guid walletId, string coinId)
        {
            var transactions = await _context.Transactions
                .Where(t => t.WalletId == walletId && t.CoinId == coinId)
                .ToListAsync();

            var buyQty = transactions.Where(t => t.Type == TransactionType.Buy).Sum(t => t.Quantity);
            var sellQty = transactions.Where(t => t.Type == TransactionType.Sell).Sum(t => t.Quantity);
            return buyQty - sellQty;
        }

        private static TransactionResponse MapToResponse(Transaction t, string walletName) => new()
        {
            Id = t.Id,
            WalletId = t.WalletId,
            WalletName = walletName,
            CoinId = t.CoinId,
            CoinSymbol = t.CoinSymbol,
            CoinName = t.CoinName,
            Type = t.Type,
            Quantity = t.Quantity,
            PricePerCoin = t.PricePerCoin,
            TotalAmount = t.TotalAmount,
            TransactionDate = t.TransactionDate,
            Notes = t.Notes
        };
    }
}