import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, type LoginRequest, type RegisterRequest } from '../api/authApi';
import { TOKEN_KEY, USER_KEY } from '../api/apiClient';

interface AuthUser {
  username: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    try {
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const persistAuth = useCallback((accessToken: string, authUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setToken(accessToken);
    setUser(authUser);
  }, []);

  const login = useCallback(
    async (data: LoginRequest) => {
      const response = await authApi.login(data);
      persistAuth(response.accessToken, { username: response.username, email: response.email });
    },
    [persistAuth],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const response = await authApi.register(data);
      persistAuth(response.accessToken, { username: response.username, email: response.email });
    },
    [persistAuth],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
