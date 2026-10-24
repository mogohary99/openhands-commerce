"use client";

import { useEffect, useRef, useState } from "react";
import { announce } from "./announce";

// Optional push-to-talk. Only rendered where the browser supports speech recognition;
// typing is always available. Speech fills the text box and never submits by itself.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function VoiceInput({ targetId }: { targetId: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      const box = document.getElementById(targetId) as HTMLTextAreaElement | null;
      if (box && text) {
        box.value = box.value ? `${box.value.trim()} ${text}` : text;
        box.focus();
        announce(`Heard: ${text}. Check the text, then press Find options.`);
      }
    };
    r.onerror = (e) => {
      announce(e.error === "not-allowed" ? "Microphone access was blocked. You can type instead." : "I didn't catch that. You can try again or type instead.");
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setSupported(true);
    return () => r.stop();
  }, [targetId]);

  if (!supported) return null;
  return (
    <button
      type="button"
      className="btn btn-secondary voice-btn"
      onClick={() => {
        if (!rec.current) return;
        if (listening) {
          rec.current.stop();
          setListening(false);
          return;
        }
        try {
          rec.current.start();
          setListening(true);
          announce("Listening. Speak now, then press the button again to stop.");
        } catch {
          announce("Voice input isn't available right now. You can type instead.");
        }
      }}
    >
      {listening ? <span className="pulse" aria-hidden="true" /> : <MicIcon />}
      {listening ? "Stop listening" : "Speak instead"}
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}
