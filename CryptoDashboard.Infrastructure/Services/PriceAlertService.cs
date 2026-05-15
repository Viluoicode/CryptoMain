// CryptoDashboard.Infrastructure/Services/PriceAlertService.cs
using CryptoDashboard.Application.DTOs.PriceAlert;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{
    public class PriceAlertService : IPriceAlertService
    {
        private readonly IApplicationDbContext _context;

        public PriceAlertService(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PriceAlertResponse> CreateAlertAsync(Guid userId, CreatePriceAlertRequest request)
        {
            if (request.TargetPrice <= 0)
                throw new ArgumentException("Target price must be positive.");

            var alert = new PriceAlert
            {
                Id          = Guid.NewGuid(),
                UserId      = userId,
                CoinId      = request.CoinId.Trim().ToLowerInvariant(),
                CoinSymbol  = request.CoinSymbol.Trim().ToLowerInvariant(),
                CoinName    = request.CoinName.Trim(),
                TargetPrice = request.TargetPrice,
                Direction   = request.Direction,
                CreatedAt   = DateTime.UtcNow,
            };

            _context.PriceAlerts.Add(alert);
            await _context.SaveChangesAsync();

            return MapToResponse(alert);
        }

        public async Task<List<PriceAlertResponse>> GetUserAlertsAsync(Guid userId)
        {
            return await _context.PriceAlerts
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new PriceAlertResponse
                {
                    Id          = a.Id,
                    CoinId      = a.CoinId,
                    CoinSymbol  = a.CoinSymbol,
                    CoinName    = a.CoinName,
                    TargetPrice = a.TargetPrice,
                    Direction   = a.Direction,
                    CreatedAt   = a.CreatedAt,
                })
                .ToListAsync();
        }

        public async Task<bool> DeleteAlertAsync(Guid alertId, Guid userId)
        {
            // Hard delete — no soft delete for alerts
            var alert = await _context.PriceAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId);

            if (alert == null) return false;

            _context.PriceAlerts.Remove(alert);
            await _context.SaveChangesAsync();
            return true;
        }

        private static PriceAlertResponse MapToResponse(PriceAlert a) => new()
        {
            Id          = a.Id,
            CoinId      = a.CoinId,
            CoinSymbol  = a.CoinSymbol,
            CoinName    = a.CoinName,
            TargetPrice = a.TargetPrice,
            Direction   = a.Direction,
            CreatedAt   = a.CreatedAt,
        };
    }
}
