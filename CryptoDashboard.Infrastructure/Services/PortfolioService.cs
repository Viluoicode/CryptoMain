using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.DTOs.Portfolio;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CryptoDashboard.Infrastructure.Services
{
    public class PortfolioService : IPortfolioService
    {
        private readonly IApplicationDbContext _context;
        private readonly ICryptoService _cryptoService;
        private readonly ILogger<PortfolioService> _logger;

        public PortfolioService(
            IApplicationDbContext context,
            ICryptoService cryptoService,
            ILogger<PortfolioService> logger)
        {
            _context = context;
            _cryptoService = cryptoService;
            _logger = logger;
        }

        // ── Summary ───────────────────────────────────────────────────────────
        public async Task<PortfolioSummaryResponse> GetPortfolioSummaryAsync(Guid userId)
        {
            var wallets = await _context.Wallets
                .Where(w => w.UserId == userId)
                .Include(w => w.Transactions)
                .ToListAsync();

            var allTransactions = wallets.SelectMany(w => w.Transactions).ToList();

            var grouped = allTransactions
                .GroupBy(t => new { t.CoinId, t.CoinSymbol, t.CoinName })
                .Select(g => new
                {
                    g.Key.CoinId, g.Key.CoinSymbol, g.Key.CoinName,
                    BuyQty    = g.Where(x => x.Type == TransactionType.Buy).Sum(x => x.Quantity),
                    SellQty   = g.Where(x => x.Type == TransactionType.Sell).Sum(x => x.Quantity),
                    BuyAmount = g.Where(x => x.Type == TransactionType.Buy).Sum(x => x.TotalAmount),
                    SellAmount= g.Where(x => x.Type == TransactionType.Sell).Sum(x => x.TotalAmount)
                })
                .Where(x => x.BuyQty > x.SellQty)
                .ToList();

            var coinIds = grouped.Select(g => g.CoinId).Distinct().ToList();
            Dictionary<string, CryptoListResponse> coinDataMap;
            try { coinDataMap = await _cryptoService.GetCryptocurrenciesByIdsAsync(coinIds); }
            catch { coinDataMap = new(); }

            var allocations = new List<PortfolioCoinAllocationResponse>();
            foreach (var coin in grouped)
            {
                var qty = coin.BuyQty - coin.SellQty;
                coinDataMap.TryGetValue(coin.CoinId, out var coinData);
                var currentPrice = coinData?.CurrentPrice ?? 0m;
                allocations.Add(new PortfolioCoinAllocationResponse
                {
                    CoinId       = coin.CoinId,
                    CoinSymbol   = coin.CoinSymbol,
                    CoinName     = coin.CoinName,
                    Image        = coinData?.Image ?? string.Empty,
                    Quantity     = qty,
                    CurrentPrice = currentPrice,
                    CurrentValue = qty * currentPrice,
                    InvestedValue= coin.BuyAmount - coin.SellAmount
                });
            }

            var totalCurrentValue = allocations.Sum(a => a.CurrentValue);
            foreach (var a in allocations)
                a.AllocationPercentage = totalCurrentValue > 0
                    ? (a.CurrentValue / totalCurrentValue) * 100m : 0m;

            var totalBuy   = allTransactions.Where(t => t.Type == TransactionType.Buy).Sum(t => t.TotalAmount);
            var totalSell  = allTransactions.Where(t => t.Type == TransactionType.Sell).Sum(t => t.TotalAmount);
            var netInvested= totalBuy - totalSell;
            var profitLoss = totalCurrentValue - netInvested;

            return new PortfolioSummaryResponse
            {
                WalletCount              = wallets.Count,
                TotalTransactionCount    = allTransactions.Count,
                TotalCurrentValue        = totalCurrentValue,
                TotalInvestedValue       = netInvested,
                TotalProfitLoss          = profitLoss,
                TotalProfitLossPercentage= netInvested > 0 ? (profitLoss / netInvested) * 100m : 0m,
                Allocations              = allocations.OrderByDescending(a => a.CurrentValue).ToList()
            };
        }

        // ── Performance ───────────────────────────────────────────────────────
        public async Task<PortfolioPerformanceResponse> GetPortfolioPerformanceAsync(Guid userId)
        {
            var wallets = await _context.Wallets
                .Where(w => w.UserId == userId)
                .Include(w => w.Transactions)
                .ToListAsync();

            var allTransactions = wallets.SelectMany(w => w.Transactions).ToList();
            var totalBuy  = allTransactions.Where(t => t.Type == TransactionType.Buy).Sum(t => t.TotalAmount);
            var totalSell = allTransactions.Where(t => t.Type == TransactionType.Sell).Sum(t => t.TotalAmount);
            var netInvested = totalBuy - totalSell;

            var summary = await GetPortfolioSummaryAsync(userId);
            var currentValue = summary.TotalCurrentValue;
            var unrealized   = currentValue - netInvested;

            return new PortfolioPerformanceResponse
            {
                TotalBuyAmount                 = totalBuy,
                TotalSellAmount                = totalSell,
                NetInvested                    = netInvested,
                CurrentPortfolioValue          = currentValue,
                UnrealizedProfitLoss           = unrealized,
                UnrealizedProfitLossPercentage = netInvested > 0 ? (unrealized / netInvested) * 100m : 0m,
                TotalBuyTransactions           = allTransactions.Count(t => t.Type == TransactionType.Buy),
                TotalSellTransactions          = allTransactions.Count(t => t.Type == TransactionType.Sell)
            };
        }

        // ── History (from DB snapshots) ────────────────────────────────────────
        public async Task<List<PortfolioHistoryPoint>> GetPortfolioHistoryAsync(Guid userId, int days = 30)
        {
            var today     = DateTime.UtcNow.Date;
            var startDate = today.AddDays(-(days - 1));

            // Pull snapshots from DB
            var snapshots = await _context.PortfolioSnapshots
                .Where(s => s.UserId == userId && s.SnapshotDate >= startDate)
                .OrderBy(s => s.SnapshotDate)
                .ToListAsync();

            // Always include today's live value
            var summary = await GetPortfolioSummaryAsync(userId);
            var todayPoint = new PortfolioHistoryPoint
            {
                Date          = today,
                TotalValue    = summary.TotalCurrentValue,
                TotalInvested = summary.TotalInvestedValue,
                ProfitLoss    = summary.TotalProfitLoss
            };

            // If no historical snapshots yet — return just today
            if (!snapshots.Any())
                return new List<PortfolioHistoryPoint> { todayPoint };

            // Build a full series, forward-filling gaps between snapshots
            var snapshotMap = snapshots.ToDictionary(s => s.SnapshotDate);
            var result      = new List<PortfolioHistoryPoint>();
            decimal lastValue    = snapshots.First().TotalValue;
            decimal lastInvested = snapshots.First().TotalInvested;
            decimal lastPnl      = snapshots.First().ProfitLoss;

            for (var date = startDate; date < today; date = date.AddDays(1))
            {
                if (snapshotMap.TryGetValue(date, out var snap))
                {
                    lastValue    = snap.TotalValue;
                    lastInvested = snap.TotalInvested;
                    lastPnl      = snap.ProfitLoss;
                }
                result.Add(new PortfolioHistoryPoint
                {
                    Date          = date,
                    TotalValue    = lastValue,
                    TotalInvested = lastInvested,
                    ProfitLoss    = lastPnl
                });
            }

            // Replace or add today with live value
            result.Add(todayPoint);
            return result;
        }

        // ── Snapshot: save for one user ────────────────────────────────────────
        public async Task SaveDailySnapshotAsync(Guid userId)
        {
            var today = DateTime.UtcNow.Date;

            // Idempotent — skip if already saved today
            var alreadyExists = await _context.PortfolioSnapshots
                .AnyAsync(s => s.UserId == userId && s.SnapshotDate == today);
            if (alreadyExists) return;

            // Skip users with no transactions
            var hasTransactions = await _context.Transactions
                .AnyAsync(t => t.Wallet.UserId == userId);
            if (!hasTransactions) return;

            try
            {
                var summary = await GetPortfolioSummaryAsync(userId);
                var snapshot = new PortfolioSnapshot
                {
                    UserId       = userId,
                    TotalValue   = summary.TotalCurrentValue,
                    TotalInvested= summary.TotalInvestedValue,
                    ProfitLoss   = summary.TotalProfitLoss,
                    SnapshotDate = today
                };

                _context.PortfolioSnapshots.Add(snapshot);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save portfolio snapshot for user {UserId}", userId);
            }
        }

        // ── Snapshot: save for all active users ───────────────────────────────
        public async Task SaveSnapshotsForAllUsersAsync()
        {
            // Users who have at least one transaction
            var userIds = await _context.Wallets
                .Where(w => w.Transactions.Any())
                .Select(w => w.UserId)
                .Distinct()
                .ToListAsync();

            _logger.LogInformation("Saving daily portfolio snapshots for {Count} users", userIds.Count);

            foreach (var userId in userIds)
            {
                await SaveDailySnapshotAsync(userId);
                // Small delay between users to avoid API rate limits
                await Task.Delay(500);
            }
        }
    }
}
