using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Application.DTOs.Portfolio
{
    public class PortfolioHistoryPoint
    {
        public DateTime Date { get; set; }
        public decimal TotalValue { get; set; }
    }
}
