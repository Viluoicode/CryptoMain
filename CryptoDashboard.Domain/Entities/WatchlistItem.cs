using CryptoDashboard.Domain.Common;

namespace CryptoDashboard.Domain.Entities
{
    public class WatchlistItem : BaseEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public string CoinId { get; set; } = string.Empty;     // "bitcoin"
        public string CoinSymbol { get; set; } = string.Empty; // "btc"

        // Navigation
        public User User { get; set; } = null!;
    }
}
