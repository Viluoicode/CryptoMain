// Base URL for the C# backend API.
// Override via VITE_API_BASE_URL env variable (e.g. in .env.local).
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://localhost:44386';
