import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Message } from "../api/messages";
import { formatFloatingDate, getLocalDateKey } from "../utils/formatTime";
import MessageItem from "./MessageItem";

type MessageListProps = {
  chatId: number;
  messages: Message[];
  currentUserId: number;
  isLoading: boolean;
  isGroup?: boolean;
  selectedReplyIds?: Set<number>;
  onToggleReply?: (message: Message) => void;
  onInitialScrollComplete?: () => void;
  onMessageCopied?: () => void;
};

type MessageGroup = {
  dateKey: string;
  dateLabel: string;
  messages: Message[];
};

function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const dateKey = getLocalDateKey(message.createdAt);
    const lastGroup = groups.at(-1);

    if (lastGroup !== undefined && lastGroup.dateKey === dateKey) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        dateKey,
        dateLabel: formatFloatingDate(message.createdAt),
        messages: [message],
      });
    }
  }

  return groups;
}

function scrollToBottom(list: HTMLDivElement): void {
  list.scrollTop = list.scrollHeight;
}

function isAtBottom(list: HTMLDivElement): boolean {
  return list.scrollHeight - list.scrollTop - list.clientHeight < 24;
}

export default function MessageList({
  chatId,
  messages,
  currentUserId,
  isLoading,
  isGroup = false,
  selectedReplyIds,
  onToggleReply,
  onInitialScrollComplete,
  onMessageCopied,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDone = useRef(false);
  const previousChatId = useRef(chatId);
  const previousMessageCount = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const [floatingVisible, setFloatingVisible] = useState(false);
  const [floatingHiding, setFloatingHiding] = useState(false);

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  const firstUnreadMessageId = useMemo(() => {
    const firstUnread = messages.find(
      (message) => message.senderId !== currentUserId && message.isRead === false
    );
    return firstUnread?.id ?? null;
  }, [messages, currentUserId]);

  const updateFloatingDateFromScroll = useCallback(() => {
    const list = listRef.current;
    if (list === null) {
      return;
    }

    const anchors = list.querySelectorAll<HTMLElement>(".message-date-anchor");
    if (anchors.length === 0) {
      return;
    }

    const listTop = list.getBoundingClientRect().top + 12;
    let activeLabel = anchors[0].dataset.dateLabel ?? null;

    for (const anchor of anchors) {
      if (anchor.getBoundingClientRect().top <= listTop) {
        activeLabel = anchor.dataset.dateLabel ?? activeLabel;
      }
    }

    if (activeLabel !== null && activeLabel !== "") {
      setFloatingDate(activeLabel);
    }
  }, []);

  const scheduleHideAtBottom = useCallback(() => {
    const list = listRef.current;
    if (list === null) {
      return;
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      if (listRef.current !== null && isAtBottom(listRef.current)) {
        setFloatingHiding(true);
        window.setTimeout(() => {
          setFloatingVisible(false);
          setFloatingHiding(false);
        }, 300);
      }
    }, 2000);
  }, []);

  const handleScroll = useCallback(() => {
    const list = listRef.current;
    if (list === null) {
      return;
    }

    updateFloatingDateFromScroll();

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isAtBottom(list)) {
      scheduleHideAtBottom();
      return;
    }

    setFloatingHiding(false);
    setFloatingVisible(true);
  }, [scheduleHideAtBottom, updateFloatingDateFromScroll]);

  useLayoutEffect(() => {
    if (previousChatId.current !== chatId) {
      initialScrollDone.current = false;
      previousChatId.current = chatId;
      previousMessageCount.current = 0;
      setFloatingVisible(false);
      setFloatingHiding(false);
      setFloatingDate(null);
    }
  }, [chatId]);

  useLayoutEffect(() => {
    if (isLoading) {
      return;
    }

    const list = listRef.current;
    if (list === null) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (!initialScrollDone.current) {
        if (messages.length === 0) {
          initialScrollDone.current = true;
          onInitialScrollComplete?.();
          return;
        }

        if (firstUnreadMessageId !== null) {
          const unreadElement = list.querySelector(
            `[data-message-id="${String(firstUnreadMessageId)}"]`
          );
          if (unreadElement instanceof HTMLElement) {
            unreadElement.scrollIntoView({ block: "start" });
          } else {
            scrollToBottom(list);
          }
        } else {
          scrollToBottom(list);
        }

        initialScrollDone.current = true;
        onInitialScrollComplete?.();
        previousMessageCount.current = messages.length;
        updateFloatingDateFromScroll();
        scheduleHideAtBottom();
        return;
      }

      if (messages.length > previousMessageCount.current) {
        scrollToBottom(list);
        scheduleHideAtBottom();
      }

      previousMessageCount.current = messages.length;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    chatId,
    firstUnreadMessageId,
    isLoading,
    messages,
    onInitialScrollComplete,
    scheduleHideAtBottom,
    updateFloatingDateFromScroll,
  ]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list === null || isLoading || messages.length === 0) {
      return;
    }

    const anchors = list.querySelectorAll<HTMLElement>(".message-date-anchor");
    const observer = new IntersectionObserver(
      () => {
        updateFloatingDateFromScroll();
      },
      {
        root: list,
        threshold: [0, 0.01, 1],
      }
    );

    anchors.forEach((anchor) => {
      observer.observe(anchor);
    });

    return () => {
      observer.disconnect();
    };
  }, [isLoading, messageGroups, messages.length, updateFloatingDateFromScroll]);

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
    <div className="message-list-container">
      {floatingVisible && floatingDate !== null && (
        <div
          className={`message-floating-date${floatingHiding ? " message-floating-date--hide" : " message-floating-date--show"}`}
          aria-live="polite"
        >
          {floatingDate}
        </div>
      )}

      <div ref={listRef} className="message-list" onScroll={handleScroll}>
        {messageGroups.map((group) => (
          <Fragment key={group.dateKey}>
            <div
              className="message-date-anchor"
              data-date-label={group.dateLabel}
              aria-hidden="true"
            />
            {group.messages.map((message) => (
              <Fragment key={message.id}>
                {message.id === firstUnreadMessageId && (
                  <div className="message-unread-divider" role="separator">
                    <span>Непрочитанные сообщения</span>
                  </div>
                )}
                <MessageItem
                  message={message}
                  isOwn={message.senderId === currentUserId}
                  showSender={isGroup}
                  isSelectedForReply={selectedReplyIds?.has(message.id) === true}
                  onToggleReply={onToggleReply}
                  onCopied={onMessageCopied}
                />
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
