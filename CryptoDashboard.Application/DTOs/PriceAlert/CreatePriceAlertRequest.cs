// CryptoDashboard.Application/DTOs/PriceAlert/CreatePriceAlertRequest.cs
using CryptoDashboard.Domain.Entities;

namespace CryptoDashboard.Application.DTOs.PriceAlert
{
    public class CreatePriceAlertRequest
    {
        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;
        public decimal TargetPrice { get; set; }
        public AlertDirection Direction { get; set; }
    }
}
