using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.DTOs.Order;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using CryptoDashboard.Infrastructure.Services;
using CryptoDashboard.Tests.Helpers;
using FluentAssertions;
using Moq;

namespace CryptoDashboard.Tests.Services
{
    public class OrderServiceTests
    {
        private readonly Mock<ICryptoService> _cryptoMock;

        public OrderServiceTests()
        {
            _cryptoMock = new Mock<ICryptoService>();
            _cryptoMock
                .Setup(s => s.GetCryptocurrencyByIdAsync("bitcoin"))
                .ReturnsAsync(new CryptoListResponse
                {
                    Id = "bitcoin", Symbol = "btc", Name = "Bitcoin", CurrentPrice = 50_000m,
                });
        }

        private OrderService CreateService(
            CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx)
            => new(ctx, _cryptoMock.Object);

        private static async Task<(Guid userId, Guid walletId)> SeedAsync(
            CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx)
        {
            var user = new User { Username = "u", Email = "u@t.com", PasswordHash = "h" };
            var wallet = new Wallet { UserId = user.Id, Name = "W", FiatBalance = 10_000m };
            ctx.Users.Add(user);
            ctx.Wallets.Add(wallet);
            await ctx.SaveChangesAsync();
            return (user.Id, wallet.Id);
        }

        [Fact]
        public async Task CreateOrder_ValidInput_PersistsAsPending()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx);

            var svc = CreateService(ctx);
            var result = await svc.CreateOrderAsync(userId, new CreateOrderRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = OrderSide.Sell,
                Type = OrderType.StopLoss,
                TriggerPrice = 45_000m,
                Quantity = 0.5m,
            });

            result.Status.Should().Be(OrderStatus.Pending);
            result.CoinSymbol.Should().Be("BTC");
            ctx.TradeOrders.Single().Status.Should().Be(OrderStatus.Pending);
        }

        [Fact]
        public async Task CreateOrder_WalletNotOwnedByUser_ThrowsUnauthorized()
        {
            using var ctx = TestDbContextFactory.Create();
            var (_, walletId) = await SeedAsync(ctx);
            var otherUser = Guid.NewGuid();

            var svc = CreateService(ctx);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => svc.CreateOrderAsync(otherUser, new CreateOrderRequest
                {
                    WalletId = walletId,
                    CoinId = "bitcoin",
                    Side = OrderSide.Sell,
                    Type = OrderType.StopLoss,
                    TriggerPrice = 45_000m,
                    Quantity = 0.5m,
                }));
        }

        [Fact]
        public async Task CreateOrder_UnknownCoin_Throws()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx);
            _cryptoMock.Setup(s => s.GetCryptocurrencyByIdAsync("dogecoin"))
                .ReturnsAsync((CryptoListResponse?)null);

            var svc = CreateService(ctx);

            await Assert.ThrowsAsync<ArgumentException>(
                () => svc.CreateOrderAsync(userId, new CreateOrderRequest
                {
                    WalletId = walletId,
                    CoinId = "dogecoin",
                    Side = OrderSide.Buy,
                    Type = OrderType.Limit,
                    TriggerPrice = 0.1m,
                    Quantity = 100m,
                }));
        }

        [Fact]
        public async Task GetUserOrders_OnlyReturnsCurrentUserOrders()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx);

            // Order của user khác
            var otherUser = new User { Username = "x", Email = "x@t.com", PasswordHash = "h" };
            var otherWallet = new Wallet { UserId = otherUser.Id, Name = "W2", FiatBalance = 1000m };
            ctx.Users.Add(otherUser);
            ctx.Wallets.Add(otherWallet);
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            await svc.CreateOrderAsync(userId, new CreateOrderRequest
            {
                WalletId = walletId, CoinId = "bitcoin", Side = OrderSide.Buy,
                Type = OrderType.Limit, TriggerPrice = 40_000m, Quantity = 0.1m
            });
            await svc.CreateOrderAsync(otherUser.Id, new CreateOrderRequest
            {
                WalletId = otherWallet.Id, CoinId = "bitcoin", Side = OrderSide.Sell,
                Type = OrderType.Limit, TriggerPrice = 60_000m, Quantity = 0.1m
            });

            var mine = await svc.GetUserOrdersAsync(userId);
            mine.Should().HaveCount(1);
            mine[0].Side.Should().Be(OrderSide.Buy);
        }

        [Fact]
        public async Task CancelOrder_PendingOrder_MarksCancelled()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx);

            var svc = CreateService(ctx);
            var order = await svc.CreateOrderAsync(userId, new CreateOrderRequest
            {
                WalletId = walletId, CoinId = "bitcoin", Side = OrderSide.Buy,
                Type = OrderType.Limit, TriggerPrice = 40_000m, Quantity = 0.1m
            });

            var ok = await svc.CancelOrderAsync(order.Id, userId);

            ok.Should().BeTrue();
            var stored = ctx.TradeOrders.Single();
            stored.Status.Should().Be(OrderStatus.Cancelled);
            stored.CancelledAt.Should().NotBeNull();
        }

        [Fact]
        public async Task CancelOrder_AlreadyFilled_Throws()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx);

            ctx.TradeOrders.Add(new TradeOrder
            {
                UserId = userId, WalletId = walletId,
                CoinId = "bitcoin", CoinSymbol = "BTC", CoinName = "Bitcoin",
                Side = OrderSide.Buy, Type = OrderType.Limit,
                TriggerPrice = 100, Quantity = 1,
                Status = OrderStatus.Filled,
            });
            await ctx.SaveChangesAsync();
            var orderId = ctx.TradeOrders.Single().Id;

            var svc = CreateService(ctx);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.CancelOrderAsync(orderId, userId));
        }

        [Fact]
        public async Task CancelOrder_NotFound_ReturnsFalse()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, _) = await SeedAsync(ctx);
            var svc = CreateService(ctx);

            var ok = await svc.CancelOrderAsync(Guid.NewGuid(), userId);
            ok.Should().BeFalse();
        }
    }
}
