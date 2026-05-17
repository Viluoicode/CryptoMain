using CryptoDashboard.Application.DTOs.Order;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IOrderService
    {
        Task<OrderResponse> CreateOrderAsync(Guid userId, CreateOrderRequest request);
        Task<List<OrderResponse>> GetUserOrdersAsync(Guid userId);
        Task<bool> CancelOrderAsync(Guid orderId, Guid userId);
    }
}
