import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getStoredToken } from "../api/client";
import { useAuth } from "./useAuth";

export type SocketContextValue = {
  socket: Socket | null;
  isConnected: boolean;
};

export const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user === null) {
      setIsConnected(false);
      setSocket(null);
      return;
    }

    const token = getStoredToken();
    if (token === null) {
      return;
    }

    const socketInstance = io({
      path: "/socket.io",
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    const handleConnect = () => {
      socketInstance.emit("authenticate", { token });
    };

    const handleAuthenticated = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socketInstance.on("connect", handleConnect);
    socketInstance.on("authenticated", handleAuthenticated);
    socketInstance.on("disconnect", handleDisconnect);

    setSocket(socketInstance);

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("authenticated", handleAuthenticated);
      socketInstance.off("disconnect", handleDisconnect);
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
    }),
    [socket, isConnected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
