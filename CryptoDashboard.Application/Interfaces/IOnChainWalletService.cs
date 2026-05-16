using CryptoDashboard.Application.DTOs.OnChain;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IOnChainWalletService
    {
        Task<OnChainWalletResponse> AddWalletAsync(Guid userId, AddOnChainWalletRequest request);
        Task<List<OnChainWalletResponse>> GetUserWalletsAsync(Guid userId);
        Task<OnChainWalletResponse> SyncWalletAsync(Guid walletId, Guid userId);
        Task<bool> RemoveWalletAsync(Guid walletId, Guid userId);
    }
}
