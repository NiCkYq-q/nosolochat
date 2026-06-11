import { useEffect, useLayoutEffect, useRef } from "react";

type MessageContextMenuProps = {
  x: number;
  y: number;
  onCopy: () => void;
  onClose: () => void;
};

const MENU_WIDTH = 168;
const MENU_HEIGHT = 44;

export default function MessageContextMenu({
  x,
  y,
  onCopy,
  onClose,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (menu === null) {
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.min(Math.max(8, x), viewportWidth - MENU_WIDTH - 8);
    const top = Math.min(Math.max(8, y), viewportHeight - MENU_HEIGHT - 8);

    menu.style.left = `${String(left)}px`;
    menu.style.top = `${String(top)}px`;
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu !== null && event.target instanceof Node && menu.contains(event.target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={menuRef} className="message-context-menu" role="menu">
      <button
        type="button"
        className="message-context-menu-item"
        role="menuitem"
        onClick={() => {
          onCopy();
          onClose();
        }}
      >
        <span className="message-context-menu-icon" aria-hidden="true">📋</span>
        Копировать
      </button>
    </div>
  );
}
