using CryptoDashboard.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace CryptoDashboard.Application.DTOs.Position
{
    public class OpenPositionRequest
    {
        [Required] public Guid WalletId { get; set; }
        [Required] public string CoinId { get; set; } = string.Empty;
        [Required] public PositionSide Side { get; set; }
        [Range(0.00000001, double.MaxValue, ErrorMessage = "Quantity must be > 0")]
        public decimal Quantity { get; set; }
        [Range(1, 100, ErrorMessage = "Leverage must be between 1x and 100x")]
        public int Leverage { get; set; }
    }

    public class PositionResponse
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public string WalletName { get; set; } = string.Empty;
        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;
        public PositionSide Side { get; set; }
        public decimal EntryPrice { get; set; }
        public decimal Quantity { get; set; }
        public int Leverage { get; set; }
        public decimal CollateralAmount { get; set; }
        public decimal LiquidationPrice { get; set; }
        public PositionStatus Status { get; set; }
        public decimal? ExitPrice { get; set; }
        public decimal? RealizedPnL { get; set; }
        public string? CloseReason { get; set; }
        public DateTime OpenedAt { get; set; }
        public DateTime? ClosedAt { get; set; }

        // Live computed (only for Open positions, requires current price)
        public decimal? CurrentPrice { get; set; }
        public decimal? UnrealizedPnL { get; set; }
        public decimal? UnrealizedPnLPercentage { get; set; }
        public decimal? MarginRatio { get; set; }
    }
}
