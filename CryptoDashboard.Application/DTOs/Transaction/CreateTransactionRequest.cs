using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CryptoDashboard.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace CryptoDashboard.Application.DTOs.Transaction
{
    public class CreateTransactionRequest
    {
        public Guid WalletId { get; set; }
        public string CoinId { get; set; } = string.Empty;
        public TransactionType Type { get; set; }
        public decimal Quantity { get; set; }
        public decimal PricePerCoin { get; set; }
        public string? Notes { get; set; }
        public DateTime? TransactionDate { get; set; }
    }
}
