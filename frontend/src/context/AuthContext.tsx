import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser, login as loginRequest, register as registerRequest, type AuthUser } from "../api/auth";
import { fetchChats, type ChatListItem } from "../api/chats";
import { ApiError, clearStoredToken, getStoredToken, setStoredToken } from "../api/client";

export type AuthContextValue = {
  user: AuthUser | null;
  isAppReady: boolean;
  initialChats: ChatListItem[] | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function loadInitialChats(): Promise<ChatListItem[]> {
  try {
    return await fetchChats();
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [initialChats, setInitialChats] = useState<ChatListItem[] | null>(null);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setInitialChats(null);
  }, []);

  const applyAuth = useCallback((authUser: AuthUser, token: string) => {
    setStoredToken(token);
    setUser(authUser);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginRequest(username, password);
      applyAuth(result.user, result.token);
      const chats = await loadInitialChats();
      setInitialChats(chats);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const result = await registerRequest(username, email, password);
      applyAuth(result.user, result.token);
      const chats = await loadInitialChats();
      setInitialChats(chats);
    },
    [applyAuth]
  );

  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken();
      if (token === null) {
        setIsAppReady(true);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
        const chats = await loadInitialChats();
        setInitialChats(chats);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
          clearStoredToken();
        }
        setUser(null);
        setInitialChats(null);
      } finally {
        setIsAppReady(true);
      }
    };

    void restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAppReady,
      initialChats,
      login,
      register,
      logout,
    }),
    [user, isAppReady, initialChats, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
