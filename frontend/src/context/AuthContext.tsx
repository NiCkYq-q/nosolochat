import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser, login as loginRequest, register as registerRequest, type AuthUser } from "../api/auth";
import { ApiError, clearStoredToken, getStoredToken, setStoredToken } from "../api/client";

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const applyAuth = useCallback((authUser: AuthUser, token: string) => {
    setStoredToken(token);
    setUser(authUser);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginRequest(username, password);
      applyAuth(result.user, result.token);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const result = await registerRequest(username, email, password);
      applyAuth(result.user, result.token);
    },
    [applyAuth]
  );

  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken();
      if (token === null) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
          clearStoredToken();
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
