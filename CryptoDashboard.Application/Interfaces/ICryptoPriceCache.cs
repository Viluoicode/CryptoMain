namespace CryptoDashboard.Application.Interfaces
{
    public interface ICryptoPriceCache
    {
        Task<decimal?> GetPriceAsync(string coinId);
        Task SetPriceAsync(string coinId, decimal price, TimeSpan? ttl = null);
        Task<Dictionary<string, decimal>> GetBatchPricesAsync(IEnumerable<string> coinIds);
        Task SetBatchPricesAsync(Dictionary<string, decimal> prices, TimeSpan? ttl = null);
        Task InvalidateAsync(string coinId);
        Task InvalidateAllAsync();
    }
}
