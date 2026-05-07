using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using CryptoDashboard.Application.Exceptions;

namespace CryptoDashboard.Api.Middleware
{
    public class GlobalExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var (statusCode, response) = exception switch
            {
                ValidationException validationEx => (
                    (int)HttpStatusCode.BadRequest,
                    (object)new { message = "Validation failed", errors = new[] { validationEx.Message } }
                ),

                UnauthorizedAccessException => (
                    (int)HttpStatusCode.Unauthorized,
                    (object)new { message = "Unauthorized access" }
                ),

                KeyNotFoundException keyNotFoundEx => (
                    (int)HttpStatusCode.NotFound,
                    (object)new { message = keyNotFoundEx.Message }
                ),

                CryptoApiRateLimitException rateLimitEx => (
                    (int)HttpStatusCode.TooManyRequests,
                    (object)new { message = rateLimitEx.Message, retryAfterSeconds = rateLimitEx.RetryAfterSeconds }
                ),

                CryptoApiUnavailableException unavailableEx => (
                    (int)HttpStatusCode.ServiceUnavailable,
                    (object)new { message = unavailableEx.Message }
                ),

                CryptoApiException apiEx => (
                    apiEx.StatusCode ?? (int)HttpStatusCode.BadGateway,
                    (object)new { message = apiEx.Message }
                ),

                _ => (
                    (int)HttpStatusCode.InternalServerError,
                    (object)new { message = "An internal server error occurred" }
                )
            };

            if (statusCode >= 500)
            {
                _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);
            }
            else
            {
                _logger.LogWarning(exception, "Handled exception: {Message}", exception.Message);
            }

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            var json = JsonSerializer.Serialize(response, JsonOptions);
            await context.Response.WriteAsync(json);
        }
    }
}
