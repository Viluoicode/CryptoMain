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

        public OrderController(IOrderService orderService)
        {
            _orderService = orderService;
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
