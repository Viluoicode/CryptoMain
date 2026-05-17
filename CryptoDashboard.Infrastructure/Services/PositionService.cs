using CryptoDashboard.Application.DTOs.Position;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{
    public class PositionService : IPositionService
    {
        private const decimal MaintenanceMarginRate = 0.05m; // 5%

        private readonly IApplicationDbContext _context;
        private readonly ICryptoService _cryptoService;
        private readonly ICryptoPriceCache _priceCache;

        public PositionService(
            IApplicationDbContext context,
            ICryptoService cryptoService,
            ICryptoPriceCache priceCache)
        {
            _context = context;
            _cryptoService = cryptoService;
            _priceCache = priceCache;
        }

        public async Task<PositionResponse> OpenPositionAsync(Guid userId, OpenPositionRequest request)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.Id == request.WalletId && w.UserId == userId)
                ?? throw new UnauthorizedAccessException("Wallet not found or access denied");

            var coin = await _cryptoService.GetCryptocurrencyByIdAsync(request.CoinId)
                ?? throw new ArgumentException($"Coin '{request.CoinId}' not found");

            var entryPrice = await _priceCache.GetPriceAsync(request.CoinId)
                ?? coin.CurrentPrice;

            var notional = request.Quantity * entryPrice;
            var collateral = notional / request.Leverage;

            if (wallet.FiatBalance < collateral)
                throw new InvalidOperationException(
                    $"Insufficient balance. Need ${collateral:F2} collateral, have ${wallet.FiatBalance:F2}");

            // Liquidation: when unrealised loss eats collateral below maintenance margin
            // For Long:  liqPrice = entryPrice * (1 - (1/leverage) + maintenanceRate)
            // For Short: liqPrice = entryPrice * (1 + (1/leverage) - maintenanceRate)
            var liquidationPrice = request.Side == PositionSide.Long
                ? entryPrice * (1m - (1m / request.Leverage) + MaintenanceMarginRate)
                : entryPrice * (1m + (1m / request.Leverage) - MaintenanceMarginRate);

            wallet.FiatBalance -= collateral;

            var position = new Position
            {
                UserId = userId,
                WalletId = request.WalletId,
                CoinId = request.CoinId,
                CoinSymbol = coin.Symbol.ToUpper(),
                CoinName = coin.Name,
                Side = request.Side,
                EntryPrice = entryPrice,
                Quantity = request.Quantity,
                Leverage = request.Leverage,
                CollateralAmount = collateral,
                LiquidationPrice = liquidationPrice,
                Status = PositionStatus.Open,
                OpenedAt = DateTime.UtcNow,
            };

            _context.Positions.Add(position);
            await _context.SaveChangesAsync();

            var response = MapToResponse(position, wallet.Name);
            response.CurrentPrice = entryPrice;
            response.UnrealizedPnL = 0m;
            response.UnrealizedPnLPercentage = 0m;
            response.MarginRatio = 1m;
            return response;
        }

        public async Task<List<PositionResponse>> GetUserPositionsAsync(Guid userId)
        {
            var positions = await _context.Positions
                .Include(p => p.Wallet)
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.OpenedAt)
                .ToListAsync();

            var openPositions = positions.Where(p => p.Status == PositionStatus.Open).ToList();
            var coinIds = openPositions.Select(p => p.CoinId).Distinct();
            var prices = await _priceCache.GetBatchPricesAsync(coinIds);

            return positions.Select(p =>
            {
                var response = MapToResponse(p, p.Wallet?.Name ?? string.Empty);
                if (p.Status == PositionStatus.Open && prices.TryGetValue(p.CoinId, out var price))
                    EnrichWithLiveData(response, p, price);
                return response;
            }).ToList();
        }

        public async Task<PositionResponse> ClosePositionAsync(Guid positionId, Guid userId)
        {
            await using var dbTx = await _context.Database.BeginTransactionAsync();
            try
            {
                var position = await _context.Positions
                    .Include(p => p.Wallet)
                    .FirstOrDefaultAsync(p => p.Id == positionId && p.UserId == userId)
                    ?? throw new KeyNotFoundException("Position not found");

                if (position.Status != PositionStatus.Open)
                    throw new InvalidOperationException("Position is not open");

                var currentPrice = await _priceCache.GetPriceAsync(position.CoinId)
                    ?? throw new InvalidOperationException("Price data unavailable");

                var pnl = CalculatePnL(position, currentPrice);
                var returnAmount = position.CollateralAmount + pnl;

                position.Wallet.FiatBalance += Math.Max(0, returnAmount);
                position.Status = PositionStatus.Closed;
                position.ExitPrice = currentPrice;
                position.RealizedPnL = pnl;
                position.CloseReason = "Manual close";
                position.ClosedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                var response = MapToResponse(position, position.Wallet.Name);
                response.CurrentPrice = currentPrice;
                return response;
            }
            catch
            {
                await dbTx.RollbackAsync();
                throw;
            }
        }

        private static decimal CalculatePnL(Position p, decimal currentPrice)
        {
            var priceDiff = p.Side == PositionSide.Long
                ? currentPrice - p.EntryPrice
                : p.EntryPrice - currentPrice;
            return priceDiff * p.Quantity * p.Leverage;
        }

        private static void EnrichWithLiveData(PositionResponse response, Position p, decimal currentPrice)
        {
            var pnl = CalculatePnL(p, currentPrice);
            var pnlPct = p.CollateralAmount > 0 ? pnl / p.CollateralAmount * 100m : 0m;
            var equity = p.CollateralAmount + pnl;
            var marginRatio = p.CollateralAmount > 0 ? equity / p.CollateralAmount : 0m;

            response.CurrentPrice = currentPrice;
            response.UnrealizedPnL = Math.Round(pnl, 2);
            response.UnrealizedPnLPercentage = Math.Round(pnlPct, 2);
            response.MarginRatio = Math.Round(marginRatio, 4);
        }

        private static PositionResponse MapToResponse(Position p, string walletName) => new()
        {
            Id = p.Id,
            WalletId = p.WalletId,
            WalletName = walletName,
            CoinId = p.CoinId,
            CoinSymbol = p.CoinSymbol,
            CoinName = p.CoinName,
            Side = p.Side,
            EntryPrice = p.EntryPrice,
            Quantity = p.Quantity,
            Leverage = p.Leverage,
            CollateralAmount = p.CollateralAmount,
            LiquidationPrice = p.LiquidationPrice,
            Status = p.Status,
            ExitPrice = p.ExitPrice,
            RealizedPnL = p.RealizedPnL,
            CloseReason = p.CloseReason,
            OpenedAt = p.OpenedAt,
            ClosedAt = p.ClosedAt,
        };
    }
}
