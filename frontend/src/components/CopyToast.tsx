import { useEffect, useState } from "react";

type CopyToastProps = {
  isVisible: boolean;
};

export default function CopyToast({ isVisible }: CopyToastProps) {
  const [isRendered, setIsRendered] = useState(isVisible);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      setIsHiding(false);
      return;
    }

    if (!isRendered) {
      return;
    }

    setIsHiding(true);
    const timeoutId = window.setTimeout(() => {
      setIsRendered(false);
      setIsHiding(false);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isVisible, isRendered]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      className={`copy-toast${isHiding ? " copy-toast--hide" : " copy-toast--show"}`}
      role="status"
      aria-live="polite"
    >
      Скопировано
    </div>
  );
}
