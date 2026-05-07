import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ text: "" });

    // Read multipart first — AbortController only wraps the Groq fetch, not the upload
    const formData  = await req.formData();
    const audioPart = formData.get("audio");
    const language  = (formData.get("language") as string | null) ?? "en";

    if (!audioPart || !(audioPart instanceof Blob))
      return NextResponse.json({ text: "" });

    if (audioPart.size > 25 * 1024 * 1024)
      return NextResponse.json({ text: "" });

    // Build Groq multipart request
    const outForm = new FormData();
    outForm.append("file",            new File([audioPart], "audio.webm", { type: audioPart.type || "audio/webm" }));
    outForm.append("model",           "whisper-large-v3-turbo");   // 40% faster, same accuracy
    outForm.append("language",        language === "fr" ? "fr" : "en");
    outForm.append("response_format", "json");

    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 12_000);  // timeout only on Groq call

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${key}` },
      body:    outForm,
      signal:  ctrl.signal,
    });
    clearTimeout(tid);

    if (!res.ok) return NextResponse.json({ text: "" });
    const data = await res.json() as { text?: string };
    return NextResponse.json({ text: data.text ?? "" });
  } catch {
    return NextResponse.json({ text: "" });
  }
}
