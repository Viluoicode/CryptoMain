using CryptoDashboard.Api.Middleware;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Application.Options;
using CryptoDashboard.Application.Validators;
using CryptoDashboard.Infrastructure.Caching;
using CryptoDashboard.Infrastructure.HealthChecks;
using CryptoDashboard.Infrastructure.Persistence;
using CryptoDashboard.Infrastructure.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Http;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using Polly;
using Polly.Extensions.Http;
using Serilog;
using System.Net;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
builder.Host.UseSerilog((ctx, services, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "CryptoDashboard.Api")
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.File("logs/app-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate:
            "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"));

// Add services to the container.
builder.Services.AddOpenApi();

// Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("MyConnect"),
        b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

// Dependency injection
builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

// Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IPortfolioService, PortfolioService>();
builder.Services.AddScoped<IWatchlistService, WatchlistService>();
builder.Services.AddScoped<IPriceAlertService, PriceAlertService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IPositionService, PositionService>();
builder.Services.AddScoped<IOnChainWalletService, OnChainWalletService>();
builder.Services.AddSingleton<IClientErrorLogger, SerilogClientErrorLogger>();
builder.Services.AddSingleton<IIdempotencyService, MemoryIdempotencyService>();

// Alchemy Options
builder.Services.Configure<AlchemyOptions>(builder.Configuration.GetSection(AlchemyOptions.SectionName));

// CryptoApi Options
var cryptoApiSection = builder.Configuration.GetSection(CryptoApiOptions.SectionName);
builder.Services.Configure<CryptoApiOptions>(cryptoApiSection);
var cryptoApiOptions = cryptoApiSection.Get<CryptoApiOptions>() ?? new CryptoApiOptions();

// JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!)),
        ClockSkew = TimeSpan.Zero
    };
});
builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else
        {
            policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });
});

builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<CreateTransactionRequestValidator>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "CryptoDashboard API",
        Version = "v1",
        Description = "API for Crypto Dashboard - Learning Project"
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.\n\nExample: \"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\""
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllersWithViews();

// HttpClient Factory & Memory Cache
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICryptoPriceCache, MemoryCryptoPriceCache>();

// Background price refresh
builder.Services.AddHostedService<CryptoPriceRefreshService>();

// Daily portfolio snapshot (runs at midnight UTC)
builder.Services.AddHostedService<PortfolioSnapshotBackgroundService>();

// Stop-loss / take-profit / limit order monitor (polls every 5s)
builder.Services.AddHostedService<OrderMonitorBackgroundService>();

// Margin position liquidation monitor (polls every 10s)
builder.Services.AddHostedService<LiquidationBackgroundService>();

// Crypto Service with Polly Resilience Policies
builder.Services.AddHttpClient<ICryptoService, CryptoService>(client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "CryptoDashboard/1.0 (Learning Project)");
    client.Timeout = TimeSpan.FromSeconds(cryptoApiOptions.TimeoutSeconds);
})
.AddPolicyHandler(GetRetryPolicy(cryptoApiOptions))
.AddPolicyHandler(GetCircuitBreakerPolicy());

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddNpgSql(
        builder.Configuration.GetConnectionString("MyConnect")!,
        name: "postgres",
        tags: new[] { "ready" })
    .AddCheck<CryptoPriceCacheHealthCheck>(
        name: "crypto-price-cache",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "ready" });

// ── Rate limiter ──────────────────────────────────────────────────────────────
// "crypto"     — heavy upstream calls to CoinGecko; 30 req/min per IP
// "leaderboard"— public anon endpoint; 10 req/min per IP
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("crypto", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    options.AddPolicy("leaderboard", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // "auth-login"    — anti brute-force on /api/auth/login;    5 req/min per IP
    // "auth-register" — anti spam on        /api/auth/register; 3 req/min per IP
    options.AddPolicy("auth-login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    options.AddPolicy("auth-register", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // "errors" — frontend error log endpoint; 20 req/min per IP (prevents log spam)
    options.AddPolicy("errors", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Serilog request logging — captures method, path, status, duration
app.UseSerilogRequestLogging(opts =>
{
    opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} → {StatusCode} in {Elapsed:0.0}ms";
});

// Global Exception Handling — must be early in the pipeline
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Health endpoints
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false, // liveness — process is up
});
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"), // readiness — DB reachable
});

app.MapControllers();

// Auto-apply EF migrations on startup (production deploys without a separate migrate step)
if (app.Configuration.GetValue<bool>("RunMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        Log.Information("Applying pending EF Core migrations…");
        db.Database.Migrate();
        Log.Information("Migrations applied");
    }
    catch (Exception ex)
    {
        Log.Fatal(ex, "Failed to apply migrations on startup");
        throw;
    }
}

try
{
    Log.Information("Starting CryptoDashboard.Api on {Environment}", app.Environment.EnvironmentName);
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// --- Polly Policy Factories ---

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy(CryptoApiOptions options)
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => msg.StatusCode == HttpStatusCode.TooManyRequests)
        .WaitAndRetryAsync(
            retryCount: options.RetryCount,
            sleepDurationProvider: (retryAttempt, response, _) =>
            {
                // Honor Retry-After header if present
                if (response.Result?.Headers.RetryAfter?.Delta is TimeSpan retryAfter)
                {
                    return retryAfter;
                }
                // Exponential backoff with jitter
                var baseDelay = TimeSpan.FromMilliseconds(options.RetryBaseDelayMs);
                var exponentialDelay = baseDelay * Math.Pow(2, retryAttempt - 1);
                var jitter = TimeSpan.FromMilliseconds(Random.Shared.Next(0, 500));
                return exponentialDelay + jitter;
            },
            onRetryAsync: (outcome, timespan, retryAttempt, _) =>
            {
                return Task.CompletedTask;
            });
}

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => msg.StatusCode == HttpStatusCode.TooManyRequests)
        .CircuitBreakerAsync(
            handledEventsAllowedBeforeBreaking: 5,
            durationOfBreak: TimeSpan.FromSeconds(30));
}