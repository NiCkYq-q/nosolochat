type TypingIndicatorProps = {
  text: string | null;
};

export default function TypingIndicator({ text }: TypingIndicatorProps) {
  const isVisible = text !== null && text !== "";

  return (
    <div
      className={`typing-indicator${isVisible ? " typing-indicator--visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!isVisible}
    >
      {isVisible && (
        <>
          <span className="typing-indicator-text">{text}</span>
          <span className="typing-indicator-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </>
      )}
    </div>
  );
}
