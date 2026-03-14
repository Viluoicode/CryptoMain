using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Domain.Entities
{
    public class Wallet
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty; // VD: My Wallet, Savings Wallet
        public Guid UserId { get; set; }
        public string CurrencySymbol { get; set; } = string.Empty; // VD: USDT, BTC, ETH
        public decimal Balance { get; set; } = 0;

        // Navigation property
        public User Users { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        ///navigation property
        ///
        public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }
}
