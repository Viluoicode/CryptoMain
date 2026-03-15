namespace CryptoDashboard.Application.Options
{
    public class CryptoApiOptions
    {
        public const string SectionName = "CryptoApi";

        public string Provider { get; set; } = "CoinGecko";
        public string BaseUrl { get; set; } = "https://api.coingecko.com/api/v3";
        public string ApiKey { get; set; } = string.Empty;
        public int RateLimitPerMinute { get; set; } = 10;
        public int TimeoutSeconds { get; set; } = 30;
        public int RetryCount { get; set; } = 3;
        public int RetryBaseDelayMs { get; set; } = 1000;
    }
}
