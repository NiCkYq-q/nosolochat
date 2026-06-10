import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchChats } from "../api/chats";
import { useAuth } from "./useAuth";
import { useSocket } from "./useSocket";
import type { ChatCreatedPayload } from "../socket/events";

type ChatNotificationEntry = {
  name: string;
  type: "private" | "group";
  notificationsEnabled: boolean;
};

export type ChatNotificationContextValue = {
  isNotificationsEnabled: (chatId: number) => boolean;
  getChatName: (chatId: number) => string | null;
  getChatType: (chatId: number) => "private" | "group" | null;
  setNotificationsEnabled: (chatId: number, enabled: boolean) => void;
  registerChat: (
    chatId: number,
    name: string,
    notificationsEnabled?: boolean,
    type?: "private" | "group"
  ) => void;
};

export const ChatNotificationContext = createContext<ChatNotificationContextValue | null>(null);

export function ChatNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [settings, setSettings] = useState<Map<number, ChatNotificationEntry>>(new Map());

  const loadSettings = useCallback(async () => {
    if (user === null) {
      setSettings(new Map());
      return;
    }

    const chats = await fetchChats();
    setSettings(
      new Map(
        chats.map((chat) => [
          chat.id,
          {
            name: chat.name,
            type: chat.type,
            notificationsEnabled: chat.notificationsEnabled,
          },
        ])
      )
    );
  }, [user]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (socket === null) {
      return;
    }

    const handleChatCreated = (payload: ChatCreatedPayload) => {
      setSettings((current) => {
        const next = new Map(current);
        const existing = next.get(payload.id);
        next.set(payload.id, {
          name: payload.name,
          type: payload.type,
          notificationsEnabled: existing?.notificationsEnabled ?? true,
        });
        return next;
      });
    };

    socket.on("chat:created", handleChatCreated);

    return () => {
      socket.off("chat:created", handleChatCreated);
    };
  }, [socket]);

  const isNotificationsEnabled = useCallback(
    (chatId: number) => settings.get(chatId)?.notificationsEnabled ?? true,
    [settings]
  );

  const getChatName = useCallback(
    (chatId: number) => settings.get(chatId)?.name ?? null,
    [settings]
  );

  const getChatType = useCallback(
    (chatId: number) => settings.get(chatId)?.type ?? null,
    [settings]
  );

  const setNotificationsEnabled = useCallback((chatId: number, enabled: boolean) => {
    setSettings((current) => {
      const next = new Map(current);
      const existing = next.get(chatId);
      if (existing !== undefined) {
        next.set(chatId, { ...existing, notificationsEnabled: enabled });
      }
      return next;
    });
  }, []);

  const registerChat = useCallback(
    (
      chatId: number,
      name: string,
      notificationsEnabled = true,
      type: "private" | "group" = "private"
    ) => {
      setSettings((current) => {
        const next = new Map(current);
        const existing = next.get(chatId);
        next.set(chatId, {
          name,
          type: existing?.type ?? type,
          notificationsEnabled,
        });
        return next;
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      isNotificationsEnabled,
      getChatName,
      getChatType,
      setNotificationsEnabled,
      registerChat,
    }),
    [isNotificationsEnabled, getChatName, getChatType, setNotificationsEnabled, registerChat]
  );

  return (
    <ChatNotificationContext.Provider value={value}>{children}</ChatNotificationContext.Provider>
  );
}
