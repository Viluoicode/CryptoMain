using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CryptoDashboard.Application.DTOs.Wallet;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IWalletService
    {
        Task<WalletResponse> CreateWalletAsync(Guid userId, CreateWalletRequest request);
        Task<List<WalletResponse>> GetUserWalletsAsync(Guid userId);
        Task<WalletDetailResponse?> GetWalletByIdAsync(Guid walletId, Guid userId);
        Task<WalletResponse?> UpdateWalletAsync(Guid walletId, Guid userId, UpdateWalletRequest request);
        Task<bool> DeleteWalletAsync(Guid walletId, Guid userId);
    }
}
