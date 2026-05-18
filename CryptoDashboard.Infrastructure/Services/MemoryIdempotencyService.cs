using CryptoDashboard.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace CryptoDashboard.Infrastructure.Services
{
    /// <summary>
    /// IMemoryCache-backed idempotency guard. Keys live for 5 minutes — long
    /// enough to defend against double-clicks and retried network failures but
    /// short enough that key collisions don't accumulate.
    /// </summary>
    public class MemoryIdempotencyService : IIdempotencyService
    {
        private readonly IMemoryCache _cache;
        private static readonly TimeSpan KeyLifetime = TimeSpan.FromMinutes(5);

        public MemoryIdempotencyService(IMemoryCache cache)
        {
            _cache = cache;
        }

        public bool TryRegister(Guid userId, string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return true;   // no-op for callers without a key

            var cacheKey = $"idem:{userId}:{key}";
            if (_cache.TryGetValue(cacheKey, out _))
            {
                return false;   // duplicate
            }

            _cache.Set(cacheKey, true, KeyLifetime);
            return true;
        }
    }
}
