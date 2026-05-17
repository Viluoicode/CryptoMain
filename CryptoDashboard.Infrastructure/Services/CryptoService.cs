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
        private readonly ICryptoPriceCache _priceCache;
        private readonly CryptoApiOptions _options;
        private readonly ILogger<CryptoService> _logger;
        private readonly RateLimiter _rateLimiter;

        private const string TopCryptosCacheKey = "TopCryptos";

        public CryptoService(
            HttpClient httpClient,
            IMemoryCache cache,
            ICryptoPriceCache priceCache,
            IOptions<CryptoApiOptions> options,
            ILogger<CryptoService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _priceCache = priceCache;
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
            if (_cache.TryGetValue(TopCryptosCacheKey, out List<CryptoListResponse>? cachedData) && cachedData != null)
            {
                return cachedData;
            }

            var url = $"{_options.BaseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page={limit}&page=1&sparkline=true&price_change_percentage=24h";

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

            var cacheTtl = TimeSpan.FromSeconds(_options.CacheTtlSeconds);
            _cache.Set(TopCryptosCacheKey, result, cacheTtl);

            // Also populate the price cache for individual coins
            var prices = result.ToDictionary(r => r.Id, r => r.CurrentPrice);
            await _priceCache.SetBatchPricesAsync(prices, cacheTtl);

            return result;
        }

        public async Task<CryptoListResponse?> GetCryptocurrencyByIdAsync(string coinId)
        {
            // Thử lấy từ TopCryptos cache trước — đã có full data
            if (_cache.TryGetValue(TopCryptosCacheKey, out List<CryptoListResponse>? topList) && topList != null)
            {
                var cached = topList.FirstOrDefault(c => c.Id == coinId);
                if (cached != null) return cached;
            }

            // Không có trong cache → fetch trực tiếp từ API với full data
            var ids = Uri.EscapeDataString(coinId);
            var url = $"{_options.BaseUrl}/coins/markets?vs_currency=usd&ids={ids}";

            var response = await SendRateLimitedRequestAsync(url);
            var json = await response.Content.ReadAsStringAsync();
            var coinGeckoData = JsonSerializer.Deserialize<List<CoinGeckoResponse>>(json);

            return coinGeckoData?.FirstOrDefault(c => c.CurrentPrice.HasValue) is { } coin
                ? MapToResponse(coin)
                : null;
        }

        public async Task<Dictionary<string, CryptoListResponse>> GetCryptocurrenciesByIdsAsync(IEnumerable<string> coinIds)
        {
            var coinIdList = coinIds.Distinct().ToList();
            if (coinIdList.Count == 0)
            {
                return new Dictionary<string, CryptoListResponse>();
            }

            // L1: Check price cache for already-cached prices
            var cachedPrices = await _priceCache.GetBatchPricesAsync(coinIdList);
            var missingIds = coinIdList.Where(id => !cachedPrices.ContainsKey(id)).ToList();

            if (missingIds.Count == 0)
            {
                _logger.LogDebug("All {Count} coin prices served from cache", coinIdList.Count);
            }
            else
            {
                _logger.LogDebug("{MissingCount}/{TotalCount} coin prices need API fetch",
                    missingIds.Count, coinIdList.Count);
            }

            // L2: Fetch missing from CoinGecko API in a single batch call
            var fetchedData = new Dictionary<string, CryptoListResponse>();
            if (missingIds.Count > 0)
            {
                var ids = string.Join(",", missingIds.Select(Uri.EscapeDataString));
                var url = $"{_options.BaseUrl}/coins/markets?vs_currency=usd&ids={ids}";

                var response = await SendRateLimitedRequestAsync(url);
                var json = await response.Content.ReadAsStringAsync();
                var coinGeckoData = JsonSerializer.Deserialize<List<CoinGeckoResponse>>(json);

                if (coinGeckoData != null)
                {
                    foreach (var coin in coinGeckoData.Where(c => c.CurrentPrice.HasValue))
                    {
                        var mapped = MapToResponse(coin);
                        fetchedData[mapped.Id] = mapped;
                    }

                    // Update price cache with newly fetched prices
                    var newPrices = fetchedData.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.CurrentPrice);
                    var cacheTtl = TimeSpan.FromSeconds(_options.CacheTtlSeconds);
                    await _priceCache.SetBatchPricesAsync(newPrices, cacheTtl);
                }
            }

            // Build combined result: use fetched data for missing, create minimal responses for cached
            var result = new Dictionary<string, CryptoListResponse>();

            foreach (var coinId in coinIdList)
            {
                if (fetchedData.TryGetValue(coinId, out var fetched))
                {
                    result[coinId] = fetched;
                }
                else if (cachedPrices.TryGetValue(coinId, out var cachedPrice))
                {
                    // We have a cached price but no full data from this call
                    // Return a minimal response with the cached price
                    result[coinId] = new CryptoListResponse
                    {
                        Id = coinId,
                        CurrentPrice = cachedPrice
                    };
                }
            }

            return result;
        }

        public async Task<List<CryptoPriceHistoryResponse>> GetPriceHistoryAsync(string coinId, int days = 7)
        {
            var url = $"{_options.BaseUrl}/coins/{coinId}/market_chart?vs_currency=usd&days={days}";
            var response = await SendRateLimitedRequestAsync(url);
            var json = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            var prices = doc.RootElement.GetProperty("prices");

            return prices.EnumerateArray()
                .Select(p => new CryptoPriceHistoryResponse
                {
                    Timestamp = p[0].GetInt64(),
                    Price = p[1].GetDecimal()
                })
                .ToList();
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
                TotalVolume = c.TotalVolume ?? 0,
                High24h = c.High24h ?? 0,
                Low24h = c.Low24h ?? 0,
                Sparkline7d = c.SparklineIn7d?.Price
            };
        }
        public async Task<List<CryptoOhlcResponse>> GetOhlcAsync(string coinId, int days = 7)
        {
            var url = $"{_options.BaseUrl}/coins/{coinId}/ohlc?vs_currency=usd&days={days}";
            var response = await SendRateLimitedRequestAsync(url);
            var json = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.EnumerateArray()
                .Select(item =>
                {
                    var arr = item.EnumerateArray().ToList();
                    return new CryptoOhlcResponse
                    {
                        Timestamp = arr[0].GetInt64(),
                        Open = arr[1].GetDecimal(),
                        High = arr[2].GetDecimal(),
                        Low = arr[3].GetDecimal(),
                        Close = arr[4].GetDecimal(),
                    };
                })
                .ToList();
        }
    }
}