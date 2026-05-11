using CryptoDashboard.Application.DTOs.Transaction;
using CryptoDashboard.Domain.Entities;
using FluentValidation;

namespace CryptoDashboard.Application.Validators
{
    public class CreateTransactionRequestValidator : AbstractValidator<CreateTransactionRequest>
    {
        public CreateTransactionRequestValidator()
        {
            RuleFor(x => x.WalletId)
                .NotEmpty().WithMessage("Wallet ID is required");

            RuleFor(x => x.CoinId)
                .NotEmpty().WithMessage("Coin ID is required")
                .MaximumLength(50).WithMessage("Coin ID must not exceed 50 characters")
                .Matches(@"^[a-z0-9\-]+$").WithMessage("Coin ID must be lowercase alphanumeric");

            RuleFor(x => x.Type)
                .IsInEnum().WithMessage("Transaction type must be Buy (1) or Sell (2)");

            RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Quantity must be greater than 0")
                .PrecisionScale(18, 8, false).WithMessage("Quantity exceeds allowed precision");

            RuleFor(x => x.PricePerCoin)
                .GreaterThan(0).WithMessage("Price per coin must be greater than 0")
                .PrecisionScale(18, 8, false).WithMessage("Price exceeds allowed precision (max 8 decimal places)");

            RuleFor(x => x.Notes)
                .MaximumLength(500).WithMessage("Notes must not exceed 500 characters")
                .When(x => x.Notes != null);

            RuleFor(x => x.TransactionDate)
                .LessThanOrEqualTo(DateTime.UtcNow)
                .WithMessage("Transaction date cannot be in the future")
                .When(x => x.TransactionDate.HasValue);
        }
    }
}