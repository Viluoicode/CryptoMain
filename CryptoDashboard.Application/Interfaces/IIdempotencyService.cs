namespace CryptoDashboard.Application.Interfaces
{
    /// <summary>
    /// Lightweight in-memory idempotency guard for mutation endpoints.
    /// Lets clients pass an <c>Idempotency-Key</c> header so an accidental
    /// double-click doesn't open two positions / fire two orders.
    /// </summary>
    public interface IIdempotencyService
    {
        /// <summary>
        /// Attempts to register a <paramref name="key"/> scoped to <paramref name="userId"/>.
        /// Returns <c>true</c> if the key is fresh and the caller should proceed,
        /// or <c>false</c> if the same key was used within the TTL window.
        /// </summary>
        bool TryRegister(Guid userId, string key);
    }
}
