/**
 * TTS chain: Orpheus (natural voice, emotion tags) → PlayAI → browser SpeechSynthesis
 * Uses GROQ_API_KEY for both Orpheus and PlayAI — no new env vars.
 *
 * Orpheus model:  canopylabs/orpheus-v1-english
 * Orpheus voices: tara | leah | leo | dan | mia | zac | jess
 * Orpheus tags:   [cheerful] [thoughtful] [serious] [professional] [laughs] [sighs]
 *
 * PlayAI model:   playai-tts
 * PlayAI voices:  Aria-PlayAI | Fritz-PlayAI | Celeste-PlayAI | Gail-PlayAI | Harry-PlayAI
 *                 Mamaw-PlayAI | Briggs-PlayAI | Calum-PlayAI | Deedee-PlayAI | Mikail-PlayAI
 */
import Groq from "groq-sdk";

export interface TtsResult {
  audio_b64:       string | null;
  mime:            string;
  use_browser_tts: boolean;
  speak_text:      string;
}

// Valid Orpheus voices — lowercase, no suffix
const ORPHEUS_VOICES = new Set(["tara","leah","leo","dan","mia","zac","jess"]);

// Valid PlayAI voices — must be exact case with -PlayAI suffix
const PLAYAI_VOICE_MAP: Record<string, string> = {
  aria:    "Aria-PlayAI",
  fritz:   "Fritz-PlayAI",
  celeste: "Celeste-PlayAI",
  gail:    "Gail-PlayAI",
  harry:   "Harry-PlayAI",
  mamaw:   "Mamaw-PlayAI",
  briggs:  "Briggs-PlayAI",
  calum:   "Calum-PlayAI",
  deedee:  "Deedee-PlayAI",
  mikail:  "Mikail-PlayAI",
};

function stripEmotionTags(text: string): string {
  return text.replace(/\[\w+\]/g, "").replace(/\s+/g, " ").trim();
}

async function tryOrpheus(text: string, groq: Groq, voice: string): Promise<ArrayBuffer | null> {
  const v = ORPHEUS_VOICES.has(voice.toLowerCase()) ? voice.toLowerCase() : "tara";
  try {
    const response = await groq.audio.speech.create({
      model:           "canopylabs/orpheus-3b-0.1-ft" as string,
      input:           text,
      voice:           v as string,
      response_format: "wav" as "wav",
    });
    const buf = await response.arrayBuffer();
    if (buf.byteLength > 0) return buf;
    return null;
  } catch (err) {
    console.error("[tts] Orpheus failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function tryPlayAI(text: string, groq: Groq, voice: string): Promise<ArrayBuffer | null> {
  // strip emotion tags — PlayAI doesn't support them
  const cleanText = stripEmotionTags(text);
  const normalized = voice.toLowerCase().replace("-playai", "");
  const v = PLAYAI_VOICE_MAP[normalized] ?? "Aria-PlayAI";  // default: Aria-PlayAI
  try {
    const response = await groq.audio.speech.create({
      model:           "playai-tts",
      input:           cleanText,
      voice:           v as string,
      response_format: "wav" as "wav",
    });
    const buf = await response.arrayBuffer();
    if (buf.byteLength > 0) return buf;
    return null;
  } catch (err) {
    console.error("[tts] PlayAI failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * voice param accepts:
 * - Orpheus voice: "tara", "leah", "leo", "dan", "mia", "zac", "jess"
 * - PlayAI voice:  "aria", "fritz", "celeste", "gail", "harry" etc.
 * Orpheus is tried first (better quality, emotion tags).
 * PlayAI is fallback. Browser TTS is last resort only.
 */
export async function synthesiseWithFallback(
  text: string,
  voice: string = "tara",
): Promise<TtsResult> {
  const key        = process.env.GROQ_API_KEY;
  const speak_text = text.trim();

  if (!key) {
    console.error("[tts] GROQ_API_KEY is not set — falling back to browser TTS");
  }

  if (key && speak_text) {
    const groq = new Groq({ apiKey: key });
    const voiceKey = voice.toLowerCase().replace("-playai", "");

    // 1. Try Orpheus if the requested voice is an Orpheus voice (or default)
    const useOrpheus = ORPHEUS_VOICES.has(voiceKey) || !PLAYAI_VOICE_MAP[voiceKey];
    if (useOrpheus) {
      const buf = await tryOrpheus(speak_text, groq, voiceKey);
      if (buf) {
        console.log("[tts] Orpheus success, bytes:", buf.byteLength);
        return { audio_b64: Buffer.from(buf).toString("base64"), mime: "audio/wav", use_browser_tts: false, speak_text };
      }
      console.warn("[tts] Orpheus failed, trying PlayAI fallback");
    }

    // 2. Try PlayAI
    const buf2 = await tryPlayAI(speak_text, groq, voiceKey);
    if (buf2) {
      console.log("[tts] PlayAI success, bytes:", buf2.byteLength);
      return { audio_b64: Buffer.from(buf2).toString("base64"), mime: "audio/wav", use_browser_tts: false, speak_text };
    }
    console.warn("[tts] PlayAI also failed — last resort: browser TTS");
  }

  return {
    audio_b64:       null,
    mime:            "audio/wav",
    use_browser_tts: true,
    speak_text:      stripEmotionTags(speak_text),
  };
}
