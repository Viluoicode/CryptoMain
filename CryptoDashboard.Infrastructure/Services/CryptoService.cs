using System.Net;
using System.Text.Json;
using System.Threading.RateLimiting;
using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.Exceptions;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Application.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CryptoDashboard.Infrastructure.Services
{
    public class CryptoService : ICryptoService, IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly CryptoApiOptions _options;
        private readonly ILogger<CryptoService> _logger;
        private readonly RateLimiter _rateLimiter;

        private const string CacheKey = "TopCryptos";
        private const int CacheDurationSeconds = 60;

        public CryptoService(
            HttpClient httpClient,
            IMemoryCache cache,
            IOptions<CryptoApiOptions> options,
            ILogger<CryptoService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _options = options.Value;
            _logger = logger;

            _rateLimiter = new TokenBucketRateLimiter(new TokenBucketRateLimiterOptions
            {
                TokenLimit = _options.RateLimitPerMinute,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                TokensPerPeriod = _options.RateLimitPerMinute,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2,
                AutoReplenishment = true
            });
        }

        public async Task<List<CryptoListResponse>> GetTopCryptocurrenciesAsync(int limit = 50)
        {
            if (_cache.TryGetValue(CacheKey, out List<CryptoListResponse>? cachedData) && cachedData != null)
            {
                return cachedData;
            }

            var url = $"{_options.BaseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page={limit}&page=1&sparkline=false";

            var response = await SendRateLimitedRequestAsync(url);

            var json = await response.Content.ReadAsStringAsync();
            var coinGeckoData = JsonSerializer.Deserialize<List<CoinGeckoResponse>>(json);

            if (coinGeckoData == null)
            {
                return new List<CryptoListResponse>();
            }

            var result = coinGeckoData
                .Where(c => c.CurrentPrice.HasValue && c.MarketCap.HasValue)
                .Select(MapToResponse)
                .ToList();

            _cache.Set(CacheKey, result, TimeSpan.FromSeconds(CacheDurationSeconds));

            return result;
        }

        public async Task<CryptoListResponse?> GetCryptocurrencyByIdAsync(string coinId)
        {
            var url = $"{_options.BaseUrl}/coins/markets?vs_currency=usd&ids={Uri.EscapeDataString(coinId)}";

            var response = await SendRateLimitedRequestAsync(url);

            var json = await response.Content.ReadAsStringAsync();
            var coinGeckoData = JsonSerializer.Deserialize<List<CoinGeckoResponse>>(json);

            if (coinGeckoData == null || !coinGeckoData.Any())
            {
                return null;
            }

            return MapToResponse(coinGeckoData.First());
        }

        private async Task<HttpResponseMessage> SendRateLimitedRequestAsync(string url)
        {
            using var lease = await _rateLimiter.AcquireAsync(permitCount: 1);

            if (!lease.IsAcquired)
            {
                _logger.LogWarning("Rate limit exceeded for crypto API request to {Url}", url);
                throw new CryptoApiRateLimitException(
                    "Local rate limit exceeded. Too many requests to the crypto API.",
                    retryAfterSeconds: 60);
            }

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "CryptoDashboard/1.0");

            if (!string.IsNullOrEmpty(_options.ApiKey))
            {
                request.Headers.Add("x-cg-demo-api-key", _options.ApiKey);
            }

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(request);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request failed for {Url}", url);
                throw new CryptoApiUnavailableException(
                    "Failed to connect to the crypto API.", ex);
            }
            catch (TaskCanceledException ex) when (!ex.CancellationToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Request timed out for {Url}", url);
                throw new CryptoApiUnavailableException(
                    "Crypto API request timed out.", ex);
            }

            if (response.IsSuccessStatusCode)
            {
                return response;
            }

            var statusCode = (int)response.StatusCode;

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta is TimeSpan delta
                    ? (int)delta.TotalSeconds
                    : (int?)null;
                _logger.LogWarning("CoinGecko API returned 429 — Too Many Requests");
                throw new CryptoApiRateLimitException(
                    "Crypto API rate limit exceeded (HTTP 429).",
                    retryAfterSeconds: retryAfter ?? 60);
            }

            if (statusCode >= 500)
            {
                _logger.LogError("CoinGecko API returned {StatusCode} for {Url}", statusCode, url);
                throw new CryptoApiUnavailableException(
                    $"Crypto API is unavailable (HTTP {statusCode}).", statusCode);
            }

            _logger.LogWarning("CoinGecko API returned {StatusCode} for {Url}", statusCode, url);
            throw new CryptoApiException(
                $"Crypto API returned an error (HTTP {statusCode}).", statusCode);
        }

        public void Dispose()
        {
            _rateLimiter.Dispose();
            GC.SuppressFinalize(this);
        }

        private static CryptoListResponse MapToResponse(CoinGeckoResponse c)
        {
            return new CryptoListResponse
            {
                Id = c.Id,
                Symbol = c.Symbol.ToUpper(),
                Name = c.Name,
                Image = c.Image,
                CurrentPrice = c.CurrentPrice ?? 0,
                PriceChangePercentage24h = c.PriceChangePercentage24h ?? 0,
                MarketCap = c.MarketCap ?? 0,
                TotalVolume = c.TotalVolume ?? 0
            };
        }
    }
}