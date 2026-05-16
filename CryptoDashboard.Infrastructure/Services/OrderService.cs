using CryptoDashboard.Application.DTOs.Order;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{
    public class OrderService : IOrderService
    {
        private readonly IApplicationDbContext _context;
        private readonly ICryptoService _cryptoService;

        public OrderService(IApplicationDbContext context, ICryptoService cryptoService)
        {
            _context = context;
            _cryptoService = cryptoService;
        }

        public async Task<OrderResponse> CreateOrderAsync(Guid userId, CreateOrderRequest request)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.Id == request.WalletId && w.UserId == userId)
                ?? throw new UnauthorizedAccessException("Wallet not found or access denied");

            var coin = await _cryptoService.GetCryptocurrencyByIdAsync(request.CoinId)
                ?? throw new ArgumentException($"Coin '{request.CoinId}' not found");

            var order = new TradeOrder
            {
                UserId = userId,
                WalletId = request.WalletId,
                CoinId = request.CoinId,
                CoinSymbol = coin.Symbol.ToUpper(),
                CoinName = coin.Name,
                Side = request.Side,
                Type = request.Type,
                TriggerPrice = request.TriggerPrice,
                Quantity = request.Quantity,
                Status = OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow,
            };

            _context.TradeOrders.Add(order);
            await _context.SaveChangesAsync();

            return MapToResponse(order, wallet.Name);
        }

        public async Task<List<OrderResponse>> GetUserOrdersAsync(Guid userId)
        {
            var orders = await _context.TradeOrders
                .Include(o => o.Wallet)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(o => MapToResponse(o, o.Wallet?.Name ?? string.Empty)).ToList();
        }

        public async Task<bool> CancelOrderAsync(Guid orderId, Guid userId)
        {
            var order = await _context.TradeOrders
                .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

            if (order == null) return false;
            if (order.Status != OrderStatus.Pending)
                throw new InvalidOperationException("Only pending orders can be cancelled");

            order.Status = OrderStatus.Cancelled;
            order.CancelledAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private static OrderResponse MapToResponse(TradeOrder o, string walletName) => new()
        {
            Id = o.Id,
            WalletId = o.WalletId,
            WalletName = walletName,
            CoinId = o.CoinId,
            CoinSymbol = o.CoinSymbol,
            CoinName = o.CoinName,
            Side = o.Side,
            Type = o.Type,
            TriggerPrice = o.TriggerPrice,
            Quantity = o.Quantity,
            Status = o.Status,
            CreatedAt = o.CreatedAt,
            FilledAt = o.FilledAt,
            CancelledAt = o.CancelledAt,
            FilledPrice = o.FilledPrice,
            FailureReason = o.FailureReason,
            TransactionId = o.TransactionId,
        };
    }
}
