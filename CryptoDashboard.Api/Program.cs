using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Infrastructure.Persistence;
using CryptoDashboard.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// đăng kí ApplicationDbContext với chuỗi kết nối từ appsettings.json
//database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("MyConnect"),
        b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));
//dependency injection
builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
// Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IWalletService, WalletService>();// JWT Authentication
builder.Services.AddScoped<ITransactionService, TransactionService>();
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
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddScoped<IPortfolioService, PortfolioService>();
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
// HttpClient Factory
builder.Services.AddHttpClient();

// Memory Cache
builder.Services.AddMemoryCache();

// Crypto Service
builder.Services.AddHttpClient<ICryptoService, CryptoService>(client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "CryptoDashboard/1.0 (Learning Project)");
    client.Timeout = TimeSpan.FromSeconds(30);
});
var app = builder.Build();
var endpoints = app.Services.GetRequiredService<EndpointDataSource>().Endpoints;
foreach (var endpoint in endpoints)
{
    Console.WriteLine($"Endpoint: {endpoint.DisplayName}");
}


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    var authHeader = context.Request.Headers["Authorization"].ToString();
    Console.WriteLine($"[DEBUG] Authorization Header: {authHeader.Substring(0, Math.Min(50, authHeader.Length))}...");

    if (context.User.Identity?.IsAuthenticated == true)
    {
        Console.WriteLine($"[DEBUG] User authenticated: {context.User.Identity.Name}");
    }
    else
    {
        Console.WriteLine("[DEBUG] User NOT authenticated");
    }

    await next();
});
app.UseAuthorization();
app.MapControllers();

app.Run();
/*

{
    "email": "test@example.com",
  "password": "Password123!"
}
*/