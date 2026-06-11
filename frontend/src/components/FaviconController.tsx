import { useEffect, useState } from "react";
import { fetchChats } from "../api/chats";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/useSocket";

function sumUnreadCount(chats: Array<{ unreadCount: number }>): number {
  return chats.reduce((total, chat) => total + chat.unreadCount, 0);
}

export default function FaviconController() {
  const { user, initialChats } = useAuth();
  const { socket } = useSocket();
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (user === null) {
      setTotalUnread(0);
      return;
    }

    if (initialChats !== null) {
      setTotalUnread(sumUnreadCount(initialChats));
      return;
    }

    void fetchChats().then((chats) => {
      setTotalUnread(sumUnreadCount(chats));
    });
  }, [user, initialChats]);

  useEffect(() => {
    if (socket === null || user === null) {
      return;
    }

    const refreshUnreadTotal = () => {
      void fetchChats().then((chats) => {
        setTotalUnread(sumUnreadCount(chats));
      });
    };

    socket.on("chat:unread-updated", refreshUnreadTotal);
    socket.on("message:new", refreshUnreadTotal);

    return () => {
      socket.off("chat:unread-updated", refreshUnreadTotal);
      socket.off("message:new", refreshUnreadTotal);
    };
  }, [socket, user]);

  useEffect(() => {
    const iconLink = document.querySelector<HTMLLinkElement>("link[data-favicon='default']");
    const hasUnread = totalUnread > 0;
    document.title = hasUnread ? `(${String(totalUnread)}) NoSoloChat` : "NoSoloChat";

    if (iconLink !== null) {
      iconLink.href = hasUnread ? "/favicon-unread.ico" : "/favicon.ico";
    }
  }, [totalUnread]);

  return null;
}
