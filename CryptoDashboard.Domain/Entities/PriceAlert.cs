// CryptoDashboard.Domain/Entities/PriceAlert.cs
namespace CryptoDashboard.Domain.Entities
{
    /// <summary>
    /// One-shot price alert: triggers when coin price crosses the target in the given direction.
    /// Deleted (hard) after triggering on the frontend via DELETE endpoint.
    /// </summary>
    public class PriceAlert
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }

        public string CoinId { get; set; } = string.Empty;       // e.g. "bitcoin"
        public string CoinSymbol { get; set; } = string.Empty;   // e.g. "btc"
        public string CoinName { get; set; } = string.Empty;     // e.g. "Bitcoin"

        public decimal TargetPrice { get; set; }

        /// <summary>Above = 1  → trigger when price ≥ target. Below = 2 → trigger when price ≤ target.</summary>
        public AlertDirection Direction { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public User User { get; set; } = null!;
    }

    public enum AlertDirection
    {
        Above = 1,
        Below = 2,
    }
}
