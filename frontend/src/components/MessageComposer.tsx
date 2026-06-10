import { useRef, useState, type ChangeEvent, type SubmitEvent } from "react";
import type { Message } from "../api/messages";
import { getReplyPreviewText } from "../api/messages";

type MessageComposerProps = {
  disabled: boolean;
  replyToMessages: Message[];
  getAuthorName: (message: Message) => string;
  onRemoveReply: (messageId: number) => void;
  onCancelAllReplies: () => void;
  onSend: (content: string, replyToMessageIds?: number[]) => Promise<void>;
  onSendImage?: (file: File) => Promise<void>;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export default function MessageComposer({
  disabled,
  replyToMessages,
  getAuthorName,
  onRemoveReply,
  onCancelAllReplies,
  onSend,
  onSendImage,
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = content.trim().length > 0 && !disabled && !isSending;
  const hasReplies = replyToMessages.length > 0;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    const trimmed = content.trim();
    const replyToMessageIds =
      replyToMessages.length > 0 ? replyToMessages.map((message) => message.id) : undefined;
    setIsSending(true);
    setError(null);

    try {
      await onSend(trimmed, replyToMessageIds);
      setContent("");
      onCancelAllReplies();
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Не удалось отправить сообщение";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file === undefined || onSendImage === undefined) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError("Допустимы только изображения (JPEG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Файл слишком большой. Максимум 5 MB");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSendImage(file);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Не удалось отправить фото";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form className="message-composer" onSubmit={(event) => void handleSubmit(event)}>
      {hasReplies && (
        <div className="composer-reply-preview">
          <div className="composer-reply-preview-header">
            <p className="composer-reply-preview-title">
              Ответ на {String(replyToMessages.length)} сообщ.
            </p>
            <button type="button" className="link-button composer-reply-clear-all" onClick={onCancelAllReplies}>
              Снять всё
            </button>
          </div>
          <ul className="composer-reply-list">
            {replyToMessages.map((message) => (
              <li key={message.id} className="composer-reply-list-item">
                <div className="composer-reply-list-body">
                  <p className="composer-reply-preview-author">{getAuthorName(message)}</p>
                  <p className="composer-reply-preview-text">{getReplyPreviewText(message)}</p>
                </div>
                <button
                  type="button"
                  className="icon-button composer-reply-cancel"
                  aria-label="Убрать из ответа"
                  onClick={() => {
                    onRemoveReply(message.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error !== null && <p className="form-error composer-error">{error}</p>}
      <div className="composer-row">
        {onSendImage !== undefined && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="composer-file-input"
              hidden
              disabled={disabled || isSending}
              onChange={(event) => {
                void handleImageSelect(event);
              }}
            />
            <button
              type="button"
              className="secondary-button composer-attach-button"
              disabled={disabled || isSending}
              aria-label="Прикрепить фото"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              📷
            </button>
          </>
        )}
        <input
          type="text"
          className="composer-input"
          placeholder={hasReplies ? "Ответ..." : "Сообщение..."}
          value={content}
          maxLength={2000}
          disabled={disabled || isSending}
          onChange={(event) => {
            setContent(event.target.value);
          }}
        />
        <button type="submit" className="primary-button" disabled={!canSend} aria-label="Отправить">
          Отправить
        </button>
      </div>
    </form>
  );
}
