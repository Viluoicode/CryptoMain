using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CryptoDashboard.Infrastructure.Services
{
    /// <summary>
    /// Polls open positions every 10 s and liquidates any that have breached their liquidation price.
    /// </summary>
    public class LiquidationBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ICryptoPriceCache _priceCache;
        private readonly ILogger<LiquidationBackgroundService> _logger;

        public LiquidationBackgroundService(
            IServiceScopeFactory scopeFactory,
            ICryptoPriceCache priceCache,
            ILogger<LiquidationBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _priceCache = priceCache;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("LiquidationBackgroundService started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckLiquidationsAsync(stoppingToken);
                }
                catch (OperationCanceledException) { break; }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during liquidation check");
                }

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }

        private async Task CheckLiquidationsAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            var openPositions = await context.Positions
                .Include(p => p.Wallet)
                .Where(p => p.Status == PositionStatus.Open)
                .ToListAsync(ct);

            if (openPositions.Count == 0) return;

            var coinIds = openPositions.Select(p => p.CoinId).Distinct();
            var prices = await _priceCache.GetBatchPricesAsync(coinIds);

            foreach (var position in openPositions)
            {
                if (!prices.TryGetValue(position.CoinId, out var currentPrice)) continue;

                bool isLiquidated = position.Side == PositionSide.Long
                    ? currentPrice <= position.LiquidationPrice
                    : currentPrice >= position.LiquidationPrice;

                if (!isLiquidated) continue;

                await LiquidatePositionAsync(context, position, currentPrice, ct);
            }
        }

        private async Task LiquidatePositionAsync(
            IApplicationDbContext context,
            Position position,
            decimal currentPrice,
            CancellationToken ct)
        {
            await using var dbTx = await context.Database.BeginTransactionAsync(ct);
            try
            {
                // Collateral is fully lost on liquidation
                position.Status = PositionStatus.Liquidated;
                position.ExitPrice = currentPrice;
                position.RealizedPnL = -position.CollateralAmount;
                position.CloseReason = $"Liquidated at ${currentPrice:F4}";
                position.ClosedAt = DateTime.UtcNow;

                // Return nothing to wallet — collateral absorbed by liquidation
                await context.SaveChangesAsync(ct);
                await dbTx.CommitAsync(ct);

                _logger.LogWarning(
                    "Position {Id} ({Side} {Qty} {Coin}) LIQUIDATED at ${Price} (liq price: ${LiqPrice})",
                    position.Id, position.Side, position.Quantity,
                    position.CoinId, currentPrice, position.LiquidationPrice);
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync(ct);
                _logger.LogError(ex, "Failed to liquidate position {Id}", position.Id);
            }
        }
    }
}
