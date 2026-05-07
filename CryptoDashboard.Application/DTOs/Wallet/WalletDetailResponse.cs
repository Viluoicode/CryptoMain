using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Application.DTOs.Wallet
{
    public class WalletDetailResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Holdings: Tổng hợp số coin đang nắm giữ
        public List<HoldingResponse> Holdings { get; set; } = new();

        // Summary
        public decimal TotalValue { get; set; } // Tổng giá trị ví (USD)
        public int TransactionCount { get; set; } // Số lượng giao dịch
    }

    public class HoldingResponse
    {
        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public string CoinName { get; set; } = string.Empty;
        public decimal Quantity { get; set; } // Tổng số coin đang nắm giữ
        public decimal AverageBuyPrice { get; set; } // Giá mua trung bình
        public decimal CurrentPrice { get; set; } // Giá thị trường hiện tại
        public decimal CurrentValue { get; set; } // = Quantity × CurrentPrice
        public decimal ProfitLoss { get; set; } // Lãi/lỗ = CurrentValue - TotalInvested
        public decimal ProfitLossPercentage { get; set; } // % lãi/lỗ
    }
}
