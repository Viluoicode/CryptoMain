using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
    }
}
