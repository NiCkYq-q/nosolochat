import { useState } from "react";
import type { Message, ReplyPreview } from "../api/messages";
import { getReplyPreviewText } from "../api/messages";
import { formatMessageTime } from "../utils/formatTime";
import ImageLightbox from "./ImageLightbox";

type MessageItemProps = {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  isSelectedForReply?: boolean;
  onToggleReply?: (message: Message) => void;
};

export default function MessageItem({
  message,
  isOwn,
  showSender = false,
  isSelectedForReply = false,
  onToggleReply,
}: MessageItemProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const replyTargets = message.replyTo ?? [];

  const handleToggleReply = () => {
    onToggleReply?.(message);
  };

  return (
    <>
      <article
        className={`message-item ${isOwn ? "message-item-outgoing" : "message-item-incoming"}${onToggleReply !== undefined ? " message-item-replyable" : ""}${isSelectedForReply ? " message-item-selected" : ""}`}
        onClick={onToggleReply !== undefined ? handleToggleReply : undefined}
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

        <time className="message-time" dateTime={message.createdAt}>
          {formatMessageTime(message.createdAt)}
        </time>
      </article>

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
