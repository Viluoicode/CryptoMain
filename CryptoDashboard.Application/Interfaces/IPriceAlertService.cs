// CryptoDashboard.Application/Interfaces/IPriceAlertService.cs
using CryptoDashboard.Application.DTOs.PriceAlert;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IPriceAlertService
    {
        Task<PriceAlertResponse> CreateAlertAsync(Guid userId, CreatePriceAlertRequest request);
        Task<List<PriceAlertResponse>> GetUserAlertsAsync(Guid userId);
        Task<bool> DeleteAlertAsync(Guid alertId, Guid userId);
    }
}
