using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Application.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CryptoDashboard.Infrastructure.Caching
{
    public class MemoryCryptoPriceCache : ICryptoPriceCache, IDisposable
    {
        private readonly IMemoryCache _cache;
        private readonly TimeSpan _defaultTtl;
        private readonly ILogger<MemoryCryptoPriceCache> _logger;
        private readonly SemaphoreSlim _semaphore = new(1, 1);

        private const string PriceKeyPrefix = "crypto:price:";

        public MemoryCryptoPriceCache(
            IMemoryCache cache,
            IOptions<CryptoApiOptions> options,
            ILogger<MemoryCryptoPriceCache> logger)
        {
            _cache = cache;
            _defaultTtl = TimeSpan.FromSeconds(options.Value.CacheTtlSeconds);
            _logger = logger;
        }

        public Task<decimal?> GetPriceAsync(string coinId)
        {
            var key = PriceKeyPrefix + coinId.ToLowerInvariant();

            if (_cache.TryGetValue(key, out decimal cachedPrice))
            {
                _logger.LogDebug("Cache HIT for {CoinId}", coinId);
                return Task.FromResult<decimal?>(cachedPrice);
            }

            _logger.LogDebug("Cache MISS for {CoinId}", coinId);
            return Task.FromResult<decimal?>(null);
        }

        public Task SetPriceAsync(string coinId, decimal price, TimeSpan? ttl = null)
        {
            var key = PriceKeyPrefix + coinId.ToLowerInvariant();
            _cache.Set(key, price, ttl ?? _defaultTtl);
            _logger.LogDebug("Cache SET for {CoinId}: {Price}", coinId, price);
            return Task.CompletedTask;
        }

        public Task<Dictionary<string, decimal>> GetBatchPricesAsync(IEnumerable<string> coinIds)
        {
            // IMemoryCache is thread-safe for individual reads. The semaphore on SetBatchPricesAsync
            // ensures batch write atomicity; reads may see partially updated batches, which is
            // acceptable since each individual price entry is still consistent.
            var result = new Dictionary<string, decimal>();

            foreach (var coinId in coinIds)
            {
                var key = PriceKeyPrefix + coinId.ToLowerInvariant();
                if (_cache.TryGetValue(key, out decimal cachedPrice))
                {
                    result[coinId] = cachedPrice;
                }
            }

            _logger.LogDebug("Cache batch GET: {HitCount}/{TotalCount} hits",
                result.Count, coinIds.Count());

            return Task.FromResult(result);
        }

        public async Task SetBatchPricesAsync(Dictionary<string, decimal> prices, TimeSpan? ttl = null)
        {
            var effectiveTtl = ttl ?? _defaultTtl;

            await _semaphore.WaitAsync();
            try
            {
                foreach (var kvp in prices)
                {
                    var key = PriceKeyPrefix + kvp.Key.ToLowerInvariant();
                    _cache.Set(key, kvp.Value, effectiveTtl);
                }

                _logger.LogDebug("Cache batch SET: {Count} prices updated", prices.Count);
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public Task InvalidateAsync(string coinId)
        {
            var key = PriceKeyPrefix + coinId.ToLowerInvariant();
            _cache.Remove(key);
            _logger.LogDebug("Cache INVALIDATE for {CoinId}", coinId);
            return Task.CompletedTask;
        }

        public Task InvalidateAllAsync()
        {
            // IMemoryCache does not have a clear-all method.
            // Individual entries will expire via their TTL.
            _logger.LogDebug("Cache INVALIDATE ALL requested — entries will expire via TTL");
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _semaphore.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}
