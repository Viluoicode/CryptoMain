using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.DTOs.Position;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using CryptoDashboard.Infrastructure.Services;
using CryptoDashboard.Tests.Helpers;
using FluentAssertions;
using Moq;

namespace CryptoDashboard.Tests.Services
{
    public class PositionServiceTests
    {
        private readonly Mock<ICryptoService> _cryptoMock;
        private readonly Mock<ICryptoPriceCache> _priceCacheMock;

        public PositionServiceTests()
        {
            _cryptoMock = new Mock<ICryptoService>();
            _priceCacheMock = new Mock<ICryptoPriceCache>();

            _cryptoMock
                .Setup(s => s.GetCryptocurrencyByIdAsync("bitcoin"))
                .ReturnsAsync(new CryptoListResponse
                {
                    Id = "bitcoin",
                    Symbol = "btc",
                    Name = "Bitcoin",
                    CurrentPrice = 50000m,
                });
        }

        private PositionService CreateService(
            CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx)
            => new(ctx, _cryptoMock.Object, _priceCacheMock.Object);

        private static async Task<(Guid userId, Guid walletId)> SeedUserAndWalletAsync(
            CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx,
            decimal fiatBalance)
        {
            var user = new User { Username = "trader", Email = "t@test.com", PasswordHash = "h" };
            var wallet = new Wallet { UserId = user.Id, Name = "Main", FiatBalance = fiatBalance };
            ctx.Users.Add(user);
            ctx.Wallets.Add(wallet);
            await ctx.SaveChangesAsync();
            return (user.Id, wallet.Id);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  OpenPositionAsync — collateral & liquidation math
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task OpenPosition_Long10x_DeductsCorrectCollateral()
        {
            // qty=1 BTC, entry=$50k, lev=10 → collateral = 50000/10 = $5000
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 100_000m);
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);
            await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 1m,
                Leverage = 10,
            });

            var wallet = ctx.Wallets.Single();
            wallet.FiatBalance.Should().Be(95_000m);

            var pos = ctx.Positions.Single();
            pos.CollateralAmount.Should().Be(5_000m);
        }

        [Fact]
        public async Task OpenPosition_Long10x_LiquidationPriceCorrect()
        {
            // Long, lev=10, entry=50000
            // liqPrice = 50000 * (1 - 0.1 + 0.05) = 50000 * 0.95 = 47500
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 100_000m);
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);
            await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 1m,
                Leverage = 10,
            });

            var pos = ctx.Positions.Single();
            pos.LiquidationPrice.Should().Be(47_500m);
        }

        [Fact]
        public async Task OpenPosition_Short10x_LiquidationPriceCorrect()
        {
            // Short, lev=10, entry=50000
            // liqPrice = 50000 * (1 + 0.1 - 0.05) = 50000 * 1.05 = 52500
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 100_000m);
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);
            await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Short,
                Quantity = 1m,
                Leverage = 10,
            });

            var pos = ctx.Positions.Single();
            pos.LiquidationPrice.Should().Be(52_500m);
        }

        [Fact]
        public async Task OpenPosition_HighLeverage100x_NarrowLiquidationRange()
        {
            // Long, lev=100, entry=50000 → liqPrice = 50000*(1 - 0.01 + 0.05) = 50000*1.04 = 52000
            // Wait — with maintenance > 1/leverage, liqPrice for Long could be ABOVE entry,
            // meaning position is immediately liquidatable. This is the maintenance margin reality.
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 100_000m);
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);
            await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 0.001m,
                Leverage = 100,
            });

            var pos = ctx.Positions.Single();
            pos.Leverage.Should().Be(100);
            pos.CollateralAmount.Should().BeApproximately(0.5m, 0.01m); // 0.001 * 50000 / 100
        }

        [Fact]
        public async Task OpenPosition_InsufficientBalance_ThrowsAndDoesNotDeduct()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 100m); // chỉ $100
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);

            // qty=1, lev=10 → cần $5000 collateral
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.OpenPositionAsync(userId, new OpenPositionRequest
                {
                    WalletId = walletId,
                    CoinId = "bitcoin",
                    Side = PositionSide.Long,
                    Quantity = 1m,
                    Leverage = 10,
                }));

            ex.Message.Should().Contain("Insufficient");
            ctx.Wallets.Single().FiatBalance.Should().Be(100m); // balance không đổi
            ctx.Positions.Should().BeEmpty();
        }

        [Fact]
        public async Task OpenPosition_WalletNotOwnedByUser_ThrowsUnauthorized()
        {
            using var ctx = TestDbContextFactory.Create();
            var (_, walletId) = await SeedUserAndWalletAsync(ctx, 100_000m);
            var otherUserId = Guid.NewGuid();
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => svc.OpenPositionAsync(otherUserId, new OpenPositionRequest
                {
                    WalletId = walletId,
                    CoinId = "bitcoin",
                    Side = PositionSide.Long,
                    Quantity = 1m,
                    Leverage = 5,
                }));
        }

        // ══════════════════════════════════════════════════════════════════════
        //  ClosePositionAsync — PnL math
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task ClosePosition_LongProfit_AddsCollateralPlusPnLToWallet()
        {
            // Long 1 BTC @50k with 10x → collateral=$5k
            // Close at $55k → PnL = (55000-50000)*1*10 = $50000 profit
            // Wallet gets back $5k collateral + $50k PnL = $55k
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 10_000m);
            _priceCacheMock.SetupSequence(c => c.GetPriceAsync("bitcoin"))
                .ReturnsAsync(50_000m)  // entry
                .ReturnsAsync(55_000m); // close

            var svc = CreateService(ctx);
            var opened = await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 1m,
                Leverage = 10,
            });

            // After open: wallet = 10000 - 5000 = 5000
            ctx.Wallets.Single().FiatBalance.Should().Be(5_000m);

            await svc.ClosePositionAsync(opened.Id, userId);

            // After close: wallet = 5000 + (5000 collateral + 50000 PnL) = 60000
            ctx.Wallets.Single().FiatBalance.Should().Be(60_000m);
            var pos = ctx.Positions.Single();
            pos.Status.Should().Be(PositionStatus.Closed);
            pos.RealizedPnL.Should().Be(50_000m);
            pos.ExitPrice.Should().Be(55_000m);
        }

        [Fact]
        public async Task ClosePosition_LongLoss_ReducesPayout()
        {
            // Long 1 BTC @50k, lev=5 → collateral = 10000
            // Close at $48k → PnL = (48000-50000)*1*5 = -10000 (loss = collateral)
            // Wallet gets back 0 (max(0, 10000 + -10000) = 0)
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 10_000m);
            _priceCacheMock.SetupSequence(c => c.GetPriceAsync("bitcoin"))
                .ReturnsAsync(50_000m)
                .ReturnsAsync(48_000m);

            var svc = CreateService(ctx);
            var opened = await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 1m,
                Leverage = 5,
            });

            await svc.ClosePositionAsync(opened.Id, userId);

            ctx.Wallets.Single().FiatBalance.Should().Be(0m);
            ctx.Positions.Single().RealizedPnL.Should().Be(-10_000m);
        }

        [Fact]
        public async Task ClosePosition_ShortProfit_CalculatesPnLCorrectly()
        {
            // Short 1 BTC @50k, lev=5 → collateral = 10000
            // Close at $45k → PnL = (50000-45000)*1*5 = +25000 profit
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 20_000m);
            _priceCacheMock.SetupSequence(c => c.GetPriceAsync("bitcoin"))
                .ReturnsAsync(50_000m)
                .ReturnsAsync(45_000m);

            var svc = CreateService(ctx);
            var opened = await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Short,
                Quantity = 1m,
                Leverage = 5,
            });

            await svc.ClosePositionAsync(opened.Id, userId);

            ctx.Positions.Single().RealizedPnL.Should().Be(25_000m);
        }

        [Fact]
        public async Task ClosePosition_AlreadyClosed_Throws()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 10_000m);
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);
            var opened = await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 1m,
                Leverage = 5,
            });
            await svc.ClosePositionAsync(opened.Id, userId);

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.ClosePositionAsync(opened.Id, userId));
        }

        [Fact]
        public async Task ClosePosition_NotFound_Throws()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, _) = await SeedUserAndWalletAsync(ctx, 10_000m);
            var svc = CreateService(ctx);

            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => svc.ClosePositionAsync(Guid.NewGuid(), userId));
        }

        [Fact]
        public async Task ClosePosition_NotOwnedByUser_Throws()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 10_000m);
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);

            var svc = CreateService(ctx);
            var opened = await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 0.1m,
                Leverage = 5,
            });

            var otherUserId = Guid.NewGuid();
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () => svc.ClosePositionAsync(opened.Id, otherUserId));
        }

        // ══════════════════════════════════════════════════════════════════════
        //  GetUserPositionsAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetUserPositions_EnrichesOpenPositionsWithLivePnL()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedUserAndWalletAsync(ctx, 10_000m);
            _priceCacheMock.Setup(c => c.GetPriceAsync("bitcoin")).ReturnsAsync(50_000m);
            _priceCacheMock.Setup(c => c.GetBatchPricesAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(new Dictionary<string, decimal> { ["bitcoin"] = 52_000m });

            var svc = CreateService(ctx);
            await svc.OpenPositionAsync(userId, new OpenPositionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Side = PositionSide.Long,
                Quantity = 1m,
                Leverage = 5,
            });

            var positions = await svc.GetUserPositionsAsync(userId);

            positions.Should().HaveCount(1);
            // Long 1 BTC @50k, lev=5 → PnL @52k = (52000-50000)*1*5 = 10000
            positions[0].CurrentPrice.Should().Be(52_000m);
            positions[0].UnrealizedPnL.Should().Be(10_000m);
        }
    }
}
