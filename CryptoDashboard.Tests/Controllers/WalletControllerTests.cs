using CryptoDashboard.Api.Controllers;
using CryptoDashboard.Application.DTOs.Wallet;
using CryptoDashboard.Application.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;

namespace CryptoDashboard.Tests.Controllers
{
    /// <summary>
    /// Unit tests cho WalletController.
    /// WalletService được mock; JWT claim được thiết lập thủ công qua HttpContext.
    /// </summary>
    public class WalletControllerTests
    {
        private readonly Mock<IWalletService> _walletMock;
        private readonly WalletController _controller;
        private readonly Guid _userId = Guid.NewGuid();

        public WalletControllerTests()
        {
            _walletMock = new Mock<IWalletService>();
            _controller = new WalletController(_walletMock.Object);

            // Giả lập JWT claim: NameIdentifier = _userId
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, _userId.ToString())
            };
            var identity   = new ClaimsIdentity(claims, "TestAuth");
            var principal  = new ClaimsPrincipal(identity);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        // ══════════════════════════════════════════════════════════════════════
        //  POST /api/wallet  – CreateWallet
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateWallet_ValidRequest_Returns201Created()
        {
            var walletId = Guid.NewGuid();
            _walletMock
                .Setup(s => s.CreateWalletAsync(_userId, It.IsAny<CreateWalletRequest>()))
                .ReturnsAsync(new WalletResponse
                {
                    Id     = walletId,
                    Name   = "My Wallet",
                    UserId = _userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            var result = await _controller.CreateWallet(new CreateWalletRequest { Name = "My Wallet" });

            var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            created.StatusCode.Should().Be(201);

            var body = created.Value.Should().BeOfType<WalletResponse>().Subject;
            body.Name.Should().Be("My Wallet");
            body.UserId.Should().Be(_userId);
        }

        [Fact]
        public async Task CreateWallet_PassesCurrentUserIdToService()
        {
            _walletMock
                .Setup(s => s.CreateWalletAsync(_userId, It.IsAny<CreateWalletRequest>()))
                .ReturnsAsync(new WalletResponse { Id = Guid.NewGuid(), Name = "X", UserId = _userId });

            await _controller.CreateWallet(new CreateWalletRequest { Name = "X" });

            // Xác nhận service được gọi đúng với userId từ claim
            _walletMock.Verify(s => s.CreateWalletAsync(_userId, It.IsAny<CreateWalletRequest>()), Times.Once);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  GET /api/wallet  – GetWallets
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetWallets_AuthenticatedUser_Returns200WithList()
        {
            _walletMock
                .Setup(s => s.GetUserWalletsAsync(_userId))
                .ReturnsAsync(new List<WalletResponse>
                {
                    new() { Id = Guid.NewGuid(), Name = "Wallet A", UserId = _userId },
                    new() { Id = Guid.NewGuid(), Name = "Wallet B", UserId = _userId }
                });

            var result = await _controller.GetWallets();

            var ok   = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = ok.Value.Should().BeAssignableTo<List<WalletResponse>>().Subject;
            list.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetWallets_NoWallets_Returns200WithEmptyList()
        {
            _walletMock
                .Setup(s => s.GetUserWalletsAsync(_userId))
                .ReturnsAsync(new List<WalletResponse>());

            var result = await _controller.GetWallets();

            var ok   = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = ok.Value.Should().BeAssignableTo<List<WalletResponse>>().Subject;
            list.Should().BeEmpty();
        }

        // ══════════════════════════════════════════════════════════════════════
        //  GET /api/wallet/{id}  – GetWalletById
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetWalletById_ExistingWallet_Returns200WithDetail()
        {
            var walletId = Guid.NewGuid();
            _walletMock
                .Setup(s => s.GetWalletByIdAsync(walletId, _userId))
                .ReturnsAsync(new WalletDetailResponse
                {
                    Id   = walletId,
                    Name = "Detail Wallet",
                    Holdings = new List<HoldingResponse>()
                });

            var result = await _controller.GetWalletById(walletId);

            var ok   = result.Should().BeOfType<OkObjectResult>().Subject;
            var body = ok.Value.Should().BeOfType<WalletDetailResponse>().Subject;
            body.Id.Should().Be(walletId);
        }

        [Fact]
        public async Task GetWalletById_NonExistentWallet_Returns404()
        {
            _walletMock
                .Setup(s => s.GetWalletByIdAsync(It.IsAny<Guid>(), _userId))
                .ReturnsAsync((WalletDetailResponse?)null);

            var result = await _controller.GetWalletById(Guid.NewGuid());

            result.Should().BeOfType<NotFoundObjectResult>()
                  .Which.StatusCode.Should().Be(404);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  PUT /api/wallet/{id}  – UpdateWallet
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateWallet_ExistingWallet_Returns200WithUpdatedResponse()
        {
            var walletId = Guid.NewGuid();
            _walletMock
                .Setup(s => s.UpdateWalletAsync(walletId, _userId, It.IsAny<UpdateWalletRequest>()))
                .ReturnsAsync(new WalletResponse { Id = walletId, Name = "Updated", UserId = _userId });

            var result = await _controller.UpdateWallet(walletId, new UpdateWalletRequest { Name = "Updated" });

            var ok   = result.Should().BeOfType<OkObjectResult>().Subject;
            var body = ok.Value.Should().BeOfType<WalletResponse>().Subject;
            body.Name.Should().Be("Updated");
        }

        [Fact]
        public async Task UpdateWallet_NonExistentWallet_Returns404()
        {
            _walletMock
                .Setup(s => s.UpdateWalletAsync(It.IsAny<Guid>(), _userId, It.IsAny<UpdateWalletRequest>()))
                .ReturnsAsync((WalletResponse?)null);

            var result = await _controller.UpdateWallet(Guid.NewGuid(), new UpdateWalletRequest { Name = "X" });

            result.Should().BeOfType<NotFoundObjectResult>()
                  .Which.StatusCode.Should().Be(404);
        }

        [Fact]
        public async Task UpdateWallet_ConcurrencyConflict_Returns409Conflict()
        {
            _walletMock
                .Setup(s => s.UpdateWalletAsync(It.IsAny<Guid>(), _userId, It.IsAny<UpdateWalletRequest>()))
                .ThrowsAsync(new InvalidOperationException("Wallet was modified by another request. Please retry."));

            var result = await _controller.UpdateWallet(Guid.NewGuid(), new UpdateWalletRequest { Name = "X" });

            result.Should().BeOfType<ConflictObjectResult>()
                  .Which.StatusCode.Should().Be(409);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  DELETE /api/wallet/{id}  – DeleteWallet
        // ══════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteWallet_ExistingWallet_Returns204NoContent()
        {
            var walletId = Guid.NewGuid();
            _walletMock
                .Setup(s => s.DeleteWalletAsync(walletId, _userId))
                .ReturnsAsync(true);

            var result = await _controller.DeleteWallet(walletId);

            result.Should().BeOfType<NoContentResult>()
                  .Which.StatusCode.Should().Be(204);
        }

        [Fact]
        public async Task DeleteWallet_NonExistentWallet_Returns404()
        {
            _walletMock
                .Setup(s => s.DeleteWalletAsync(It.IsAny<Guid>(), _userId))
                .ReturnsAsync(false);

            var result = await _controller.DeleteWallet(Guid.NewGuid());

            result.Should().BeOfType<NotFoundObjectResult>()
                  .Which.StatusCode.Should().Be(404);
        }

        [Fact]
        public async Task DeleteWallet_ConcurrencyConflict_Returns409Conflict()
        {
            _walletMock
                .Setup(s => s.DeleteWalletAsync(It.IsAny<Guid>(), _userId))
                .ThrowsAsync(new InvalidOperationException("Wallet was modified by another request. Please retry."));

            var result = await _controller.DeleteWallet(Guid.NewGuid());

            result.Should().BeOfType<ConflictObjectResult>()
                  .Which.StatusCode.Should().Be(409);
        }
    }
}
