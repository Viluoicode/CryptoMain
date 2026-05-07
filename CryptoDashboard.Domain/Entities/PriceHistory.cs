namespace CryptoDashboard.Domain.Entities
{
    public class PriceHistory
    {
        public long Id { get; set; }
        public string CoinId { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal MarketCap { get; set; }
        public decimal Volume24h { get; set; }
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}
