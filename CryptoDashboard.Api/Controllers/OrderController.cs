using CryptoDashboard.Application.DTOs.Order;
using CryptoDashboard.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CryptoDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly IIdempotencyService _idempotency;

        public OrderController(IOrderService orderService, IIdempotencyService idempotency)
        {
            _orderService = orderService;
            _idempotency = idempotency;
        }

        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            var userId = GetCurrentUserId();
            var orders = await _orderService.GetUserOrdersAsync(userId);
            return Ok(orders);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            var userId = GetCurrentUserId();

            // Idempotency-Key header is optional. If provided, the same key from
            // the same user within 5 minutes returns 409 instead of double-creating.
            if (Request.Headers.TryGetValue("Idempotency-Key", out var keyValues))
            {
                var key = keyValues.ToString();
                if (!_idempotency.TryRegister(userId, key))
                {
                    return Conflict(new { message = "Duplicate request — this order was already submitted." });
                }
            }

            var order = await _orderService.CreateOrderAsync(userId, request);
            return CreatedAtAction(nameof(GetOrders), order);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> CancelOrder(Guid id)
        {
            var userId = GetCurrentUserId();
            var result = await _orderService.CancelOrderAsync(id, userId);
            if (!result) return NotFound();
            return NoContent();
        }

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? throw new UnauthorizedAccessException("User ID claim not found");
            return Guid.Parse(claim);
        }
    }
}
