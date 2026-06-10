import { Link } from "react-router-dom";
import type { ChatListItem as ChatListItemType } from "../api/chats";
import { formatMessageTime } from "../utils/formatTime";
import { getInitials } from "../utils/initials";

type ChatListItemProps = {
  chat: ChatListItemType;
};

export default function ChatListItem({ chat }: ChatListItemProps) {
  const preview = chat.lastMessage ?? "Нет сообщений";

  return (
    <Link to={`/chats/${String(chat.id)}`} className="chat-item-link">
    <article className="chat-item">
      <div className="chat-avatar" aria-hidden="true">
        {getInitials(chat.name)}
      </div>

      <div className="chat-item-body">
        <div className="chat-item-top">
          <h3 className="chat-item-name">{chat.name}</h3>
          <time className="chat-item-time" dateTime={chat.lastMessageAt ?? undefined}>
            {formatMessageTime(chat.lastMessageAt)}
          </time>
        </div>

        <div className="chat-item-bottom">
          <p className="chat-item-preview">{preview}</p>
          {chat.unreadCount > 0 && (
            <span className="chat-unread-badge" aria-label={`Непрочитанных: ${String(chat.unreadCount)}`}>
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>

      {chat.type === "private" && chat.isOnline && <span className="chat-online-dot" title="В сети" />}
    </article>
    </Link>
  );
}
