using CryptoDashboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
namespace CryptoDashboard.Tests.Helpers
{
    /// <summary>
    /// Factory tạo ApplicationDbContext dùng InMemory provider cho unit tests.
    /// Mỗi test nên dùng một dbName khác nhau để tránh dữ liệu bị chia sẻ.
    /// </summary>
    public static class TestDbContextFactory
    {
        public static ApplicationDbContext Create(string? dbName = null)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
        .ConfigureWarnings(w => w.Ignore(
            InMemoryEventId.TransactionIgnoredWarning))
        .Options;

            return new ApplicationDbContext(options);
        }
    }
}
