import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import type { Message, ReplyPreview } from "../api/messages";
import { getReplyPreviewText } from "../api/messages";
import { formatMessageTime } from "../utils/formatTime";
import ImageLightbox from "./ImageLightbox";
import MessageContextMenu from "./MessageContextMenu";

type MessageItemProps = {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  isSelectedForReply?: boolean;
  onToggleReply?: (message: Message) => void;
  onCopied?: () => void;
};

function MessageReadStatus({ readByOthers }: { readByOthers: boolean }) {
  return (
    <span
      className={`message-read-status ${readByOthers ? "message-read-status--read" : "message-read-status--sent"}`}
      aria-label={readByOthers ? "Прочитано" : "Отправлено"}
    >
      {readByOthers ? "✓✓" : "✓"}
    </span>
  );
}

export default function MessageItem({
  message,
  isOwn,
  showSender = false,
  isSelectedForReply = false,
  onToggleReply,
  onCopied,
}: MessageItemProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const replyTargets = message.replyTo ?? [];
  const canCopy = message.content !== null && message.content !== "";

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openContextMenu = (x: number, y: number) => {
    if (!canCopy) {
      return;
    }

    setContextMenu({ x, y });
  };

  const handleCopy = async () => {
    if (message.content === null || message.content === "") {
      return;
    }

    try {
      await navigator.clipboard.writeText(message.content);
      onCopied?.();
    } catch {
      // Clipboard access may be denied in some browsers.
    }
  };

  const handleToggleReply = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    onToggleReply?.(message);
  };

  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!canCopy) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openContextMenu(event.clientX, event.clientY);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!canCopy) {
      return;
    }

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    const touch = event.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      openContextMenu(clientX, clientY);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
  };

  const handleTouchMove = () => {
    clearLongPressTimer();
  };

  return (
    <>
      <article
        data-message-id={message.id}
        className={`message-item ${isOwn ? "message-item-outgoing" : "message-item-incoming"}${onToggleReply !== undefined ? " message-item-replyable" : ""}${isSelectedForReply ? " message-item-selected" : ""}`}
        onClick={onToggleReply !== undefined ? handleToggleReply : undefined}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onKeyDown={
          onToggleReply !== undefined
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleToggleReply();
                }
              }
            : undefined
        }
        role={onToggleReply !== undefined ? "button" : undefined}
        tabIndex={onToggleReply !== undefined ? 0 : undefined}
        aria-pressed={onToggleReply !== undefined ? isSelectedForReply : undefined}
        aria-label={
          onToggleReply !== undefined
            ? isSelectedForReply
              ? "Снять выделение для ответа"
              : "Выбрать для ответа"
            : undefined
        }
      >
        {isSelectedForReply && (
          <span className="message-selected-badge" aria-hidden="true">
            ✓
          </span>
        )}

        {showSender && message.senderUsername !== undefined && !isOwn && (
          <p className="message-sender">{message.senderUsername}</p>
        )}

        {replyTargets.length > 0 && (
          <div className="message-replies">
            {replyTargets.map((replyTo: ReplyPreview) => (
              <div key={replyTo.id} className="message-reply">
                <p className="message-reply-author">{replyTo.senderUsername}</p>
                <p className="message-reply-text">{getReplyPreviewText(replyTo)}</p>
              </div>
            ))}
          </div>
        )}

        {message.imageUrl !== null && (
          <button
            type="button"
            className="message-image-button"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxUrl(message.imageUrl);
            }}
          >
            <img className="message-image" src={message.imageUrl} alt="Фото в сообщении" />
          </button>
        )}

        {message.content !== null && message.content !== "" && (
          <p className="message-content">{message.content}</p>
        )}

        <div className="message-meta">
          <time className="message-time" dateTime={message.createdAt}>
            {formatMessageTime(message.createdAt)}
          </time>
          {isOwn && <MessageReadStatus readByOthers={message.readByOthers === true} />}
        </div>
      </article>

      {contextMenu !== null && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onCopy={() => {
            void handleCopy();
          }}
          onClose={() => {
            setContextMenu(null);
          }}
        />
      )}

      {lightboxUrl !== null && (
        <ImageLightbox
          imageUrl={lightboxUrl}
          onClose={() => {
            setLightboxUrl(null);
          }}
        />
      )}
    </>
  );
}
