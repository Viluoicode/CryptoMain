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

        // ── Create ────────────────────────────────────────────────────────────
        public async Task<TransactionResponse> CreateTransactionAsync(Guid userId, CreateTransactionRequest request)
        {
            await using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.Id == request.WalletId && w.UserId == userId);

                if (wallet == null)
                    throw new UnauthorizedAccessException("Wallet not found or you don't have permission");

                var coinData = await _cryptoService.GetCryptocurrencyByIdAsync(request.CoinId);
                if (coinData == null)
                    throw new ArgumentException($"Coin '{request.CoinId}' not found");

                var totalCost = request.Quantity * request.PricePerCoin;

                if (request.Type == TransactionType.Buy)
                {
                    // Check fiat balance
                    if (wallet.FiatBalance < totalCost)
                        throw new InvalidOperationException(
                            $"Insufficient fiat balance. Available: ${wallet.FiatBalance:F2}, Required: ${totalCost:F2}");

                    wallet.FiatBalance -= totalCost;
                }
                else if (request.Type == TransactionType.Sell)
                {
                    // Check coin balance
                    var currentQty = await GetCoinQuantityAsync(request.WalletId, request.CoinId);
                    if (request.Quantity > currentQty)
                        throw new InvalidOperationException(
                            $"Insufficient coin balance. Available: {currentQty}, Requested: {request.Quantity}");

                    wallet.FiatBalance += totalCost;
                }

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
                    TotalAmount = totalCost,
                    TransactionDate = request.TransactionDate ?? DateTime.UtcNow,
                    Notes = request.Notes
                };

                _context.Transactions.Add(transaction);
                wallet.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                return MapToResponse(transaction, wallet.Name);
            }
            catch
            {
                await dbTx.RollbackAsync();
                throw;
            }
        }

        // ── Update ────────────────────────────────────────────────────────────
        public async Task<TransactionResponse?> UpdateTransactionAsync(
            Guid transactionId, Guid userId, UpdateTransactionRequest request)
        {
            await using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                var transaction = await _context.Transactions
                    .Include(t => t.Wallet)
                    .FirstOrDefaultAsync(t => t.Id == transactionId && t.Wallet.UserId == userId);

                if (transaction == null) return null;

                var wallet = transaction.Wallet;
                var oldTotalCost = transaction.TotalAmount;
                var newTotalCost = request.Quantity * request.PricePerCoin;

                // Reverse the old fiat effect, then apply new one
                if (transaction.Type == TransactionType.Buy)
                    wallet.FiatBalance += oldTotalCost; // refund old cost
                else
                    wallet.FiatBalance -= oldTotalCost; // undo old sell proceeds

                if (request.Type == TransactionType.Buy)
                {
                    if (wallet.FiatBalance < newTotalCost)
                        throw new InvalidOperationException(
                            $"Insufficient fiat balance. Available: ${wallet.FiatBalance:F2}, Required: ${newTotalCost:F2}");
                    wallet.FiatBalance -= newTotalCost;
                }
                else if (request.Type == TransactionType.Sell)
                {
                    // Calculate coin balance excluding this transaction
                    var qtyExcludingThis = await GetCoinQuantityExcludingAsync(
                        transaction.WalletId, transaction.CoinId, transactionId);
                    if (request.Quantity > qtyExcludingThis)
                        throw new InvalidOperationException(
                            $"Insufficient coin balance. Available: {qtyExcludingThis}, Requested: {request.Quantity}");

                    wallet.FiatBalance += newTotalCost;
                }

                transaction.Type = request.Type;
                transaction.Quantity = request.Quantity;
                transaction.PricePerCoin = request.PricePerCoin;
                transaction.TotalAmount = newTotalCost;
                transaction.Notes = request.Notes;
                if (request.TransactionDate.HasValue)
                    transaction.TransactionDate = request.TransactionDate.Value;

                wallet.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                return MapToResponse(transaction, wallet.Name);
            }
            catch
            {
                await dbTx.RollbackAsync();
                throw;
            }
        }

        // ── Delete ────────────────────────────────────────────────────────────
        public async Task<bool> DeleteTransactionAsync(Guid transactionId, Guid userId)
        {
            await using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                var transaction = await _context.Transactions
                    .Include(t => t.Wallet)
                    .FirstOrDefaultAsync(t => t.Id == transactionId && t.Wallet.UserId == userId);

                if (transaction == null) return false;

                var wallet = transaction.Wallet;

                // Reverse the fiat balance effect
                if (transaction.Type == TransactionType.Buy)
                    wallet.FiatBalance += transaction.TotalAmount; // refund
                else
                    wallet.FiatBalance -= transaction.TotalAmount; // undo sell proceeds

                _context.Transactions.Remove(transaction);
                wallet.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();
                return true;
            }
            catch
            {
                await dbTx.RollbackAsync();
                throw;
            }
        }

        // ── Get user transactions (paginated + filter + search + sort) ─────────
        public async Task<PagedResult<TransactionResponse>> GetUserTransactionsAsync(
            Guid userId, int page = 1, int pageSize = 20,
            TransactionType? type = null, string? search = null,
            string? sortBy = null, string? sortDir = null)
        {
            var query = _context.Transactions
                .Include(t => t.Wallet)
                .Where(t => t.Wallet.UserId == userId)
                .Where(t => type == null || t.Type == type);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(t =>
                    t.CoinId.ToLower().Contains(s) ||
                    t.CoinSymbol.ToLower().Contains(s) ||
                    t.CoinName.ToLower().Contains(s));
            }

            query = ApplySorting(query, sortBy, sortDir);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<TransactionResponse>
            {
                Items = items.Select(t => MapToResponse(t, t.Wallet.Name)).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        // ── Get wallet transactions (paginated + filter + search + sort) ───────
        public async Task<PagedResult<TransactionResponse>> GetWalletTransactionsAsync(
            Guid walletId, Guid userId, int page = 1, int pageSize = 20,
            TransactionType? type = null, string? search = null,
            string? sortBy = null, string? sortDir = null)
        {
            var walletExists = await _context.Wallets
                .AnyAsync(w => w.Id == walletId && w.UserId == userId);

            if (!walletExists)
                throw new UnauthorizedAccessException("Wallet not found or you don't have permission");

            var query = _context.Transactions
                .Include(t => t.Wallet)
                .Where(t => t.WalletId == walletId)
                .Where(t => type == null || t.Type == type);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(t =>
                    t.CoinId.ToLower().Contains(s) ||
                    t.CoinSymbol.ToLower().Contains(s) ||
                    t.CoinName.ToLower().Contains(s));
            }

            query = ApplySorting(query, sortBy, sortDir);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<TransactionResponse>
            {
                Items = items.Select(t => MapToResponse(t, t.Wallet.Name)).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        private static IQueryable<Transaction> ApplySorting(
            IQueryable<Transaction> query, string? sortBy, string? sortDir)
        {
            var descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase)
                             || string.IsNullOrEmpty(sortDir); // default desc

            return sortBy?.ToLower() switch
            {
                "coin"        => descending ? query.OrderByDescending(t => t.CoinName)  : query.OrderBy(t => t.CoinName),
                "amount"      => descending ? query.OrderByDescending(t => t.TotalAmount) : query.OrderBy(t => t.TotalAmount),
                "quantity"    => descending ? query.OrderByDescending(t => t.Quantity)  : query.OrderBy(t => t.Quantity),
                "price"       => descending ? query.OrderByDescending(t => t.PricePerCoin) : query.OrderBy(t => t.PricePerCoin),
                "type"        => descending ? query.OrderByDescending(t => t.Type)      : query.OrderBy(t => t.Type),
                _             => descending ? query.OrderByDescending(t => t.TransactionDate) : query.OrderBy(t => t.TransactionDate)
            };
        }

        private async Task<decimal> GetCoinQuantityAsync(Guid walletId, string coinId)
        {
            var transactions = await _context.Transactions
                .Where(t => t.WalletId == walletId && t.CoinId == coinId)
                .ToListAsync();

            var buy  = transactions.Where(t => t.Type == TransactionType.Buy).Sum(t => t.Quantity);
            var sell = transactions.Where(t => t.Type == TransactionType.Sell).Sum(t => t.Quantity);
            return buy - sell;
        }

        private async Task<decimal> GetCoinQuantityExcludingAsync(Guid walletId, string coinId, Guid excludeId)
        {
            var transactions = await _context.Transactions
                .Where(t => t.WalletId == walletId && t.CoinId == coinId && t.Id != excludeId)
                .ToListAsync();

            var buy  = transactions.Where(t => t.Type == TransactionType.Buy).Sum(t => t.Quantity);
            var sell = transactions.Where(t => t.Type == TransactionType.Sell).Sum(t => t.Quantity);
            return buy - sell;
        }

        private static TransactionResponse MapToResponse(Transaction t, string walletName) => new()
        {
            Id              = t.Id,
            WalletId        = t.WalletId,
            WalletName      = walletName,
            CoinId          = t.CoinId,
            CoinSymbol      = t.CoinSymbol,
            CoinName        = t.CoinName,
            Type            = t.Type,
            Quantity        = t.Quantity,
            PricePerCoin    = t.PricePerCoin,
            TotalAmount     = t.TotalAmount,
            TransactionDate = t.TransactionDate,
            Notes           = t.Notes
        };
    }
}
