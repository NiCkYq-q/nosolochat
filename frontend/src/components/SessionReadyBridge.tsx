import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSocket } from "../context/useSocket";
import {
  resetNotificationSessionReady,
  setNotificationSessionReady,
} from "../utils/sessionReady";

export default function SessionReadyBridge() {
  const { isConnected } = useSocket();
  const location = useLocation();
  const isChatRoute = /^\/chats\/\d+$/.test(location.pathname);

  useEffect(() => {
    if (!isConnected) {
      resetNotificationSessionReady();
      return;
    }

    if (!isChatRoute) {
      setNotificationSessionReady(true);
    }
  }, [isConnected, isChatRoute]);

  return null;
}
