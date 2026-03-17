using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CryptoDashboard.Application.DTOs.Crypto;

namespace CryptoDashboard.Application.Interfaces
{
    public interface ICryptoService
    {
        Task<List<CryptoListResponse>> GetTopCryptocurrenciesAsync(int limit = 50);
        Task<CryptoListResponse?> GetCryptocurrencyByIdAsync(string coinId);
        Task<Dictionary<string, CryptoListResponse>> GetCryptocurrenciesByIdsAsync(IEnumerable<string> coinIds);
    }
}
