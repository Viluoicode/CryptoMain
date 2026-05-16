using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CryptoDashboard.Infrastructure.Services
{
    /// <summary>
    /// Polls ICryptoPriceCache every 5 s and executes pending stop-loss / take-profit / limit orders.
    /// </summary>
    public class OrderMonitorBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ICryptoPriceCache _priceCache;
        private readonly ILogger<OrderMonitorBackgroundService> _logger;

        public OrderMonitorBackgroundService(
            IServiceScopeFactory scopeFactory,
            ICryptoPriceCache priceCache,
            ILogger<OrderMonitorBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _priceCache = priceCache;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OrderMonitorBackgroundService started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingOrdersAsync(stoppingToken);
                }
                catch (OperationCanceledException) { break; }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing pending orders");
                }

                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        private async Task ProcessPendingOrdersAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            var pendingOrders = await context.TradeOrders
                .Include(o => o.Wallet)
                .Where(o => o.Status == OrderStatus.Pending)
                .ToListAsync(ct);

            if (pendingOrders.Count == 0) return;

            // Fetch all required coin prices in one batch
            var coinIds = pendingOrders.Select(o => o.CoinId).Distinct();
            var prices = await _priceCache.GetBatchPricesAsync(coinIds);

            foreach (var order in pendingOrders)
            {
                if (!prices.TryGetValue(order.CoinId, out var currentPrice)) continue;
                if (!OrderTriggerEvaluator.IsTriggered(order.Type, order.Side, order.TriggerPrice, currentPrice)) continue;

                await ExecuteOrderAsync(context, order, currentPrice, ct);
            }
        }

        private async Task ExecuteOrderAsync(
            IApplicationDbContext context,
            TradeOrder order,
            decimal currentPrice,
            CancellationToken ct)
        {
            await using var dbTx = await context.Database.BeginTransactionAsync(ct);
            try
            {
                var wallet = order.Wallet;
                var totalCost = order.Quantity * currentPrice;

                if (order.Side == OrderSide.Buy)
                {
                    if (wallet.FiatBalance < totalCost)
                    {
                        order.Status = OrderStatus.Failed;
                        order.FailureReason = $"Insufficient balance: need ${totalCost:F2}, have ${wallet.FiatBalance:F2}";
                        await context.SaveChangesAsync(ct);
                        await dbTx.CommitAsync(ct);
                        return;
                    }
                    wallet.FiatBalance -= totalCost;
                }
                else
                {
                    wallet.FiatBalance += totalCost;
                }

                var transaction = new Transaction
                {
                    Id = Guid.NewGuid(),
                    WalletId = order.WalletId,
                    CoinId = order.CoinId,
                    CoinSymbol = order.CoinSymbol,
                    CoinName = order.CoinName,
                    Type = order.Side == OrderSide.Buy ? TransactionType.Buy : TransactionType.Sell,
                    Quantity = order.Quantity,
                    PricePerCoin = currentPrice,
                    TotalAmount = totalCost,
                    TransactionDate = DateTime.UtcNow,
                    Notes = $"Auto-filled: {order.Type} order at ${currentPrice:F4}"
                };

                context.Transactions.Add(transaction);

                order.Status = OrderStatus.Filled;
                order.FilledAt = DateTime.UtcNow;
                order.FilledPrice = currentPrice;
                order.TransactionId = transaction.Id;

                await context.SaveChangesAsync(ct);
                await dbTx.CommitAsync(ct);

                _logger.LogInformation(
                    "Order {Id} ({Type}/{Side} {Qty} {Coin} @ ${Price}) filled",
                    order.Id, order.Type, order.Side, order.Quantity, order.CoinId, currentPrice);
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync(ct);
                _logger.LogError(ex, "Failed to execute order {Id}", order.Id);
            }
        }
    }
}
