using CryptoDashboard.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace CryptoDashboard.Application.DTOs.Order
{
    public class CreateOrderRequest
    {
        [Required] public Guid WalletId { get; set; }
        [Required] public string CoinId { get; set; } = string.Empty;
        [Required] public OrderSide Side { get; set; }
        [Required] public OrderType Type { get; set; }
        [Range(0.00000001, double.MaxValue, ErrorMessage = "TriggerPrice must be > 0")]
        public decimal TriggerPrice { get; set; }
        [Range(0.00000001, double.MaxValue, ErrorMessage = "Quantity must be > 0")]
        public decimal Quantity { get; set; }
    }

    public class OrderResponse
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public string WalletName { get; set; } = string.Empty;
        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;
        public OrderSide Side { get; set; }
        public OrderType Type { get; set; }
        public decimal TriggerPrice { get; set; }
        public decimal Quantity { get; set; }
        public OrderStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? FilledAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public decimal? FilledPrice { get; set; }
        public string? FailureReason { get; set; }
        public Guid? TransactionId { get; set; }
    }
}
