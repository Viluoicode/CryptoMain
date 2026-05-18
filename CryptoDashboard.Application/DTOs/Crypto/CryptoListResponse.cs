namespace CryptoDashboard.Application.DTOs.Crypto
{
    public class CryptoListResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Symbol { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public decimal CurrentPrice { get; set; }
        public decimal PriceChangePercentage24h { get; set; }
        public decimal MarketCap { get; set; }
        public decimal TotalVolume { get; set; }
        public decimal High24h { get; set; }
        public decimal Low24h { get; set; }
        public List<decimal>? Sparkline7d { get; set; }
    }
}
