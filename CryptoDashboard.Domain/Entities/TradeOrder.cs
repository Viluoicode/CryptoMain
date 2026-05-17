namespace CryptoDashboard.Domain.Entities
{
    /// <summary>
    /// Conditional trade order: triggers a Buy/Sell transaction when live price crosses TriggerPrice.
    /// Monitored by OrderMonitorBackgroundService every few seconds against MemoryCryptoPriceCache.
    /// </summary>
    public class TradeOrder
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid WalletId { get; set; }

        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;

        public OrderSide Side { get; set; }            // Buy or Sell
        public OrderType Type { get; set; }            // StopLoss / TakeProfit / Limit
        public decimal TriggerPrice { get; set; }
        public decimal Quantity { get; set; }

        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? FilledAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        /// <summary>Set when execution failed (e.g. insufficient balance at trigger time).</summary>
        public string? FailureReason { get; set; }

        /// <summary>Price at which the order was actually filled (live cache price at trigger).</summary>
        public decimal? FilledPrice { get; set; }

        /// <summary>FK to the Transaction created when the order fires (null until filled).</summary>
        public Guid? TransactionId { get; set; }

        // Navigation
        public Wallet Wallet { get; set; } = null!;
        public User User { get; set; } = null!;
    }

    public enum OrderSide
    {
        Buy = 1,
        Sell = 2,
    }

    public enum OrderType
    {
        StopLoss = 1,    // Sell when price drops to or below trigger
        TakeProfit = 2,  // Sell when price rises to or above trigger
        Limit = 3,       // Buy/Sell when price reaches trigger (manual limit order)
    }

    public enum OrderStatus
    {
        Pending = 1,
        Filled = 2,
        Cancelled = 3,
        Failed = 4,
    }
}
