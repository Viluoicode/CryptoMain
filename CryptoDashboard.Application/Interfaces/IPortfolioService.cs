using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CryptoDashboard.Application.DTOs.Portfolio;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IPortfolioService
    {
        Task<PortfolioSummaryResponse> GetPortfolioSummaryAsync(Guid userId);
        Task<PortfolioPerformanceResponse> GetPortfolioPerformanceAsync(Guid userId);
        Task<List<PortfolioHistoryPoint>> GetPortfolioHistoryAsync(string userId, int days = 30);
    }
}
