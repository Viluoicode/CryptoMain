using System.Text.Json.Serialization;

namespace CryptoDashboard.Application.DTOs.Crypto
{
    public class CoinGeckoResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("symbol")]
        public string Symbol { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("image")]
        public string Image { get; set; } = string.Empty;

        [JsonPropertyName("current_price")]
        public decimal? CurrentPrice { get; set; }

        [JsonPropertyName("price_change_percentage_24h")]
        public decimal? PriceChangePercentage24h { get; set; }

        [JsonPropertyName("market_cap")]
        public decimal? MarketCap { get; set; }

        [JsonPropertyName("total_volume")]
        public decimal? TotalVolume { get; set; }

        [JsonPropertyName("high_24h")]
        public decimal? High24h { get; set; }

        [JsonPropertyName("low_24h")]
        public decimal? Low24h { get; set; }

        [JsonPropertyName("sparkline_in_7d")]
        public SparklineData? SparklineIn7d { get; set; }

        [JsonPropertyName("last_updated")]
        public DateTime LastUpdated { get; set; }
    }

    public class SparklineData
    {
        [JsonPropertyName("price")]
        public List<decimal>? Price { get; set; }
    }
}
