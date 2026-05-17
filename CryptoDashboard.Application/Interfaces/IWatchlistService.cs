using CryptoDashboard.Application.DTOs.Watchlist;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IWatchlistService
    {
        Task<List<WatchlistItemResponse>> GetWatchlistAsync(Guid userId);
        Task<WatchlistItemResponse> AddToWatchlistAsync(Guid userId, AddWatchlistRequest request);
        Task<bool> RemoveFromWatchlistAsync(Guid userId, string coinId);
        Task<bool> IsWatchedAsync(Guid userId, string coinId);
        /// <summary>Sync a list of coinId+symbol pairs from localStorage on first login.</summary>
        Task SyncFromLocalStorageAsync(Guid userId, List<AddWatchlistRequest> items);
    }
}
