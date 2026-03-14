using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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

            var allocations = new List<PortfolioCoinAllocationResponse>();

            foreach (var coin in grouped)
            {
                var qty = coin.BuyQty - coin.SellQty;
                var coinData = await _cryptoService.GetCryptocurrencyByIdAsync(coin.CoinId);
                var currentPrice = coinData?.CurrentPrice ?? 0m;
                var currentValue = qty * currentPrice;

                allocations.Add(new PortfolioCoinAllocationResponse
                {
                    CoinId = coin.CoinId,
                    CoinSymbol = coin.CoinSymbol,
                    CoinName = coin.CoinName,
                    Quantity = qty,
                    CurrentPrice = currentPrice,
                    CurrentValue = currentValue
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
    }
}
