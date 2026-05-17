namespace CryptoDashboard.Application.DTOs.Watchlist
{
    public class WatchlistItemResponse
    {
        public Guid Id { get; set; }
        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
