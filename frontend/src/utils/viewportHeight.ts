function updateViewportHeight(): void {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--vh", `${String(height * 0.01)}px`);
}

export function initViewportHeight(): () => void {
  updateViewportHeight();

  window.addEventListener("resize", updateViewportHeight);
  window.visualViewport?.addEventListener("resize", updateViewportHeight);
  window.visualViewport?.addEventListener("scroll", updateViewportHeight);

  return () => {
    window.removeEventListener("resize", updateViewportHeight);
    window.visualViewport?.removeEventListener("resize", updateViewportHeight);
    window.visualViewport?.removeEventListener("scroll", updateViewportHeight);
  };
}
