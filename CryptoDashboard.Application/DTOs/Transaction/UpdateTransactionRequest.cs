using CryptoDashboard.Domain.Entities;

namespace CryptoDashboard.Application.DTOs.Transaction
{
    public class UpdateTransactionRequest
    {
        public TransactionType Type { get; set; }
        public decimal Quantity { get; set; }
        public decimal PricePerCoin { get; set; }
        public string? Notes { get; set; }
        public DateTime? TransactionDate { get; set; }
    }
}
