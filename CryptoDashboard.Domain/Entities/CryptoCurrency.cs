using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Domain.Entities
{
    public class CryptoCurrency
    {
        public string Id { get; set; } = string.Empty; // VD: "bitcoin", "ethereum"
        public string Symbol { get; set; } = string.Empty; // VD: "btc", "eth"
        public string Name { get; set; } = string.Empty; // VD: "Bitcoin", "Ethereum"
        public decimal CurrentPrice { get; set; }
        public decimal PriceChangePercentage24h { get; set; }
        public decimal MarketCap { get; set; }
        public decimal TotalVolume { get; set; }
        public string Image { get; set; } = string.Empty; // URL của logo
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}
