using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.DTOs.Transaction;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using CryptoDashboard.Infrastructure.Services;
using CryptoDashboard.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace CryptoDashboard.Tests.Services
{
    public class TransactionServiceTests
    {
        private readonly Mock<ICryptoService> _cryptoMock;

        public TransactionServiceTests()
        {
            _cryptoMock = new Mock<ICryptoService>();
            _cryptoMock
                .Setup(s => s.GetCryptocurrencyByIdAsync("bitcoin"))
                .ReturnsAsync(new CryptoListResponse
                {
                    Id = "bitcoin", Symbol = "BTC", Name = "Bitcoin", CurrentPrice = 50_000m,
                });
        }

        private TransactionService CreateService(
            CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx)
            => new(ctx, _cryptoMock.Object);

        private static async Task<(Guid userId, Guid walletId)> SeedAsync(
            CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx, decimal balance)
        {
            var user = new User { Username = "u", Email = "u@t.com", PasswordHash = "h" };
            var wallet = new Wallet { UserId = user.Id, Name = "W", FiatBalance = balance };
            ctx.Users.Add(user);
            ctx.Wallets.Add(wallet);
            await ctx.SaveChangesAsync();
            return (user.Id, wallet.Id);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  Buy — fiat balance integrity
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Buy_SufficientBalance_DeductsAndPersistsTransaction()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx, 10_000m);

            var svc = CreateService(ctx);
            await svc.CreateTransactionAsync(userId, new CreateTransactionRequest
            {
                WalletId = walletId,
                CoinId = "bitcoin",
                Type = TransactionType.Buy,
                Quantity = 0.1m,
                PricePerCoin = 50_000m,  // total = 5000
            });

            ctx.Wallets.Single().FiatBalance.Should().Be(5_000m);
            ctx.Transactions.Single().TotalAmount.Should().Be(5_000m);
        }

        [Fact]
        public async Task Buy_InsufficientBalance_Throws_AndDoesNotMutateWallet()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx, 100m);

            var svc = CreateService(ctx);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.CreateTransactionAsync(userId, new CreateTransactionRequest
                {
                    WalletId = walletId,
                    CoinId = "bitcoin",
                    Type = TransactionType.Buy,
                    Quantity = 1m,
                    PricePerCoin = 50_000m,
                }));

            ex.Message.Should().Contain("Insufficient");
            ctx.Wallets.Single().FiatBalance.Should().Be(100m); // unchanged
            ctx.Transactions.Should().BeEmpty();
        }

        // ══════════════════════════════════════════════════════════════════════
        //  Sell — coin balance integrity
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Sell_WithSufficientHolding_AddsToFiatBalance()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx, 10_000m);
            var svc = CreateService(ctx);

            // Buy 1 BTC trước
            await svc.CreateTransactionAsync(userId, new CreateTransactionRequest
            {
                WalletId = walletId, CoinId = "bitcoin", Type = TransactionType.Buy,
                Quantity = 0.1m, PricePerCoin = 50_000m,
            });
            // Wallet còn 10000 - 5000 = 5000

            // Sell 0.05 BTC @ 60000 → +3000 fiat
            await svc.CreateTransactionAsync(userId, new CreateTransactionRequest
            {
                WalletId = walletId, CoinId = "bitcoin", Type = TransactionType.Sell,
                Quantity = 0.05m, PricePerCoin = 60_000m,
            });

            ctx.Wallets.Single().FiatBalance.Should().Be(8_000m); // 5000 + 3000
        }

        [Fact]
        public async Task Sell_MoreThanOwned_Throws()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx, 10_000m);
            var svc = CreateService(ctx);

            await svc.CreateTransactionAsync(userId, new CreateTransactionRequest
            {
                WalletId = walletId, CoinId = "bitcoin", Type = TransactionType.Buy,
                Quantity = 0.1m, PricePerCoin = 50_000m,
            });

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.CreateTransactionAsync(userId, new CreateTransactionRequest
                {
                    WalletId = walletId, CoinId = "bitcoin", Type = TransactionType.Sell,
                    Quantity = 1m,  // chỉ có 0.1 BTC
                    PricePerCoin = 50_000m,
                }));

            ex.Message.Should().Contain("Insufficient");
        }

        // ══════════════════════════════════════════════════════════════════════
        //  Ownership / authorization
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Create_WalletOwnedByDifferentUser_ThrowsUnauthorized()
        {
            using var ctx = TestDbContextFactory.Create();
            var (_, walletId) = await SeedAsync(ctx, 10_000m);
            var otherUser = Guid.NewGuid();
            var svc = CreateService(ctx);

            await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => svc.CreateTransactionAsync(otherUser, new CreateTransactionRequest
                {
                    WalletId = walletId, CoinId = "bitcoin", Type = TransactionType.Buy,
                    Quantity = 0.1m, PricePerCoin = 1000m,
                }));
        }

        [Fact]
        public async Task Create_UnknownCoin_Throws()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx, 10_000m);
            _cryptoMock.Setup(s => s.GetCryptocurrencyByIdAsync("dogecoin"))
                .ReturnsAsync((CryptoListResponse?)null);
            var svc = CreateService(ctx);

            await Assert.ThrowsAsync<ArgumentException>(
                () => svc.CreateTransactionAsync(userId, new CreateTransactionRequest
                {
                    WalletId = walletId, CoinId = "dogecoin", Type = TransactionType.Buy,
                    Quantity = 100m, PricePerCoin = 0.1m,
                }));
        }

        // ══════════════════════════════════════════════════════════════════════
        //  Soft delete behavior
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task Delete_SoftDeletes_TransactionAndReversesWallet()
        {
            using var ctx = TestDbContextFactory.Create();
            var (userId, walletId) = await SeedAsync(ctx, 10_000m);
            var svc = CreateService(ctx);

            var tx = await svc.CreateTransactionAsync(userId, new CreateTransactionRequest
            {
                WalletId = walletId, CoinId = "bitcoin", Type = TransactionType.Buy,
                Quantity = 0.1m, PricePerCoin = 50_000m,
            });
            // wallet: 10000 - 5000 = 5000

            var deleted = await svc.DeleteTransactionAsync(tx.Id, userId);
            deleted.Should().BeTrue();

            // Wallet phải được trả lại $5000 (đảo ngược Buy)
            ctx.Wallets.Single().FiatBalance.Should().Be(10_000m);

            // Bypass query filter để verify soft-delete
            var stored = ctx.Transactions.IgnoreQueryFilters().Single();
            stored.IsDeleted.Should().BeTrue();
        }
    }
}
