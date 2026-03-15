namespace CryptoDashboard.Application.Exceptions
{
    /// <summary>
    /// Base exception for all external crypto API errors.
    /// </summary>
    public class CryptoApiException : Exception
    {
        public int? StatusCode { get; }

        public CryptoApiException(string message)
            : base(message) { }

        public CryptoApiException(string message, int statusCode)
            : base(message)
        {
            StatusCode = statusCode;
        }

        public CryptoApiException(string message, Exception innerException)
            : base(message, innerException) { }

        public CryptoApiException(string message, int statusCode, Exception innerException)
            : base(message, innerException)
        {
            StatusCode = statusCode;
        }
    }
}
