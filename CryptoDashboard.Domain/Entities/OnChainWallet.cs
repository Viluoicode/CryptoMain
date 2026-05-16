namespace CryptoDashboard.Domain.Entities
{
    /// <summary>
    /// External blockchain wallet address tracked by the user (read-only).
    /// Backend syncs balances via Alchemy/Etherscan periodically.
    /// </summary>
    public class OnChainWallet
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }

        public string Address { get; set; } = string.Empty;     // 0x...
        public string Label { get; set; } = string.Empty;       // user-given name
        public string Chain { get; set; } = "ethereum";         // ethereum, polygon, bsc, etc.

        public decimal NativeBalance { get; set; }              // ETH/BNB/MATIC
        public string NativeSymbol { get; set; } = "ETH";

        /// <summary>JSON-serialised list of ERC-20 token balances.</summary>
        public string? TokensJson { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastSyncedAt { get; set; }

        // Navigation
        public User User { get; set; } = null!;
    }
}
