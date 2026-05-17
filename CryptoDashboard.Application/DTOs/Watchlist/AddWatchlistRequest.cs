namespace CryptoDashboard.Application.DTOs.Watchlist
{
    public class AddWatchlistRequest
    {
        public string CoinId { get; set; } = string.Empty;
        public string CoinSymbol { get; set; } = string.Empty;
    }
}
