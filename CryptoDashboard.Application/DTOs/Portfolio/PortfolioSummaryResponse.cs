using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Application.DTOs.Portfolio
{
    public class PortfolioSummaryResponse
    {
        public int WalletCount { get; set; }
        public int TotalTransactionCount { get; set; }

        public decimal TotalCurrentValue { get; set; }      // Giá trị hiện tại
        public decimal TotalInvestedValue { get; set; }     // Tổng vốn đã bỏ vào (net)
        public decimal TotalProfitLoss { get; set; }        // Lãi/lỗ tuyệt đối
        public decimal TotalProfitLossPercentage { get; set; }

        public List<PortfolioCoinAllocationResponse> Allocations { get; set; } = new();
    }
    public class PortfolioCoinAllocationResponse
    {
        public string CoinId { get; set; } = null!;
        public string CoinSymbol { get; set; } = null!;
        public string CoinName { get; set; } = null!;
        public decimal Quantity { get; set; }
        public decimal CurrentPrice { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal InvestedValue { get; set; }
        public decimal AllocationPercentage { get; set; }
    }
}
