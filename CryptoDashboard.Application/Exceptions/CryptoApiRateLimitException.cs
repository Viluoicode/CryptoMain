namespace CryptoDashboard.Application.Exceptions
{
    /// <summary>
    /// Thrown when the external crypto API returns HTTP 429 — Too Many Requests.
    /// </summary>
    public class CryptoApiRateLimitException : CryptoApiException
    {
        public int? RetryAfterSeconds { get; }

        public CryptoApiRateLimitException(string message, int? retryAfterSeconds = null)
            : base(message, 429)
        {
            RetryAfterSeconds = retryAfterSeconds;
        }

        public CryptoApiRateLimitException(string message, int? retryAfterSeconds, Exception innerException)
            : base(message, 429, innerException)
        {
            RetryAfterSeconds = retryAfterSeconds;
        }
    }
}
