namespace CryptoDashboard.Application.Exceptions
{
    /// <summary>
    /// Thrown when the external crypto API returns HTTP 5xx — Service Unavailable.
    /// </summary>
    public class CryptoApiUnavailableException : CryptoApiException
    {
        public CryptoApiUnavailableException(string message)
            : base(message, 503) { }

        public CryptoApiUnavailableException(string message, int statusCode)
            : base(message, statusCode) { }

        public CryptoApiUnavailableException(string message, Exception innerException)
            : base(message, 503, innerException) { }

        public CryptoApiUnavailableException(string message, int statusCode, Exception innerException)
            : base(message, statusCode, innerException) { }
    }
}
