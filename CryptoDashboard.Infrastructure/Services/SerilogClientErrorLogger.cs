using CryptoDashboard.Application.DTOs.Telemetry;
using CryptoDashboard.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace CryptoDashboard.Infrastructure.Services
{
    /// <summary>
    /// Logs frontend errors to ILogger (which Serilog tails to console + rolling
    /// file). Truncates payload fields to keep logs bounded.
    /// </summary>
    public class SerilogClientErrorLogger : IClientErrorLogger
    {
        private readonly ILogger<SerilogClientErrorLogger> _logger;

        // Truncation limits — protect log volume from runaway stack traces.
        private const int MaxStackLength = 4_000;
        private const int MaxFieldLength = 1_000;

        public SerilogClientErrorLogger(ILogger<SerilogClientErrorLogger> logger)
        {
            _logger = logger;
        }

        public Task LogAsync(ClientErrorReport report, string? sourceIp, CancellationToken ct = default)
        {
            _logger.LogWarning(
                "Client error {Message} at {Url} | ip={SourceIp} ua={UserAgent} context={Context} stack={Stack} reactStack={ReactStack}",
                Truncate(report.Message, MaxFieldLength),
                Truncate(report.Url, MaxFieldLength),
                sourceIp ?? "unknown",
                Truncate(report.UserAgent, MaxFieldLength),
                Truncate(report.Context, MaxFieldLength),
                Truncate(report.Stack, MaxStackLength),
                Truncate(report.ComponentStack, MaxStackLength));

            return Task.CompletedTask;
        }

        private static string? Truncate(string? value, int maxLength)
        {
            if (string.IsNullOrEmpty(value)) return value;
            return value.Length <= maxLength ? value : value[..maxLength] + "…(truncated)";
        }
    }
}
