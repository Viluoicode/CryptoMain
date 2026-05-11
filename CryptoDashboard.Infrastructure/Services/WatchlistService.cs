using CryptoDashboard.Application.DTOs.Watchlist;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{
    public class WatchlistService : IWatchlistService
    {
        private readonly IApplicationDbContext _context;

        public WatchlistService(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<WatchlistItemResponse>> GetWatchlistAsync(Guid userId)
        {
            return await _context.WatchlistItems
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .Select(w => new WatchlistItemResponse
                {
                    Id = w.Id,
                    CoinId = w.CoinId,
                    CoinSymbol = w.CoinSymbol,
                    CreatedAt = w.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<WatchlistItemResponse> AddToWatchlistAsync(Guid userId, AddWatchlistRequest request)
        {
            // Idempotent: return existing if already watched
            var existing = await _context.WatchlistItems
                .FirstOrDefaultAsync(w => w.UserId == userId && w.CoinId == request.CoinId.ToLower());

            if (existing != null)
            {
                return new WatchlistItemResponse
                {
                    Id = existing.Id,
                    CoinId = existing.CoinId,
                    CoinSymbol = existing.CoinSymbol,
                    CreatedAt = existing.CreatedAt
                };
            }

            var item = new WatchlistItem
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CoinId = request.CoinId.ToLower().Trim(),
                CoinSymbol = request.CoinSymbol.ToUpper().Trim()
            };

            _context.WatchlistItems.Add(item);
            await _context.SaveChangesAsync();

            return new WatchlistItemResponse
            {
                Id = item.Id,
                CoinId = item.CoinId,
                CoinSymbol = item.CoinSymbol,
                CreatedAt = item.CreatedAt
            };
        }

        public async Task<bool> RemoveFromWatchlistAsync(Guid userId, string coinId)
        {
            var item = await _context.WatchlistItems
                .FirstOrDefaultAsync(w => w.UserId == userId && w.CoinId == coinId.ToLower());

            if (item == null) return false;

            _context.WatchlistItems.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> IsWatchedAsync(Guid userId, string coinId)
        {
            return await _context.WatchlistItems
                .AnyAsync(w => w.UserId == userId && w.CoinId == coinId.ToLower());
        }

        public async Task SyncFromLocalStorageAsync(Guid userId, List<AddWatchlistRequest> items)
        {
            if (items == null || items.Count == 0) return;

            var existingCoinIds = await _context.WatchlistItems
                .Where(w => w.UserId == userId)
                .Select(w => w.CoinId)
                .ToListAsync();

            var toAdd = items
                .Where(i => !string.IsNullOrWhiteSpace(i.CoinId))
                .Where(i => !existingCoinIds.Contains(i.CoinId.ToLower()))
                .Select(i => new WatchlistItem
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    CoinId = i.CoinId.ToLower().Trim(),
                    CoinSymbol = i.CoinSymbol.ToUpper().Trim()
                })
                .ToList();

            if (toAdd.Count > 0)
            {
                _context.WatchlistItems.AddRange(toAdd);
                await _context.SaveChangesAsync();
            }
        }
    }
}
