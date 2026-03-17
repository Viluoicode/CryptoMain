using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Wallet> Wallets { get; set; } = null!;
        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<PriceHistory> PriceHistories { get; set; } = null!;
        public DbSet<PortfolioSnapshot> PortfolioSnapshots { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Username).HasMaxLength(100).IsRequired();
                entity.Property(e => e.PasswordHash).IsRequired();
            });

            // Wallet configuration
            modelBuilder.Entity<Wallet>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200).IsRequired();

                entity.HasOne(e => e.User)
                      .WithMany(u => u.Wallets)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Transaction configuration
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CoinId).HasMaxLength(50).IsRequired();
                entity.Property(e => e.CoinSymbol).HasMaxLength(10).IsRequired();
                entity.Property(e => e.CoinName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Quantity).HasPrecision(18, 8);
                entity.Property(e => e.PricePerCoin).HasPrecision(18, 2);
                entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
                entity.Property(e => e.Notes).HasMaxLength(500);

                entity.HasOne(e => e.Wallet)
                      .WithMany(w => w.Transactions)
                      .HasForeignKey(e => e.WalletId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // PriceHistory configuration
            modelBuilder.Entity<PriceHistory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CoinId).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 8);
                entity.Property(e => e.MarketCap).HasPrecision(28, 2);
                entity.Property(e => e.Volume24h).HasPrecision(28, 2);

                entity.HasIndex(e => new { e.CoinId, e.RecordedAt });
            });

            // PortfolioSnapshot configuration
            modelBuilder.Entity<PortfolioSnapshot>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TotalValue).HasPrecision(18, 2);
                entity.Property(e => e.TotalInvested).HasPrecision(18, 2);
                entity.Property(e => e.ProfitLoss).HasPrecision(18, 2);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.UserId, e.SnapshotDate }).IsUnique();
            });
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return base.SaveChangesAsync(cancellationToken);
        }
    }
}