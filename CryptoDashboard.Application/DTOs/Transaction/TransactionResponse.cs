using CryptoDashboard.Domain.Entities;

namespace CryptoDashboard.Application.DTOs.Transaction
{
    public class TransactionResponse
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public string WalletName { get; set; } = string.Empty;

        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;

        public TransactionType Type { get; set; }
        public string TypeDisplay => Type == TransactionType.Buy ? "Buy" : "Sell";

        public decimal Quantity { get; set; }
        public decimal PricePerCoin { get; set; }
        public decimal TotalAmount { get; set; }

        public DateTime TransactionDate { get; set; }
        public string? Notes { get; set; }
    }
}
    