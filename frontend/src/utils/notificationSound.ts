const SOUND_URL = "/sounds/notification.wav";

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement {
  if (audio === null) {
    audio = new Audio(SOUND_URL);
    audio.volume = 0.45;
  }
  return audio;
}

export function unlockNotificationSound(): void {
  if (unlocked) {
    return;
  }

  unlocked = true;
  const clip = getAudio();
  clip.load();
  void clip.play()
    .then(() => {
      clip.pause();
      clip.currentTime = 0;
    })
    .catch(() => {
      // Autoplay may still be blocked until a real notification; ignore.
    });
}

export function playNotificationSound(): void {
  if (!unlocked) {
    return;
  }

  const clip = getAudio();
  clip.currentTime = 0;
  void clip.play().catch(() => {
    // Ignore if browser blocks playback.
  });
}

if (typeof window !== "undefined") {
  const unlock = () => {
    unlockNotificationSound();
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}
