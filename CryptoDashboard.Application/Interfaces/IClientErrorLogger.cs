using CryptoDashboard.Application.DTOs.Telemetry;

namespace CryptoDashboard.Application.Interfaces
{
    /// <summary>
    /// Logs uncaught browser-side exceptions sent by the frontend.
    /// Implementation is free to forward to Serilog, Sentry, Application
    /// Insights, etc.
    /// </summary>
    public interface IClientErrorLogger
    {
        Task LogAsync(ClientErrorReport report, string? sourceIp, CancellationToken ct = default);
    }
}
