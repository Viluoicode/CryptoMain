namespace CryptoDashboard.Application.Options
{
    public class AlchemyOptions
    {
        public const string SectionName = "Alchemy";
        public string ApiKey { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = "https://eth-mainnet.g.alchemy.com/v2";
    }
}
