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
        [Required(ErrorMessage = "Wallet ID is required")]
        public Guid WalletId { get; set; }

        [Required(ErrorMessage = "Coin ID is required")]
        [StringLength(50)]
        public string CoinId { get; set; } = string.Empty; // "bitcoin", "ethereum"

        [Required(ErrorMessage = "Transaction type is required")]
        public TransactionType Type { get; set; } // Buy = 1, Sell = 2

        [Required]
        [Range(0.00000001, double.MaxValue, ErrorMessage = "Quantity must be greater than 0")]
        public decimal Quantity { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price per coin must be greater than 0")]
        public decimal PricePerCoin { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }

        public DateTime? TransactionDate { get; set; } // Optional, default = now
    }
}
