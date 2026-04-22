/**
 * Ambient-audio toggle.
 *
 * Browsers block autoplay with sound, so audio is strictly user-gated — the
 * button starts silent and only plays after an explicit click. Preference is
 * persisted in localStorage so a returning visitor isn't re-asked.
 *
 * The actual audio file is served from /assets/audio/. Keep the clip short
 * (< 30s) and loopable; Howler seamlessly handles the loop.
 */
import { Howl } from "howler";
import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
}

const STORAGE_KEY = "bleiche-site-audio-on";

export default function AudioToggle({ src }: Props) {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const howlRef = useRef<Howl | null>(null);

  useEffect(() => {
    // Lazy-construct so we don't download the audio until needed.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "on") setOn(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (on && !howlRef.current) {
      howlRef.current = new Howl({
        src: [src],
        loop: true,
        volume: 0.25,
        html5: true, // stream rather than preload into memory
      });
    }
    if (on) {
      howlRef.current?.play();
    } else {
      howlRef.current?.pause();
    }
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  }, [on, ready, src]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-label={on ? "Ambiente-Ton aus" : "Ambiente-Ton an"}
      aria-pressed={on}
      className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-ink-500/80 backdrop-blur text-white hover:bg-ink-500 transition-colors flex items-center justify-center shadow-lg"
    >
      {on ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 5L6 9H2v6h4l5 4zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
