// CryptoDashboard.Infrastructure/Services/WalletService.cs
using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.DTOs.Wallet;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{
    public class WalletService : IWalletService
    {
        private readonly IApplicationDbContext _context;
        private readonly ICryptoService _cryptoService;

        public WalletService(IApplicationDbContext context, ICryptoService cryptoService)
        {
            _context = context;
            _cryptoService = cryptoService;
        }

        public async Task<WalletResponse> CreateWalletAsync(Guid userId, CreateWalletRequest request)
        {
            var wallet = new Wallet
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                UserId = userId,
                FiatBalance = 10_000m, // Starting paper-trade balance
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Wallets.Add(wallet);
            await _context.SaveChangesAsync();

            return MapToResponse(wallet);
        }

        public async Task<List<WalletResponse>> GetUserWalletsAsync(Guid userId)
        {
            return await _context.Wallets
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .Select(w => new WalletResponse
                {
                    Id = w.Id,
                    Name = w.Name,
                    UserId = w.UserId,
                    FiatBalance = w.FiatBalance,
                    CreatedAt = w.CreatedAt,
                    UpdatedAt = w.UpdatedAt
                })
                .ToListAsync();
        }

        public async Task<WalletDetailResponse?> GetWalletByIdAsync(Guid walletId, Guid userId)
        {
            var wallet = await _context.Wallets
                .Include(w => w.Transactions)
                .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);

            if (wallet == null) return null;

            var holdings = await CalculateHoldingsAsync(wallet.Transactions);
            var totalValue = holdings.Sum(h => h.CurrentValue);

            return new WalletDetailResponse
            {
                Id = wallet.Id,
                Name = wallet.Name,
                FiatBalance = wallet.FiatBalance,
                CreatedAt = wallet.CreatedAt,
                UpdatedAt = wallet.UpdatedAt,
                Holdings = holdings,
                TotalValue = totalValue,
                TransactionCount = wallet.Transactions.Count
            };
        }

        public async Task<WalletResponse?> UpdateWalletAsync(Guid walletId, Guid userId, UpdateWalletRequest request)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);

            if (wallet == null) return null;

            wallet.Name = request.Name;
            wallet.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToResponse(wallet);
        }

        public async Task<WalletResponse?> DepositFiatAsync(Guid walletId, Guid userId, DepositFiatRequest request)
        {
            if (request.Amount <= 0)
                throw new ArgumentException("Deposit amount must be positive.");
            if (request.Amount > 1_000_000)
                throw new ArgumentException("Maximum deposit per transaction is $1,000,000.");

            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);

            if (wallet == null) return null;

            wallet.FiatBalance += request.Amount;
            await _context.SaveChangesAsync();

            return MapToResponse(wallet);
        }

        public async Task<bool> DeleteWalletAsync(Guid walletId, Guid userId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await _context.Wallets
                    .Include(w => w.Transactions)
                    .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);

                if (wallet == null) return false;

                foreach (var tx in wallet.Transactions)
                {
                    _context.Transactions.Remove(tx);
                }

                _context.Wallets.Remove(wallet);

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        // ── Helper: tính holdings ──────────────────────────────────────────────
        private async Task<List<HoldingResponse>> CalculateHoldingsAsync(ICollection<Transaction> transactions)
        {
            var grouped = transactions
                .GroupBy(t => new { t.CoinId, t.CoinSymbol, t.CoinName })
                .Select(g => new
                {
                    g.Key.CoinId,
                    g.Key.CoinSymbol,
                    g.Key.CoinName,
                    BuyQuantity = g.Where(t => t.Type == TransactionType.Buy).Sum(t => t.Quantity),
                    SellQuantity = g.Where(t => t.Type == TransactionType.Sell).Sum(t => t.Quantity),
                    TotalInvested = g.Where(t => t.Type == TransactionType.Buy).Sum(t => t.TotalAmount)
                })
                .Where(x => x.BuyQuantity > x.SellQuantity)
                .ToList();

            var coinIds = grouped.Select(g => g.CoinId).Distinct().ToList();
            Dictionary<string, CryptoListResponse> coinDataMap;
            try
            {
                coinDataMap = await _cryptoService.GetCryptocurrenciesByIdsAsync(coinIds);
            }
            catch
            {
                coinDataMap = new Dictionary<string, CryptoListResponse>();
            }

            var holdings = new List<HoldingResponse>();
            foreach (var item in grouped)
            {
                var quantity = item.BuyQuantity - item.SellQuantity;
                var avgBuyPrice = item.BuyQuantity > 0 ? item.TotalInvested / item.BuyQuantity : 0;

                coinDataMap.TryGetValue(item.CoinId, out var coinData);
                var currentPrice = coinData?.CurrentPrice ?? avgBuyPrice;
                var currentValue = quantity * currentPrice;
                var profitLoss = currentValue - (quantity * avgBuyPrice);
                var profitLossPct = avgBuyPrice > 0
                    ? (profitLoss / (quantity * avgBuyPrice)) * 100
                    : 0;

                holdings.Add(new HoldingResponse
                {
                    CoinId = item.CoinId,
                    CoinSymbol = item.CoinSymbol,
                    CoinName = item.CoinName,
                    Quantity = quantity,
                    AverageBuyPrice = avgBuyPrice,
                    CurrentPrice = currentPrice,
                    CurrentValue = currentValue,
                    ProfitLoss = profitLoss,
                    ProfitLossPercentage = profitLossPct
                });
            }

            return holdings;
        }

        private static WalletResponse MapToResponse(Wallet w) => new()
        {
            Id = w.Id,
            Name = w.Name,
            UserId = w.UserId,
            FiatBalance = w.FiatBalance,
            CreatedAt = w.CreatedAt,
            UpdatedAt = w.UpdatedAt
        };
    }
}
