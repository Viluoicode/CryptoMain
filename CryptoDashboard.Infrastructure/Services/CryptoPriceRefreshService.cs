// CryptoDashboard.Infrastructure/Services/CryptoPriceRefreshService.cs
using CryptoDashboard.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CryptoDashboard.Infrastructure.Services
{
    /// <summary>
    /// Background service that refreshes top-100 crypto prices into the memory cache
    /// every 2 minutes, so API endpoints don't cold-miss on every request.
    /// </summary>
    public class CryptoPriceRefreshService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<CryptoPriceRefreshService> _logger;

        // Refresh every 2 minutes — same as frontend staleTime
        private static readonly TimeSpan RefreshInterval = TimeSpan.FromMinutes(2);

        // Initial delay so the app fully starts before the first call
        private static readonly TimeSpan InitialDelay = TimeSpan.FromSeconds(15);

        public CryptoPriceRefreshService(
            IServiceScopeFactory scopeFactory,
            ILogger<CryptoPriceRefreshService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("CryptoPriceRefreshService started. First refresh in {Delay}s", InitialDelay.TotalSeconds);

            // Wait for app to fully start
            await Task.Delay(InitialDelay, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                await RefreshPricesAsync(stoppingToken);
                await Task.Delay(RefreshInterval, stoppingToken);
            }

            _logger.LogInformation("CryptoPriceRefreshService stopped.");
        }

        private async Task RefreshPricesAsync(CancellationToken ct)
        {
            try
            {
                // CryptoService is scoped — must create a scope
                await using var scope = _scopeFactory.CreateAsyncScope();
                var cryptoService = scope.ServiceProvider.GetRequiredService<ICryptoService>();
                var priceCache   = scope.ServiceProvider.GetRequiredService<ICryptoPriceCache>();

                _logger.LogDebug("Refreshing top-100 crypto prices…");

                var coins = await cryptoService.GetTopCryptocurrenciesAsync(100);

                if (coins.Count == 0)
                {
                    _logger.LogWarning("Price refresh returned 0 coins — skipping cache update");
                    return;
                }

                var prices = coins.ToDictionary(
                    c => c.Id,
                    c => c.CurrentPrice);

                await priceCache.SetBatchPricesAsync(prices, TimeSpan.FromMinutes(3));

                _logger.LogInformation("Price cache refreshed: {Count} coins updated at {Time:HH:mm:ss}",
                    prices.Count, DateTime.UtcNow);
            }
            catch (OperationCanceledException)
            {
                // App shutting down — ignore
            }
            catch (Exception ex)
            {
                // Log but don't crash the service — will retry on next interval
                _logger.LogError(ex, "Failed to refresh crypto prices: {Message}", ex.Message);
            }
        }
    }
}
