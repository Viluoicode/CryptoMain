using CryptoDashboard.Application.DTOs.Wallet;
using FluentValidation;

namespace CryptoDashboard.Application.Validators
{
    public class CreateWalletRequestValidator : AbstractValidator<CreateWalletRequest>
    {
        public CreateWalletRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Wallet name is required")
                .MinimumLength(1).WithMessage("Wallet name must be at least 1 character")
                .MaximumLength(200).WithMessage("Wallet name must not exceed 200 characters")
                .Matches(@"^[^<>""'%;()&]+$").WithMessage("Wallet name contains invalid characters");
        }
    }
}