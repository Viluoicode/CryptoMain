using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CryptoDashboard.Application.DTOs.OnChain;
using CryptoDashboard.Application.Interfaces;
using CryptoDashboard.Application.Options;
using CryptoDashboard.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CryptoDashboard.Infrastructure.Services
{
    public class OnChainWalletService : IOnChainWalletService
    {
        private readonly IApplicationDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly AlchemyOptions _alchemyOptions;

        private static readonly JsonSerializerOptions _jsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public OnChainWalletService(
            IApplicationDbContext context,
            IHttpClientFactory httpClientFactory,
            IOptions<AlchemyOptions> alchemyOptions)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient("Alchemy");
            _alchemyOptions = alchemyOptions.Value;
        }

        public async Task<OnChainWalletResponse> AddWalletAsync(Guid userId, AddOnChainWalletRequest request)
        {
            var address = request.Address.ToLowerInvariant();

            var exists = await _context.OnChainWallets
                .AnyAsync(w => w.UserId == userId && w.Address == address);
            if (exists)
                throw new InvalidOperationException("Wallet address already tracked");

            var wallet = new OnChainWallet
            {
                UserId = userId,
                Address = address,
                Label = request.Label,
                Chain = request.Chain.ToLowerInvariant(),
                NativeSymbol = GetNativeSymbol(request.Chain),
                CreatedAt = DateTime.UtcNow,
            };

            _context.OnChainWallets.Add(wallet);
            await _context.SaveChangesAsync();

            // Sync immediately after adding
            return await SyncAndMapAsync(wallet);
        }

        public async Task<List<OnChainWalletResponse>> GetUserWalletsAsync(Guid userId)
        {
            var wallets = await _context.OnChainWallets
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

            return wallets.Select(MapToResponse).ToList();
        }

        public async Task<OnChainWalletResponse> SyncWalletAsync(Guid walletId, Guid userId)
        {
            var wallet = await _context.OnChainWallets
                .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId)
                ?? throw new KeyNotFoundException("On-chain wallet not found");

            return await SyncAndMapAsync(wallet);
        }

        public async Task<bool> RemoveWalletAsync(Guid walletId, Guid userId)
        {
            var wallet = await _context.OnChainWallets
                .FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == userId);
            if (wallet == null) return false;

            _context.OnChainWallets.Remove(wallet);
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Alchemy RPC calls ─────────────────────────────────────────────────

        private async Task<OnChainWalletResponse> SyncAndMapAsync(OnChainWallet wallet)
        {
            try
            {
                var baseUrl = $"{_alchemyOptions.BaseUrl}/{_alchemyOptions.ApiKey}";

                wallet.NativeBalance = await GetNativeBalanceAsync(baseUrl, wallet.Address, wallet.Chain);
                var tokens = await GetTokenBalancesAsync(baseUrl, wallet.Address);
                wallet.TokensJson = JsonSerializer.Serialize(tokens, _jsonOpts);
                wallet.LastSyncedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
            }
            catch
            {
                // Sync failure is non-fatal — return stale data
            }

            return MapToResponse(wallet);
        }

        private async Task<decimal> GetNativeBalanceAsync(string baseUrl, string address, string chain)
        {
            var rpcUrl = GetRpcUrl(chain);
            var payload = new
            {
                jsonrpc = "2.0",
                method = "eth_getBalance",
                @params = new[] { address, "latest" },
                id = 1
            };

            var response = await _httpClient.PostAsJsonAsync(rpcUrl, payload);
            if (!response.IsSuccessStatusCode) return 0;

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("result", out var result)) return 0;

            var hex = result.GetString() ?? "0x0";
            var wei = Convert.ToInt64(hex, 16);
            return (decimal)wei / 1_000_000_000_000_000_000m; // wei → ETH
        }

        private async Task<List<TokenBalance>> GetTokenBalancesAsync(string baseUrl, string address)
        {
            var payload = new
            {
                jsonrpc = "2.0",
                method = "alchemy_getTokenBalances",
                @params = new object[] { address, "erc20" },
                id = 2
            };

            var response = await _httpClient.PostAsJsonAsync($"{_alchemyOptions.BaseUrl}/{_alchemyOptions.ApiKey}", payload);
            if (!response.IsSuccessStatusCode) return new();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("result", out var result)) return new();
            if (!result.TryGetProperty("tokenBalances", out var balancesEl)) return new();

            var tokens = new List<TokenBalance>();
            foreach (var item in balancesEl.EnumerateArray())
            {
                if (!item.TryGetProperty("contractAddress", out var addrEl)) continue;
                if (!item.TryGetProperty("tokenBalance", out var balEl)) continue;

                var contractAddr = addrEl.GetString() ?? string.Empty;
                var balHex = balEl.GetString() ?? "0x0";

                if (balHex == "0x0000000000000000000000000000000000000000000000000000000000000000")
                    continue;

                try
                {
                    // Balance is in raw token units — we store as-is; divide by decimals on client
                    var raw = Convert.ToDecimal(Convert.ToInt64(balHex, 16));
                    if (raw <= 0) continue;

                    tokens.Add(new TokenBalance
                    {
                        ContractAddress = contractAddr,
                        Balance = raw / (decimal)Math.Pow(10, 18),
                    });
                }
                catch { /* skip malformed */ }
            }
            return tokens;
        }

        private string GetRpcUrl(string chain) => chain.ToLowerInvariant() switch
        {
            "polygon" => $"https://polygon-mainnet.g.alchemy.com/v2/{_alchemyOptions.ApiKey}",
            "bsc"     => $"https://bnb-mainnet.g.alchemy.com/v2/{_alchemyOptions.ApiKey}",
            "arbitrum"=> $"https://arb-mainnet.g.alchemy.com/v2/{_alchemyOptions.ApiKey}",
            _         => $"{_alchemyOptions.BaseUrl}/{_alchemyOptions.ApiKey}",
        };

        private static string GetNativeSymbol(string chain) => chain.ToLowerInvariant() switch
        {
            "polygon"  => "MATIC",
            "bsc"      => "BNB",
            "arbitrum" => "ETH",
            _          => "ETH",
        };

        private static OnChainWalletResponse MapToResponse(OnChainWallet w)
        {
            List<TokenBalance> tokens = new();
            if (w.TokensJson is not null)
            {
                try { tokens = JsonSerializer.Deserialize<List<TokenBalance>>(w.TokensJson) ?? new(); }
                catch { /* ignore */ }
            }

            return new OnChainWalletResponse
            {
                Id = w.Id,
                Address = w.Address,
                Label = w.Label,
                Chain = w.Chain,
                NativeBalance = w.NativeBalance,
                NativeSymbol = w.NativeSymbol,
                Tokens = tokens,
                CreatedAt = w.CreatedAt,
                LastSyncedAt = w.LastSyncedAt,
            };
        }
    }
}
