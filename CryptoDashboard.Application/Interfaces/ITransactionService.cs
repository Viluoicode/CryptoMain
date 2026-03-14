using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CryptoDashboard.Application.DTOs.Transaction;

namespace CryptoDashboard.Application.Interfaces
{
    public interface ITransactionService
    {
        Task<TransactionResponse> CreateTransactionAsync(Guid userId, CreateTransactionRequest request);
        Task<List<TransactionResponse>> GetUserTransactionsAsync(Guid userId);
        Task<List<TransactionResponse>> GetWalletTransactionsAsync(Guid walletId, Guid userId);
        Task<bool> DeleteTransactionAsync(Guid transactionId, Guid userId);
    }
}
