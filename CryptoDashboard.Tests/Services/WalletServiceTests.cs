using CryptoDashboard.Application.DTOs.Crypto;
using CryptoDashboard.Application.DTOs.Wallet;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using CryptoDashboard.Infrastructure.Services;
using CryptoDashboard.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace CryptoDashboard.Tests.Services
{
    public class WalletServiceTests
    {
        private readonly Mock<ICryptoService> _cryptoMock;

        public WalletServiceTests()
        {
            _cryptoMock = new Mock<ICryptoService>();

            // Default: trả về dict rỗng (không có giá thị trường)
            _cryptoMock
                .Setup(c => c.GetCryptocurrenciesByIdsAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(new Dictionary<string, CryptoListResponse>());
        }

        private WalletService CreateService(CryptoDashboard.Infrastructure.Persistence.ApplicationDbContext ctx)
            => new WalletService(ctx, _cryptoMock.Object);

        // ══════════════════════════════════════════════════════════════════════
        //  CreateWalletAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateWalletAsync_ValidRequest_ReturnsMappedResponse()
        {
            using var ctx = TestDbContextFactory.Create();
            var svc = CreateService(ctx);
            var userId = Guid.NewGuid();

            var result = await svc.CreateWalletAsync(userId, new CreateWalletRequest { Name = "My BTC Wallet" });

            result.Should().NotBeNull();
            result.Name.Should().Be("My BTC Wallet");
            result.UserId.Should().Be(userId);
            result.Id.Should().NotBe(Guid.Empty);
        }

        [Fact]
        public async Task CreateWalletAsync_ValidRequest_PersistsWalletToDatabase()
        {
            using var ctx = TestDbContextFactory.Create();
            var svc = CreateService(ctx);
            var userId = Guid.NewGuid();

            await svc.CreateWalletAsync(userId, new CreateWalletRequest { Name = "Savings" });

            ctx.Wallets.Should().ContainSingle(w => w.Name == "Savings" && w.UserId == userId);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  GetUserWalletsAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetUserWalletsAsync_ReturnsOnlyWalletsForThatUser()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId = Guid.NewGuid();
            var otherId = Guid.NewGuid();

            ctx.Wallets.AddRange(
                new Wallet { Id = Guid.NewGuid(), Name = "Mine",   UserId = userId  },
                new Wallet { Id = Guid.NewGuid(), Name = "Others", UserId = otherId }
            );
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            var result = await svc.GetUserWalletsAsync(userId);

            result.Should().ContainSingle(w => w.Name == "Mine");
        }

        [Fact]
        public async Task GetUserWalletsAsync_ExcludesSoftDeletedWallets()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId = Guid.NewGuid();

            ctx.Wallets.AddRange(
                new Wallet { Id = Guid.NewGuid(), Name = "Active",  UserId = userId },
                new Wallet { Id = Guid.NewGuid(), Name = "Deleted", UserId = userId, IsDeleted = true }
            );
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            var result = await svc.GetUserWalletsAsync(userId);

            result.Should().ContainSingle(w => w.Name == "Active");
        }

        [Fact]
        public async Task GetUserWalletsAsync_OrderedByCreatedAtDescending()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId = Guid.NewGuid();

            ctx.Wallets.AddRange(
                new Wallet { Id = Guid.NewGuid(), Name = "Older", UserId = userId, CreatedAt = DateTime.UtcNow.AddDays(-2) },
                new Wallet { Id = Guid.NewGuid(), Name = "Newer", UserId = userId, CreatedAt = DateTime.UtcNow }
            );
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            var result = await svc.GetUserWalletsAsync(userId);

            result.First().Name.Should().Be("Newer");
        }

        // ══════════════════════════════════════════════════════════════════════
        //  GetWalletByIdAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetWalletByIdAsync_ValidOwner_ReturnsWalletDetail()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();

            ctx.Wallets.Add(new Wallet { Id = walletId, Name = "Detail Wallet", UserId = userId });
            await ctx.SaveChangesAsync();

            var svc    = CreateService(ctx);
            var result = await svc.GetWalletByIdAsync(walletId, userId);

            result.Should().NotBeNull();
            result!.Id.Should().Be(walletId);
            result.Name.Should().Be("Detail Wallet");
            result.TransactionCount.Should().Be(0);
        }

        [Fact]
        public async Task GetWalletByIdAsync_WrongUser_ReturnsNull()
        {
            using var ctx = TestDbContextFactory.Create();
            var walletId = Guid.NewGuid();
            ctx.Wallets.Add(new Wallet { Id = walletId, Name = "Private", UserId = Guid.NewGuid() });
            await ctx.SaveChangesAsync();

            var svc    = CreateService(ctx);
            var result = await svc.GetWalletByIdAsync(walletId, Guid.NewGuid());

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetWalletByIdAsync_NonExistentId_ReturnsNull()
        {
            using var ctx  = TestDbContextFactory.Create();
            var svc        = CreateService(ctx);

            var result = await svc.GetWalletByIdAsync(Guid.NewGuid(), Guid.NewGuid());

            result.Should().BeNull();
        }

        // ── Holdings calculation ───────────────────────────────────────────────

        [Fact]
        public async Task GetWalletByIdAsync_BuyAndSellTransactions_CalculatesNetHoldingCorrectly()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();

            // Mock giá hiện tại: 60,000 USD/BTC
            _cryptoMock
                .Setup(c => c.GetCryptocurrenciesByIdsAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(new Dictionary<string, CryptoListResponse>
                {
                    ["bitcoin"] = new CryptoListResponse { Id = "bitcoin", CurrentPrice = 60_000m }
                });

            ctx.Wallets.Add(new Wallet
            {
                Id = walletId, Name = "BTC Wallet", UserId = userId,
                Transactions = new List<Transaction>
                {
                    new() { Id = Guid.NewGuid(), WalletId = walletId, CoinId = "bitcoin", CoinSymbol = "BTC", CoinName = "Bitcoin",
                            Type = TransactionType.Buy,  Quantity = 2m,    PricePerCoin = 50_000m, TotalAmount = 100_000m },
                    new() { Id = Guid.NewGuid(), WalletId = walletId, CoinId = "bitcoin", CoinSymbol = "BTC", CoinName = "Bitcoin",
                            Type = TransactionType.Sell, Quantity = 0.5m,  PricePerCoin = 55_000m, TotalAmount =  27_500m }
                }
            });
            await ctx.SaveChangesAsync();

            var result = await CreateService(ctx).GetWalletByIdAsync(walletId, userId);

            result.Should().NotBeNull();
            var holding = result!.Holdings.Should().ContainSingle().Subject;

            holding.CoinId.Should().Be("bitcoin");
            holding.Quantity.Should().Be(1.5m);                 // 2 - 0.5
            holding.CurrentPrice.Should().Be(60_000m);
            holding.CurrentValue.Should().Be(90_000m);          // 1.5 × 60 000
            holding.AverageBuyPrice.Should().Be(50_000m);       // 100 000 / 2
            holding.ProfitLoss.Should().BeApproximately(15_000m, 0.01m); // 90 000 - 75 000
        }

        [Fact]
        public async Task GetWalletByIdAsync_AllCoinsSold_HoldingsIsEmpty()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();

            ctx.Wallets.Add(new Wallet
            {
                Id = walletId, Name = "Empty Wallet", UserId = userId,
                Transactions = new List<Transaction>
                {
                    new() { Id = Guid.NewGuid(), WalletId = walletId, CoinId = "ethereum", CoinSymbol = "ETH", CoinName = "Ethereum",
                            Type = TransactionType.Buy,  Quantity = 1m, PricePerCoin = 3_000m, TotalAmount = 3_000m },
                    new() { Id = Guid.NewGuid(), WalletId = walletId, CoinId = "ethereum", CoinSymbol = "ETH", CoinName = "Ethereum",
                            Type = TransactionType.Sell, Quantity = 1m, PricePerCoin = 3_500m, TotalAmount = 3_500m }
                }
            });
            await ctx.SaveChangesAsync();

            var result = await CreateService(ctx).GetWalletByIdAsync(walletId, userId);

            result!.Holdings.Should().BeEmpty();
            result.TotalValue.Should().Be(0m);
        }

        [Fact]
        public async Task GetWalletByIdAsync_CryptoApiDown_FallsBackToAvgBuyPrice()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();

            // CryptoService ném exception → service bắt và fallback
            _cryptoMock
                .Setup(c => c.GetCryptocurrenciesByIdsAsync(It.IsAny<IEnumerable<string>>()))
                .ThrowsAsync(new HttpRequestException("API down"));

            ctx.Wallets.Add(new Wallet
            {
                Id = walletId, Name = "Fallback Wallet", UserId = userId,
                Transactions = new List<Transaction>
                {
                    new() { Id = Guid.NewGuid(), WalletId = walletId, CoinId = "bitcoin", CoinSymbol = "BTC", CoinName = "Bitcoin",
                            Type = TransactionType.Buy, Quantity = 1m, PricePerCoin = 50_000m, TotalAmount = 50_000m }
                }
            });
            await ctx.SaveChangesAsync();

            // Không được ném exception ra ngoài
            var result = await CreateService(ctx).GetWalletByIdAsync(walletId, userId);

            result.Should().NotBeNull();
            result!.Holdings.Should().ContainSingle();
            result.Holdings[0].CurrentPrice.Should().Be(50_000m); // fallback = avg buy price
        }

        // ══════════════════════════════════════════════════════════════════════
        //  UpdateWalletAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateWalletAsync_ValidRequest_UpdatesNameAndReturnsUpdatedResponse()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();
            ctx.Wallets.Add(new Wallet { Id = walletId, Name = "Old Name", UserId = userId });
            await ctx.SaveChangesAsync();

            var svc    = CreateService(ctx);
            var result = await svc.UpdateWalletAsync(walletId, userId, new UpdateWalletRequest { Name = "New Name" });

            result.Should().NotBeNull();
            result!.Name.Should().Be("New Name");

            // Kiểm tra trong DB
            var inDb = ctx.Wallets.Find(walletId);
            inDb!.Name.Should().Be("New Name");
        }

        [Fact]
        public async Task UpdateWalletAsync_WrongUser_ReturnsNull()
        {
            using var ctx = TestDbContextFactory.Create();
            var walletId = Guid.NewGuid();
            ctx.Wallets.Add(new Wallet { Id = walletId, Name = "Secret", UserId = Guid.NewGuid() });
            await ctx.SaveChangesAsync();

            var svc    = CreateService(ctx);
            var result = await svc.UpdateWalletAsync(walletId, Guid.NewGuid(), new UpdateWalletRequest { Name = "Hacked" });

            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateWalletAsync_NonExistentWallet_ReturnsNull()
        {
            using var ctx = TestDbContextFactory.Create();
            var svc       = CreateService(ctx);

            var result = await svc.UpdateWalletAsync(Guid.NewGuid(), Guid.NewGuid(), new UpdateWalletRequest { Name = "X" });

            result.Should().BeNull();
        }

        // ══════════════════════════════════════════════════════════════════════
        //  DeleteWalletAsync
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteWalletAsync_ExistingWallet_ReturnsTrue()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();
            ctx.Wallets.Add(new Wallet { Id = walletId, Name = "To Delete", UserId = userId });
            await ctx.SaveChangesAsync();

            var svc    = CreateService(ctx);
            var result = await svc.DeleteWalletAsync(walletId, userId);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteWalletAsync_ExistingWallet_SoftDeletesWallet()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();
            ctx.Wallets.Add(new Wallet { Id = walletId, Name = "To Delete", UserId = userId });
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            await svc.DeleteWalletAsync(walletId, userId);

            // Query filter ẩn ví đã bị soft-delete
            var walletsVisible = await svc.GetUserWalletsAsync(userId);
            walletsVisible.Should().BeEmpty();

            // IgnoreQueryFilters để thấy bản ghi thực sự vẫn còn trong DB
            var rawWallet = ctx.Wallets
                .IgnoreQueryFilters()
                .AsQueryable()
                .FirstOrDefault(w => w.Id == walletId); rawWallet.Should().NotBeNull();
            rawWallet!.IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteWalletAsync_ExistingWallet_CascadeSoftDeletesTransactions()
        {
            using var ctx = TestDbContextFactory.Create();
            var userId   = Guid.NewGuid();
            var walletId = Guid.NewGuid();

            ctx.Wallets.Add(new Wallet
            {
                Id = walletId, Name = "Parent", UserId = userId,
                Transactions = new List<Transaction>
                {
                    new() { Id = Guid.NewGuid(), WalletId = walletId, CoinId = "bitcoin", CoinSymbol = "BTC", CoinName = "Bitcoin",
                            Type = TransactionType.Buy, Quantity = 1m, PricePerCoin = 50_000m, TotalAmount = 50_000m }
                }
            });
            await ctx.SaveChangesAsync();

            var svc = CreateService(ctx);
            await svc.DeleteWalletAsync(walletId, userId);

            // Tất cả giao dịch của ví phải bị soft-delete
            var allTx = ctx.Transactions
                .IgnoreQueryFilters()
                .AsQueryable()
                .Where(t => t.WalletId == walletId)
                .ToList(); allTx.Should().ContainSingle();
            allTx[0].IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteWalletAsync_NonExistentWallet_ReturnsFalse()
        {
            using var ctx = TestDbContextFactory.Create();
            var svc       = CreateService(ctx);

            var result = await svc.DeleteWalletAsync(Guid.NewGuid(), Guid.NewGuid());

            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteWalletAsync_WrongUser_ReturnsFalse()
        {
            using var ctx = TestDbContextFactory.Create();
            var walletId = Guid.NewGuid();
            ctx.Wallets.Add(new Wallet { Id = walletId, Name = "Someone's", UserId = Guid.NewGuid() });
            await ctx.SaveChangesAsync();

            var svc    = CreateService(ctx);
            var result = await svc.DeleteWalletAsync(walletId, Guid.NewGuid()); // user khác

            result.Should().BeFalse();
        }
    }
}
