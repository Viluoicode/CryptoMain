using CryptoDashboard.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CryptoDashboard.Infrastructure.Services
{
    /// <summary>
    /// Runs once per day at midnight UTC — saves portfolio snapshots for all active users.
    /// </summary>
    public class PortfolioSnapshotBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PortfolioSnapshotBackgroundService> _logger;

        public PortfolioSnapshotBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<PortfolioSnapshotBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("PortfolioSnapshotBackgroundService started");

            // Wait until next midnight UTC before the first run
            await WaitUntilNextMidnightAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                await RunSnapshotAsync(stoppingToken);

                // Wait exactly 24 hours until the next run
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }

        private async Task RunSnapshotAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Running daily portfolio snapshot at {Time} UTC", DateTime.UtcNow);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var portfolioService = scope.ServiceProvider.GetRequiredService<IPortfolioService>();
                await portfolioService.SaveSnapshotsForAllUsersAsync();
                _logger.LogInformation("Daily portfolio snapshots completed at {Time} UTC", DateTime.UtcNow);
            }
            catch (OperationCanceledException)
            {
                // Graceful shutdown — do nothing
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error running daily portfolio snapshot");
            }
        }

        private static async Task WaitUntilNextMidnightAsync(CancellationToken stoppingToken)
        {
            var now       = DateTime.UtcNow;
            var nextMidnight = now.Date.AddDays(1); // tomorrow midnight UTC
            var delay     = nextMidnight - now;

            if (delay > TimeSpan.Zero)
                await Task.Delay(delay, stoppingToken);
        }
    }
}
