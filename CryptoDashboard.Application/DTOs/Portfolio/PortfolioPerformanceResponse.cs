using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Application.DTOs.Portfolio
{
    public class PortfolioPerformanceResponse
    {
        public decimal TotalBuyAmount { get; set; }
        public decimal TotalSellAmount { get; set; }
        public decimal NetInvested { get; set; } // Buy - Sell

        public decimal CurrentPortfolioValue { get; set; }
        public decimal UnrealizedProfitLoss { get; set; }
        public decimal UnrealizedProfitLossPercentage { get; set; }

        public int TotalBuyTransactions { get; set; }
        public int TotalSellTransactions { get; set; }
    }
}
