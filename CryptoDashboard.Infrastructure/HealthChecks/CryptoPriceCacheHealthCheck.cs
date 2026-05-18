using CryptoDashboard.Application.Interfaces;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CryptoDashboard.Infrastructure.HealthChecks
{
    /// <summary>
    /// Reports the in-memory price cache as healthy once it has at least one
    /// coin populated by <c>CryptoPriceRefreshService</c>. This is a cheap
    /// signal that upstream CoinGecko polling is succeeding — much faster
    /// than hitting CoinGecko directly on every readiness check.
    /// </summary>
    public class CryptoPriceCacheHealthCheck : IHealthCheck
    {
        private readonly ICryptoPriceCache _priceCache;

        public CryptoPriceCacheHealthCheck(ICryptoPriceCache priceCache)
        {
            _priceCache = priceCache;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            // Bitcoin is the canary — refresh service always populates it first.
            var price = await _priceCache.GetPriceAsync("bitcoin");
            return price is > 0
                ? HealthCheckResult.Healthy($"Crypto price cache warm (BTC=${price})")
                : HealthCheckResult.Degraded("Crypto price cache empty — upstream CoinGecko may be unavailable");
        }
    }
}
