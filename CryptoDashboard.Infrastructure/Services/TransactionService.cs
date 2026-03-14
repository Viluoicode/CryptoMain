using CryptoDashboard.Application.DTOs.Transaction;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CryptoDashboard.Infrastructure.Services
{
    public class TransactionService : ITransactionService
    {
        private readonly IApplicationDbContext _context;
        private readonly ICryptoService _cryptoService;

        public TransactionService(IApplicationDbContext context, ICryptoService cryptoService)
        {
            _context = context;
            _cryptoService = cryptoService;
        }

        public async Task<TransactionResponse> CreateTransactionAsync(Guid userId, CreateTransactionRequest request)
        {
            // Verify wallet belongs to user
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.Id == request.WalletId && w.UserId == userId);

            if (wallet == null)
            {
                throw new UnauthorizedAccessException("Wallet not found or you don't have permission");
            }

            // Get coin info from CoinGecko
            var coinData = await _cryptoService.GetCryptocurrencyByIdAsync(request.CoinId);
            if (coinData == null)
            {
                throw new ArgumentException($"Coin '{request.CoinId}' not found");
            }

            // Create transaction
            var transaction = new Domain.Entities.Transaction
            {
                Id = Guid.NewGuid(),
                WalletId = request.WalletId,
                CoinId = request.CoinId,
                CoinSymbol = coinData.Symbol,
                CoinName = coinData.Name,
                Type = request.Type,
                Quantity = request.Quantity,
                PricePerCoin = request.PricePerCoin,
                TotalAmount = request.Quantity * request.PricePerCoin,
                TransactionDate = request.TransactionDate ?? DateTime.UtcNow,
                Notes = request.Notes
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            return new TransactionResponse
            {
                Id = transaction.Id,
                WalletId = transaction.WalletId,
                WalletName = wallet.Name,
                CoinId = transaction.CoinId,
                CoinSymbol = transaction.CoinSymbol,
                CoinName = transaction.CoinName,
                Type = transaction.Type,
                Quantity = transaction.Quantity,
                PricePerCoin = transaction.PricePerCoin,
                TotalAmount = transaction.TotalAmount,
                TransactionDate = transaction.TransactionDate,
                Notes = transaction.Notes
            };
        }

        public async Task<List<TransactionResponse>> GetUserTransactionsAsync(Guid userId)
        {
            var transactions = await _context.Transactions
                .Include(t => t.Wallet)
                .Where(t => t.Wallet.UserId == userId)
                .OrderByDescending(t => t.TransactionDate)
                .Select(t => new TransactionResponse
                {
                    Id = t.Id,
                    WalletId = t.WalletId,
                    WalletName = t.Wallet.Name,
                    CoinId = t.CoinId,
                    CoinSymbol = t.CoinSymbol,
                    CoinName = t.CoinName,
                    Type = t.Type,
                    Quantity = t.Quantity,
                    PricePerCoin = t.PricePerCoin,
                    TotalAmount = t.TotalAmount,
                    TransactionDate = t.TransactionDate,
                    Notes = t.Notes
                })
                .ToListAsync();

            return transactions;
        }

        public async Task<List<TransactionResponse>> GetWalletTransactionsAsync(Guid walletId, Guid userId)
        {
            // Verify wallet belongs to user
            var walletExists = await _context.Wallets
                .AnyAsync(w => w.Id == walletId && w.UserId == userId);

            if (!walletExists)
            {
                throw new UnauthorizedAccessException("Wallet not found or you don't have permission");
            }

            var transactions = await _context.Transactions
                .Include(t => t.Wallet)
                .Where(t => t.WalletId == walletId)
                .OrderByDescending(t => t.TransactionDate)
                .Select(t => new TransactionResponse
                {
                    Id = t.Id,
                    WalletId = t.WalletId,
                    WalletName = t.Wallet.Name,
                    CoinId = t.CoinId,
                    CoinSymbol = t.CoinSymbol,
                    CoinName = t.CoinName,
                    Type = t.Type,
                    Quantity = t.Quantity,
                    PricePerCoin = t.PricePerCoin,
                    TotalAmount = t.TotalAmount,
                    TransactionDate = t.TransactionDate,
                    Notes = t.Notes
                })
                .ToListAsync();

            return transactions;
        }

        public async Task<bool> DeleteTransactionAsync(Guid transactionId, Guid userId)
        {
            var transaction = await _context.Transactions
                .Include(t => t.Wallet)
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.Wallet.UserId == userId);

            if (transaction == null)
            {
                return false;
            }

            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return true;
        }
    }
}