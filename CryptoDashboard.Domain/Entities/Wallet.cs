using CryptoDashboard.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CryptoDashboard.Domain.Entities
{
    public class Wallet: BaseEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public Guid UserId { get; set; }

        /// <summary>Virtual USD balance — starts at $10,000, decreases on Buy, increases on Sell.</summary>
        public decimal FiatBalance { get; set; } = 10_000m;

        // Navigation properties
        public User User { get; set; } = null!;
        public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }
}
