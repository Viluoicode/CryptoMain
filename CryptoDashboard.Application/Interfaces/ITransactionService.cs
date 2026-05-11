using CryptoDashboard.Application.DTOs.Common;
using CryptoDashboard.Application.DTOs.Transaction;
using CryptoDashboard.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Application.Interfaces
{
    public interface ITransactionService
    {
        Task<TransactionResponse> CreateTransactionAsync(Guid userId, CreateTransactionRequest request);
        Task<TransactionResponse?> UpdateTransactionAsync(Guid transactionId, Guid userId, UpdateTransactionRequest request);
        Task<bool> DeleteTransactionAsync(Guid transactionId, Guid userId);
        Task<PagedResult<TransactionResponse>> GetUserTransactionsAsync(
            Guid userId, int page = 1, int pageSize = 20,
            TransactionType? type = null, string? search = null,
            string? sortBy = null, string? sortDir = null);
        Task<PagedResult<TransactionResponse>> GetWalletTransactionsAsync(
            Guid walletId, Guid userId, int page = 1, int pageSize = 20,
            TransactionType? type = null, string? search = null,
            string? sortBy = null, string? sortDir = null);
    }
}
