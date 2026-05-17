namespace CryptoDashboard.Domain.Entities
{
    /// <summary>
    /// Leveraged futures-like position. Collateral is deducted from Wallet.FiatBalance.
    /// Liquidated by LiquidationBackgroundService when MarginRatio < MaintenanceMarginRate.
    /// </summary>
    public class Position
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid WalletId { get; set; }

        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;

        public PositionSide Side { get; set; }       // Long / Short
        public decimal EntryPrice { get; set; }      // Price at open
        public decimal Quantity { get; set; }        // Coin amount controlled by the position
        public int Leverage { get; set; }            // 2x, 5x, 10x, etc.

        /// <summary>USD locked from FiatBalance to back the position (= Quantity * EntryPrice / Leverage).</summary>
        public decimal CollateralAmount { get; set; }

        /// <summary>Price at which a liquidation is triggered (precomputed at open).</summary>
        public decimal LiquidationPrice { get; set; }

        public PositionStatus Status { get; set; } = PositionStatus.Open;

        public decimal? ExitPrice { get; set; }
        public decimal? RealizedPnL { get; set; }
        public string? CloseReason { get; set; }     // "Manual" | "Liquidated"

        public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosedAt { get; set; }

        // Navigation
        public Wallet Wallet { get; set; } = null!;
        public User User { get; set; } = null!;
    }

    public enum PositionSide
    {
        Long = 1,
        Short = 2,
    }

    public enum PositionStatus
    {
        Open = 1,
        Closed = 2,
        Liquidated = 3,
    }
}
