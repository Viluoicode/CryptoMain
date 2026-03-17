using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Wallets.Add(wallet);
            await _context.SaveChangesAsync();

            return new WalletResponse
            {
                Id = wallet.Id,
                Name = wallet.Name,
                UserId = wallet.UserId,
                CreatedAt = wallet.CreatedAt,
                UpdatedAt = wallet.UpdatedAt
            };
        }

        public async Task<List<WalletResponse>> GetUserWalletsAsync(Guid userId)
        {
            var wallets = await _context.Wallets
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .Select(w => new WalletResponse
                {
                    Id = w.Id,
                    Name = w.Name,
                    UserId = w.UserId,
                    CreatedAt = w.CreatedAt,
                    UpdatedAt = w.UpdatedAt
                })
                .ToListAsync();

            return wallets;
        }

        public async Task<WalletDetailResponse?> GetWalletByIdAsync(Guid walletId, Guid userId)
        {
            var wallet = await _context.Wallets
                .Include(w => w.Transactions)
                .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);

            if (wallet == null)
            {
                return null;
            }

            // Tính toán holdings từ transactions
            var holdings = await CalculateHoldingsAsync(wallet.Transactions);

            // Tính tổng giá trị ví
            var totalValue = holdings.Sum(h => h.CurrentValue);

            return new WalletDetailResponse
            {
                Id = wallet.Id,
                Name = wallet.Name,
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

            if (wallet == null)
            {
                return null;
            }

            wallet.Name = request.Name;
            wallet.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new WalletResponse
            {
                Id = wallet.Id,
                Name = wallet.Name,
                UserId = wallet.UserId,
                CreatedAt = wallet.CreatedAt,
                UpdatedAt = wallet.UpdatedAt
            };
        }

        public async Task<bool> DeleteWalletAsync(Guid walletId, Guid userId)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);

            if (wallet == null)
            {
                return false;
            }

            _context.Wallets.Remove(wallet);
            await _context.SaveChangesAsync();

            return true;
        }

        // Helper method: Tính holdings từ transactions
        private async Task<List<HoldingResponse>> CalculateHoldingsAsync(ICollection<Transaction> transactions)
        {
            // Group transactions by coinId
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
                .Where(x => x.BuyQuantity > x.SellQuantity) // Chỉ lấy coin còn nắm giữ
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
                // Fallback: empty map — will use avgBuyPrice below
                coinDataMap = new Dictionary<string, CryptoListResponse>();
            }

            var holdings = new List<HoldingResponse>();

            foreach (var item in grouped)
            {
                var quantity = item.BuyQuantity - item.SellQuantity;
                var avgBuyPrice = item.TotalInvested / item.BuyQuantity;

                // Get current price from batch result, fallback to avgBuyPrice
                coinDataMap.TryGetValue(item.CoinId, out var coinData);
                var currentPrice = coinData?.CurrentPrice ?? avgBuyPrice;

                var currentValue = quantity * currentPrice;
                var profitLoss = currentValue - (quantity * avgBuyPrice);
                var profitLossPercentage = avgBuyPrice > 0
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
                    ProfitLossPercentage = profitLossPercentage
                });
            }

            return holdings;
        }
    }
}
