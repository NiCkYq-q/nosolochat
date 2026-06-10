import { useContext } from "react";
import { ChatNotificationContext } from "./ChatNotificationContext";

export function useChatNotifications() {
  const context = useContext(ChatNotificationContext);
  if (context === null) {
    throw new Error("useChatNotifications must be used within ChatNotificationProvider");
  }
  return context;
}
