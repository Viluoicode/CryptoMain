// CryptoDashboard.Application/DTOs/PriceAlert/PriceAlertResponse.cs
using CryptoDashboard.Domain.Entities;

namespace CryptoDashboard.Application.DTOs.PriceAlert
{
    public class PriceAlertResponse
    {
        public Guid Id { get; set; }
        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;
        public decimal TargetPrice { get; set; }
        public AlertDirection Direction { get; set; }
        public string DirectionDisplay => Direction == AlertDirection.Above ? "Trên" : "Dưới";
        public DateTime CreatedAt { get; set; }
    }
}
