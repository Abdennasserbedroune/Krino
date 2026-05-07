/**
 * Shared TTS — Groq Orpheus v1 (primary) → browser SpeechSynthesis (last resort)
 * Uses the same GROQ_API_KEY as the LLM calls. No cold starts. No HuggingFace dependency.
 * Orpheus supports inline emotion tags: [cheerful] [thoughtful] [serious] [professional]
 */
import Groq from "groq-sdk";

export interface TtsResult {
  audio_b64: string | null;
  mime:            string;
  use_browser_tts: boolean;
  speak_text:      string;
}

/**
 * Strip Orpheus emotion tags before sending to browser TTS fallback.
 * Tags like [cheerful] break SpeechSynthesis but are valid for Orpheus.
 */
function stripEmotionTags(text: string): string {
  return text.replace(/\[\w+\]/g, "").replace(/\s+/g, " ").trim();
}

export async function synthesiseWithFallback(
  text: string,
  voice: string = "diana",
): Promise<TtsResult> {
  const key        = process.env.GROQ_API_KEY;
  const speak_text = text.trim();

  if (key && speak_text) {
    try {
      const groq = new Groq({ apiKey: key });
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 15_000);

      const response = await groq.audio.speech.create(
        {
          model:           "playai-tts",
          input:           speak_text,
          voice:           `${voice}-playai`,
          response_format: "wav",
        } as Parameters<typeof groq.audio.speech.create>[0],
      );
      clearTimeout(tid);

      const buf = await response.arrayBuffer();
      if (buf.byteLength > 0) {
        return {
          audio_b64:       Buffer.from(buf).toString("base64"),
          mime:            "audio/wav",
          use_browser_tts: false,
          speak_text,
        };
      }
    } catch (err) {
      console.error("[tts] Groq Orpheus failed:", err instanceof Error ? err.message : err);
    }
  }

  // Last resort — browser TTS. Strips emotion tags so they aren't spoken aloud.
  return {
    audio_b64:       null,
    mime:            "audio/wav",
    use_browser_tts: true,
    speak_text:      stripEmotionTags(speak_text),
  };
}
