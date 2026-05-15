using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<User> Users { get; }
        DbSet<Wallet> Wallets { get; }
        DbSet<Transaction> Transactions { get; }
        DbSet<PriceHistory> PriceHistories { get; }
        DbSet<PortfolioSnapshot> PortfolioSnapshots { get; }
        DbSet<WatchlistItem> WatchlistItems { get; }
        DbSet<PriceAlert> PriceAlerts { get; }
        DatabaseFacade Database { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
