using CryptoDashboard.Application.DTOs.Position;

namespace CryptoDashboard.Application.Interfaces
{
    public interface IPositionService
    {
        Task<PositionResponse> OpenPositionAsync(Guid userId, OpenPositionRequest request);
        Task<List<PositionResponse>> GetUserPositionsAsync(Guid userId);
        Task<PositionResponse> ClosePositionAsync(Guid positionId, Guid userId);
    }
}
