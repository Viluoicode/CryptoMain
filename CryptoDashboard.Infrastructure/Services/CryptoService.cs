using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using System.Net.Http;          // ← Giữ lại
using System.Text.Json;
using System.Net.Http.Json;     // ← Thêm (optional, để dùng GetFromJsonAsync)

namespace CryptoDashboard.Infrastructure.Services
{
    public class CryptoService : ICryptoService
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private const string CacheKey = "TopCryptos";
        private const int CacheDurationSeconds = 60;

        public CryptoService(HttpClient httpClient, IMemoryCache cache)  // ← Thay đổi parameter
        {
            _httpClient = httpClient;
            _cache = cache;
        }
        public async Task<List<CryptoListResponse>> GetTopCryptocurrenciesAsync(int limit = 50)
        {
            if (_cache.TryGetValue(CacheKey, out List<CryptoListResponse>? cachedData) && cachedData != null)
            {
                return cachedData;
            }

            var url = $"https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page={limit}&page=1&sparkline=false";

            // Thêm User-Agent
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "CryptoDashboard/1.0");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var coinGeckoData = JsonSerializer.Deserialize<List<CoinGeckoResponse>>(json);

            if (coinGeckoData == null)
            {
                return new List<CryptoListResponse>();
            }

            var result = coinGeckoData.Where(c => c.CurrentPrice.HasValue && c.MarketCap.HasValue).Select(c => new CryptoListResponse
            {
                Id = c.Id,
                Symbol = c.Symbol.ToUpper(),
                Name = c.Name,
                Image = c.Image,
                CurrentPrice = c.CurrentPrice?? 0,
                PriceChangePercentage24h = c.PriceChangePercentage24h ?? 0,
                MarketCap = c.MarketCap ?? 0,
                TotalVolume = c.TotalVolume ?? 0
            }).ToList();

            _cache.Set(CacheKey, result, TimeSpan.FromSeconds(CacheDurationSeconds));

            return result;
        }

        public async Task<CryptoListResponse?> GetCryptocurrencyByIdAsync(string coinId)
        {
            var url = $"https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids={coinId}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var coinGeckoData = JsonSerializer.Deserialize<List<CoinGeckoResponse>>(json);

            if (coinGeckoData == null || !coinGeckoData.Any())
            {
                return null;
            }

            var coin = coinGeckoData.First();
            return new CryptoListResponse
            {
                Id = coin.Id,
                Symbol = coin.Symbol.ToUpper(),
                Name = coin.Name,
                Image = coin.Image,
                CurrentPrice = coin.CurrentPrice ?? 0,
                PriceChangePercentage24h = coin.PriceChangePercentage24h ?? 0,
                MarketCap = coin.MarketCap ?? 0,
                TotalVolume = coin.TotalVolume ?? 0
            };
        }


    }
}