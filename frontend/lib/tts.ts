/**
 * Shared TTS utility — Kokoro-82M → SpeechT5 fallback chain.
 * Used by both live/start and live/answer routes.
 */

export interface TtsResult {
  audio_b64: string | null;
  mime: string;
  use_browser_tts: boolean;
  speak_text: string;
}

async function tryKokoro(text: string, token: string): Promise<ArrayBuffer | null> {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(
      "https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text }),
        signal: ctrl.signal,
      },
    );
    clearTimeout(tid);
    if (res.status === 503) {
      let wait = 20;
      try { const j = await res.json(); if (typeof j.estimated_time === "number") wait = Math.ceil(j.estimated_time) + 2; } catch { /* */ }
      await new Promise(r => setTimeout(r, wait * 1_000));
      const ctrl2 = new AbortController();
      const tid2 = setTimeout(() => ctrl2.abort(), 15_000);
      const res2 = await fetch(
        "https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: text }),
          signal: ctrl2.signal,
        },
      );
      clearTimeout(tid2);
      if (!res2.ok) return null;
      return res2.arrayBuffer();
    }
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch { return null; }
}

async function trySpeechT5(text: string, token: string): Promise<ArrayBuffer | null> {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/speecht5_tts",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text }),
        signal: ctrl.signal,
      },
    );
    clearTimeout(tid);
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch { return null; }
}

export async function synthesiseWithFallback(text: string): Promise<TtsResult> {
  const token = process.env.HF_API_TOKEN;
  const speak_text = text.trim();

  if (token) {
    const buf = await tryKokoro(speak_text, token) ?? await trySpeechT5(speak_text, token);
    if (buf && buf.byteLength > 0) {
      return {
        audio_b64: Buffer.from(buf).toString("base64"),
        mime: "audio/wav",
        use_browser_tts: false,
        speak_text,
      };
    }
  }

  return { audio_b64: null, mime: "audio/wav", use_browser_tts: true, speak_text };
}
