namespace CryptoDashboard.Application.DTOs.Telemetry
{
    /// <summary>
    /// Payload sent by the frontend ErrorBoundary / global handler when an
    /// uncaught exception occurs in the browser. Captured server-side via
    /// Serilog (Warning level) so logs can be reviewed without a third-party
    /// service like Sentry.
    /// </summary>
    public class ClientErrorReport
    {
        /// <summary>Error message — usually <c>Error.message</c>.</summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>JS stack trace (may be minified in production builds).</summary>
        public string? Stack { get; set; }

        /// <summary>React component stack from ErrorBoundary.componentDidCatch.</summary>
        public string? ComponentStack { get; set; }

        /// <summary>Browser URL where the error occurred (window.location.href).</summary>
        public string? Url { get; set; }

        /// <summary>navigator.userAgent.</summary>
        public string? UserAgent { get; set; }

        /// <summary>Free-form context the frontend wants to attach (route, action).</summary>
        public string? Context { get; set; }
    }
}
