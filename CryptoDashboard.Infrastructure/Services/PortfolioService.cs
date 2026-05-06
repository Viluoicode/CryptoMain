using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.DTOs.Portfolio;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{

    public class PortfolioService : IPortfolioService
    {
        private readonly IApplicationDbContext _context;
        private readonly ICryptoService _cryptoService;


        public PortfolioService(IApplicationDbContext context, ICryptoService cryptoService)
        {
            _context = context;
            _cryptoService = cryptoService;
        }
        public async Task<PortfolioSummaryResponse> GetPortfolioSummaryAsync(Guid userId)
        {
            var wallets = await _context.Wallets
                .Where(w => w.UserId == userId)
                .Include(w => w.Transactions)
                .ToListAsync();

            var allTransactions = wallets.SelectMany(w => w.Transactions).ToList();

            // Group theo coin
            var grouped = allTransactions
                .GroupBy(t => new { t.CoinId, t.CoinSymbol, t.CoinName })
                .Select(g => new
                {
                    g.Key.CoinId,
                    g.Key.CoinSymbol,
                    g.Key.CoinName,
                    BuyQty = g.Where(x => x.Type == TransactionType.Buy).Sum(x => x.Quantity),
                    SellQty = g.Where(x => x.Type == TransactionType.Sell).Sum(x => x.Quantity),
                    BuyAmount = g.Where(x => x.Type == TransactionType.Buy).Sum(x => x.TotalAmount),
                    SellAmount = g.Where(x => x.Type == TransactionType.Sell).Sum(x => x.TotalAmount)
                })
                .Where(x => x.BuyQty > x.SellQty)
                .ToList();

            // Batch fetch all coin prices in a single API call (fixes N+1 problem)
            var coinIds = grouped.Select(g => g.CoinId).Distinct().ToList();
            Dictionary<string, CryptoListResponse> coinDataMap;
            try
            {
                coinDataMap = await _cryptoService.GetCryptocurrenciesByIdsAsync(coinIds);
            }
            catch
            {
                // Fallback: empty map — prices will default to 0
                coinDataMap = new Dictionary<string, CryptoListResponse>();
            }

            var allocations = new List<PortfolioCoinAllocationResponse>();

            foreach (var coin in grouped)
            {
                var qty = coin.BuyQty - coin.SellQty;
                coinDataMap.TryGetValue(coin.CoinId, out var coinData);
                var currentPrice = coinData?.CurrentPrice ?? 0m;
                var currentValue = qty * currentPrice;

                var investedValue = coin.BuyAmount - coin.SellAmount;

                allocations.Add(new PortfolioCoinAllocationResponse
                {
                    CoinId = coin.CoinId,
                    CoinSymbol = coin.CoinSymbol,
                    CoinName = coin.CoinName,
                    Quantity = qty,
                    CurrentPrice = currentPrice,
                    CurrentValue = currentValue,
                    InvestedValue = investedValue
                });
            }

            var totalCurrentValue = allocations.Sum(a => a.CurrentValue);
            foreach (var a in allocations)
            {
                a.AllocationPercentage = totalCurrentValue > 0
                    ? (a.CurrentValue / totalCurrentValue) * 100m
                    : 0m;
            }

            var totalBuy = allTransactions.Where(t => t.Type == TransactionType.Buy).Sum(t => t.TotalAmount);
            var totalSell = allTransactions.Where(t => t.Type == TransactionType.Sell).Sum(t => t.TotalAmount);
            var netInvested = totalBuy - totalSell;
            var totalProfitLoss = totalCurrentValue - netInvested;
            var totalProfitLossPercentage = netInvested > 0
                ? (totalProfitLoss / netInvested) * 100m
                : 0m;

            return new PortfolioSummaryResponse
            {
                WalletCount = wallets.Count,
                TotalTransactionCount = allTransactions.Count,
                TotalCurrentValue = totalCurrentValue,
                TotalInvestedValue = netInvested,
                TotalProfitLoss = totalProfitLoss,
                TotalProfitLossPercentage = totalProfitLossPercentage,
                Allocations = allocations.OrderByDescending(a => a.CurrentValue).ToList()
            };
        }

        public async Task<PortfolioPerformanceResponse> GetPortfolioPerformanceAsync(Guid userId)
        {
            var wallets = await _context.Wallets
                .Where(w => w.UserId == userId)
                .Include(w => w.Transactions)
                .ToListAsync();

            var allTransactions = wallets.SelectMany(w => w.Transactions).ToList();

            var totalBuy = allTransactions.Where(t => t.Type == TransactionType.Buy).Sum(t => t.TotalAmount);
            var totalSell = allTransactions.Where(t => t.Type == TransactionType.Sell).Sum(t => t.TotalAmount);
            var netInvested = totalBuy - totalSell;

            // dùng summary để tái sử dụng logic current value
            var summary = await GetPortfolioSummaryAsync(userId);
            var currentValue = summary.TotalCurrentValue;
            var unrealized = currentValue - netInvested;
            var unrealizedPct = netInvested > 0 ? (unrealized / netInvested) * 100m : 0m;

            return new PortfolioPerformanceResponse
            {
                TotalBuyAmount = totalBuy,
                TotalSellAmount = totalSell,
                NetInvested = netInvested,
                CurrentPortfolioValue = currentValue,
                UnrealizedProfitLoss = unrealized,
                UnrealizedProfitLossPercentage = unrealizedPct,
                TotalBuyTransactions = allTransactions.Count(t => t.Type == TransactionType.Buy),
                TotalSellTransactions = allTransactions.Count(t => t.Type == TransactionType.Sell)
            };
        }
        public async Task<List<PortfolioHistoryPoint>> GetPortfolioHistoryAsync(string userId, int days = 30)
        {
            // Lấy tất cả transactions của user (đã có sẵn)
            var transactions = await _context.Transactions
                .Include(t => t.Wallet)
                .Where(t => t.Wallet.UserId == Guid.Parse(userId))
                .OrderBy(t => t.TransactionDate)
                .ToListAsync();

            if (!transactions.Any()) return new List<PortfolioHistoryPoint>();

            // Lấy tất cả coinIds đang hold
            var coinIds = transactions.Select(t => t.CoinId).Distinct().ToList();

            // Lấy giá hiện tại từ CryptoService
            var prices = await _cryptoService.GetCryptocurrenciesByIdsAsync(coinIds);

            var result = new List<PortfolioHistoryPoint>();
            var today = DateTime.UtcNow.Date;
            var startDate = today.AddDays(-days);

            for (var date = startDate; date <= today; date = date.AddDays(1))
            {
                // Tính holdings tại ngày đó (dựa vào transactions đã xảy ra)
                decimal totalValue = 0;
                foreach (var coinId in coinIds)
                {
                    var txUpToDate = transactions
                        .Where(t => t.CoinId == coinId && t.TransactionDate.Date <= date)
                        .ToList();

                    var qty = txUpToDate.Sum(t => t.Type == TransactionType.Buy
                        ? t.Quantity
                        : -t.Quantity);

                    if (qty <= 0) continue;

                    var price = prices.TryGetValue(coinId, out var p) ? p.CurrentPrice : 0;
                    totalValue += qty * price;
                }

                result.Add(new PortfolioHistoryPoint { Date = date, TotalValue = totalValue });
            }

            return result;
        }
    }
}