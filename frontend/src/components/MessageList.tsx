import { useEffect, useRef } from "react";
import type { Message } from "../api/messages";
import MessageItem from "./MessageItem";

type MessageListProps = {
  messages: Message[];
  currentUserId: number;
  isLoading: boolean;
  isGroup?: boolean;
  selectedReplyIds?: Set<number>;
  onToggleReply?: (message: Message) => void;
};

export default function MessageList({
  messages,
  currentUserId,
  isLoading,
  isGroup = false,
  selectedReplyIds,
  onToggleReply,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list === null) {
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  if (isLoading) {
    return (
      <div ref={listRef} className="message-list message-list-loading" aria-busy="true">
        <div className="skeleton-row message-skeleton" />
        <div className="skeleton-row message-skeleton" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div ref={listRef} className="message-list message-list-empty">
        <p>Начните общение</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="message-list">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwn={message.senderId === currentUserId}
          showSender={isGroup}
          isSelectedForReply={selectedReplyIds?.has(message.id) === true}
          onToggleReply={onToggleReply}
        />
      ))}
    </div>
  );
}
