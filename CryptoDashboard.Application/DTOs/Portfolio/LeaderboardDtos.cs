namespace CryptoDashboard.Application.DTOs.Portfolio
{
    public enum LeaderboardPeriod
    {
        Week = 1,
        Month = 2,
        AllTime = 3,
    }

    public class LeaderboardEntry
    {
        public int Rank { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public decimal ProfitLossPercentage { get; set; }
        public decimal CurrentValue { get; set; }
        public decimal StartValue { get; set; }
        public int TransactionCount { get; set; }
    }
}
