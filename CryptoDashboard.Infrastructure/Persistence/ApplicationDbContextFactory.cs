using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CryptoDashboard.Infrastructure.Persistence
{
    public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        // Same UserSecretsId as CryptoDashboard.Api.csproj
        private const string UserSecretsId = "282f2eb9-ec27-4782-8e7f-980ed584646c";

        public ApplicationDbContext CreateDbContext(string[] args)
        {
            var basePath = Directory.GetCurrentDirectory();
            var apiPath = Path.Combine(basePath, "..", "CryptoDashboard.Api");

            var configuration = new ConfigurationBuilder()
                .SetBasePath(apiPath)
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile("appsettings.Development.json", optional: true)
                // Load User Secrets (same as the Api project) — keeps password out of files
                .AddUserSecrets(UserSecretsId)
                // Environment variables override everything (for CI/CD & production)
                .AddEnvironmentVariables()
                .Build();

            var connectionString = configuration.GetConnectionString("MyConnect");

            if (string.IsNullOrEmpty(connectionString))
                throw new InvalidOperationException(
                    "Connection string 'MyConnect' not found. " +
                    "Run: dotnet user-secrets set \"ConnectionStrings:MyConnect\" \"<your-connection-string>\" " +
                    "--project CryptoDashboard.Api");

            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseNpgsql(connectionString, b =>
                b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));

            return new ApplicationDbContext(optionsBuilder.Options);
        }
    }
}
