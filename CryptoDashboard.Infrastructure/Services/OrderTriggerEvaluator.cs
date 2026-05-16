using CryptoDashboard.Domain.Entities;

namespace CryptoDashboard.Infrastructure.Services
{
    /// <summary>
    /// Pure-function evaluation of whether a conditional order should fill at the given price.
    /// Extracted from OrderMonitorBackgroundService so the trigger logic is unit-testable in isolation.
    /// </summary>
    public static class OrderTriggerEvaluator
    {
        public static bool IsTriggered(OrderType type, OrderSide side, decimal triggerPrice, decimal currentPrice)
            => type switch
            {
                // StopLoss Buy: protect a short — fire when price rises to trigger
                // StopLoss Sell: protect a long — fire when price falls to trigger
                OrderType.StopLoss when side == OrderSide.Buy  => currentPrice >= triggerPrice,
                OrderType.StopLoss when side == OrderSide.Sell => currentPrice <= triggerPrice,
                // TakeProfit Buy: buy the dip — fire when price falls to trigger
                // TakeProfit Sell: lock profit on long — fire when price rises to trigger
                OrderType.TakeProfit when side == OrderSide.Buy  => currentPrice <= triggerPrice,
                OrderType.TakeProfit when side == OrderSide.Sell => currentPrice >= triggerPrice,
                // Limit Buy: buy below market
                // Limit Sell: sell above market
                OrderType.Limit when side == OrderSide.Buy  => currentPrice <= triggerPrice,
                OrderType.Limit when side == OrderSide.Sell => currentPrice >= triggerPrice,
                _ => false,
            };
    }
}
