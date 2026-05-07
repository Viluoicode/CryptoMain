using CryptoDashboard.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Domain.Entities
{
    public enum TransactionType
    {
        Buy = 1,
        Sell = 2
    }

    public class Transaction : BaseEntity
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Wallet Wallet { get; set; } = null!;

        public string CoinId { get; set; } = string.Empty; // "bitcoin", "ethereum"
        public string CoinSymbol { get; set; } = string.Empty; // "BTC", "ETH"
        public string CoinName { get; set; } = string.Empty; // "Bitcoin", "Ethereum"

        public TransactionType Type { get; set; } // Buy or Sell
        public decimal Quantity { get; set; } // Số lượng coin
        public decimal PricePerCoin { get; set; } // Giá mua/bán mỗi coin (USD)
        public decimal TotalAmount { get; set; } // = Quantity * PricePerCoin

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; } // Ghi chú (optional)
    }
}
