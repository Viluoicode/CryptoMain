using System.ComponentModel.DataAnnotations;

namespace CryptoDashboard.Application.DTOs.Wallet
{
    public class TransferWalletRequest
    {
        [Required]
        public Guid FromWalletId { get; set; }

        [Required]
        public Guid ToWalletId { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }
    }
}
