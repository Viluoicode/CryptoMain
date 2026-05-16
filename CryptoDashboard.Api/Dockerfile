# syntax=docker/dockerfile:1
# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files first to leverage Docker layer cache
COPY CryptoDashboard.Domain/CryptoDashboard.Domain.csproj             CryptoDashboard.Domain/
COPY CryptoDashboard.Application/CryptoDashboard.Application.csproj   CryptoDashboard.Application/
COPY CryptoDashboard.Infrastructure/CryptoDashboard.Infrastructure.csproj CryptoDashboard.Infrastructure/
COPY CryptoDashboard.Api/CryptoDashboard.Api.csproj                    CryptoDashboard.Api/
RUN dotnet restore CryptoDashboard.Api/CryptoDashboard.Api.csproj

# Copy the rest and publish
COPY CryptoDashboard.Domain         CryptoDashboard.Domain
COPY CryptoDashboard.Application    CryptoDashboard.Application
COPY CryptoDashboard.Infrastructure CryptoDashboard.Infrastructure
COPY CryptoDashboard.Api            CryptoDashboard.Api

RUN dotnet publish CryptoDashboard.Api/CryptoDashboard.Api.csproj \
    -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Non-root user for security
RUN groupadd -r app && useradd -r -g app app
COPY --from=build --chown=app:app /app/publish .

USER app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8080/health/live || exit 1

ENTRYPOINT ["dotnet", "CryptoDashboard.Api.dll"]
