// CryptoDashboard.Infrastructure/Persistence/ApplicationDbContext.cs
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Common;
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

            // ─── User ──────────────────────────────────────────────────────────
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Username).HasMaxLength(100).IsRequired();
                entity.Property(e => e.PasswordHash).IsRequired();
            });

            // ─── Wallet ────────────────────────────────────────────────────────
            modelBuilder.Entity<Wallet>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
                entity.Property(e => e.RowVersion).IsRowVersion();

                entity.HasOne(e => e.User)
                      .WithMany(u => u.Wallets)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                // Trong OnModelCreating, phần Wallet
                entity.Property(e => e.RowVersion)
                      .IsRowVersion()
                      .IsConcurrencyToken();
                // ── Index ──
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.UserId, e.IsDeleted });

                // ── Soft Delete filter ──
                entity.HasQueryFilter(e => !e.IsDeleted);
            });

            // ─── Transaction ───────────────────────────────────────────────────
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

                // ── Index ──
                entity.HasIndex(e => e.WalletId);
                entity.HasIndex(e => e.TransactionDate);
                entity.HasIndex(e => new { e.WalletId, e.IsDeleted });
                entity.HasIndex(e => new { e.WalletId, e.TransactionDate });

                // ── Soft Delete filter ──
                entity.HasQueryFilter(e => !e.IsDeleted);
            });

            // ─── PriceHistory ──────────────────────────────────────────────────
            modelBuilder.Entity<PriceHistory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CoinId).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 8);
                entity.Property(e => e.MarketCap).HasPrecision(28, 2);
                entity.Property(e => e.Volume24h).HasPrecision(28, 2);
                entity.HasIndex(e => new { e.CoinId, e.RecordedAt });
            });

            // ─── PortfolioSnapshot ─────────────────────────────────────────────
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

        // ── Soft Delete + Audit tự động khi SaveChanges ────────────────────────
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            foreach (var entry in ChangeTracker.Entries<BaseEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.CreatedAt = DateTime.UtcNow;
                        entry.Entity.UpdatedAt = DateTime.UtcNow;
                        break;

                    case EntityState.Modified:
                        entry.Entity.UpdatedAt = DateTime.UtcNow;
                        break;

                    case EntityState.Deleted:
                        // Soft Delete
                        entry.State = EntityState.Modified;
                        entry.Entity.IsDeleted = true;
                        entry.Entity.DeletedAt = DateTime.UtcNow;
                        entry.Entity.UpdatedAt = DateTime.UtcNow;
                        break;
                }
            }

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}