using CryptoDashboard.Application.DTOs.Telemetry;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CryptoDashboard.Api.Controllers
{
    /// <summary>
    /// Endpoints used by the frontend to push telemetry to the server. Currently
    /// only exposes an error reporting sink — the frontend ErrorBoundary fires
    /// this when an uncaught exception bubbles up.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TelemetryController : ControllerBase
    {
        private readonly IClientErrorLogger _errorLogger;

        public TelemetryController(IClientErrorLogger errorLogger)
        {
            _errorLogger = errorLogger;
        }

        /// <summary>POST /api/telemetry/errors — log a browser-side error.</summary>
        [HttpPost("errors")]
        [EnableRateLimiting("errors")]
        public async Task<IActionResult> ReportError([FromBody] ClientErrorReport report, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(report.Message))
            {
                return BadRequest(new { message = "Message is required." });
            }

            var sourceIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _errorLogger.LogAsync(report, sourceIp, ct);
            return Accepted();
        }
    }
}
