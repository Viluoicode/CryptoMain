namespace CryptoDashboard.Domain.Entities
{
    public class PortfolioSnapshot
    {
        public long Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        public decimal TotalValue { get; set; }
        public decimal TotalInvested { get; set; }
        public decimal ProfitLoss { get; set; }
        public DateTime SnapshotDate { get; set; } = DateTime.UtcNow.Date;
    }
}
