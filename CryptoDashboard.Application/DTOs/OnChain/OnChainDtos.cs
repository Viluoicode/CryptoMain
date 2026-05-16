using System.ComponentModel.DataAnnotations;

namespace CryptoDashboard.Application.DTOs.OnChain
{
    public class AddOnChainWalletRequest
    {
        [Required, RegularExpression(@"^0x[a-fA-F0-9]{40}$", ErrorMessage = "Invalid EVM address format")]
        public string Address { get; set; } = string.Empty;

        [Required, StringLength(50)]
        public string Label { get; set; } = string.Empty;

        [Required]
        public string Chain { get; set; } = "ethereum";
    }

    public class OnChainWalletResponse
    {
        public Guid Id { get; set; }
        public string Address { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Chain { get; set; } = string.Empty;
        public decimal NativeBalance { get; set; }
        public string NativeSymbol { get; set; } = string.Empty;
        public List<TokenBalance> Tokens { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime? LastSyncedAt { get; set; }
    }

    public class TokenBalance
    {
        public string Symbol { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string ContractAddress { get; set; } = string.Empty;
        public decimal Balance { get; set; }
        public int Decimals { get; set; } = 18;
    }
}
