using CryptoDashboard.Domain.Entities;
using CryptoDashboard.Infrastructure.Services;
using FluentAssertions;

namespace CryptoDashboard.Tests.Services
{
    public class OrderTriggerEvaluatorTests
    {
        // ── StopLoss ──────────────────────────────────────────────────────────
        // SL Buy = protect short → fire when price rises to/above trigger
        [Theory]
        [InlineData(100, 100, true)]   // exactly at trigger fires
        [InlineData(100,  99, false)]  // below trigger does not fire
        [InlineData(100, 101, true)]   // above trigger fires
        public void StopLoss_Buy_FiresOnPriceAtOrAboveTrigger(
            decimal trigger, decimal current, bool expected)
        {
            OrderTriggerEvaluator.IsTriggered(OrderType.StopLoss, OrderSide.Buy, trigger, current)
                .Should().Be(expected);
        }

        // SL Sell = protect long → fire when price falls to/below trigger
        [Theory]
        [InlineData(100, 100, true)]
        [InlineData(100, 101, false)]  // above trigger does not fire
        [InlineData(100,  99, true)]   // below trigger fires
        public void StopLoss_Sell_FiresOnPriceAtOrBelowTrigger(
            decimal trigger, decimal current, bool expected)
        {
            OrderTriggerEvaluator.IsTriggered(OrderType.StopLoss, OrderSide.Sell, trigger, current)
                .Should().Be(expected);
        }

        // ── TakeProfit ────────────────────────────────────────────────────────
        // TP Buy = buy the dip → fire when price falls to/below trigger
        [Theory]
        [InlineData(100, 100, true)]
        [InlineData(100, 101, false)]
        [InlineData(100,  99, true)]
        public void TakeProfit_Buy_FiresOnPriceAtOrBelowTrigger(
            decimal trigger, decimal current, bool expected)
        {
            OrderTriggerEvaluator.IsTriggered(OrderType.TakeProfit, OrderSide.Buy, trigger, current)
                .Should().Be(expected);
        }

        // TP Sell = lock profit → fire when price rises to/above trigger
        [Theory]
        [InlineData(100, 100, true)]
        [InlineData(100,  99, false)]
        [InlineData(100, 101, true)]
        public void TakeProfit_Sell_FiresOnPriceAtOrAboveTrigger(
            decimal trigger, decimal current, bool expected)
        {
            OrderTriggerEvaluator.IsTriggered(OrderType.TakeProfit, OrderSide.Sell, trigger, current)
                .Should().Be(expected);
        }

        // ── Limit ─────────────────────────────────────────────────────────────
        // Limit Buy = buy below market → fire when price ≤ trigger
        [Theory]
        [InlineData(100, 100, true)]
        [InlineData(100, 101, false)]
        [InlineData(100,  50, true)]
        public void Limit_Buy_FiresOnPriceAtOrBelowTrigger(
            decimal trigger, decimal current, bool expected)
        {
            OrderTriggerEvaluator.IsTriggered(OrderType.Limit, OrderSide.Buy, trigger, current)
                .Should().Be(expected);
        }

        // Limit Sell = sell above market → fire when price ≥ trigger
        [Theory]
        [InlineData(100, 100, true)]
        [InlineData(100,  99, false)]
        [InlineData(100, 150, true)]
        public void Limit_Sell_FiresOnPriceAtOrAboveTrigger(
            decimal trigger, decimal current, bool expected)
        {
            OrderTriggerEvaluator.IsTriggered(OrderType.Limit, OrderSide.Sell, trigger, current)
                .Should().Be(expected);
        }
    }
}
