import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 30;

const MODEL = "qwen/qwen3-32b";

interface EvaluateBody {
  question:      string;
  answer:        string;
  job_title:     string;
  question_type: string;
  language?:     string; // "en" | "fr"
}

const JUNK_PATTERNS = [
  /^(lol+|lmao|haha|hehe|idk|ok|okay|yes|no|nope|yep|sure|hmm+|ugh+|meh|wtf|omg|test|hi|hello|bye|whatever|idc|asdf|qwerty|1234|dunno|nothing|none|n\/a|oui|non|ouais|bof|rien)$/i,
  /^[^a-zA-Z0-9]{1,10}$/,
  /^.{1,9}$/,
];

function isJunkAnswer(answer: string): boolean {
  const t = answer.trim().toLowerCase();
  const deduped = [...new Set(t.split(/\s+/))].join(" ");
  return JUNK_PATTERNS.some(p => p.test(t)) || JUNK_PATTERNS.some(p => p.test(deduped));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as EvaluateBody;
    const { question, answer, job_title, question_type } = body;
    const lang = body.language === "fr" ? "fr" : "en";
    const isFr = lang === "fr";

    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { detail: isFr ? "La question et la réponse sont requises." : "question and answer are required." },
        { status: 400 },
      );
    }
    if (answer.trim().length < 15) {
      return NextResponse.json(
        { detail: isFr ? "Votre réponse est trop courte. Rédigez une vraie réponse." : "Your answer is too short. Please write a proper response." },
        { status: 400 },
      );
    }

    if (isJunkAnswer(answer)) {
      return NextResponse.json({
        evaluation: {
          score: 0,
          verdict: isFr ? "Insuffisant" : "Insufficient",
          what_was_good: isFr ? "N/A — aucune réponse substantielle fournie." : "N/A — no substantive answer was provided.",
          what_was_missing: isFr
            ? "Une vraie réponse réfléchie qui adresse la question. Les réponses vides ou humoristiques obtiennent 0."
            : "A real, thoughtful response that addresses the question. Joke or filler answers score 0.",
          ideal_answer_summary: isFr
            ? "Rédigez une vraie tentative et l'IA vous donnera un feedback spécifique et utile pour progresser."
            : "Write a genuine attempt and the AI will give you specific, useful feedback to improve.",
        },
      }, { status: 200 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });
    }

    const langInstruction = isFr
      ? "IMPORTANT : Tu dois répondre ENTIÈREMENT en français. Tous les champs JSON doivent être en français."
      : "IMPORTANT: Respond entirely in English.";

    const verdictValues = isFr
      ? '"Excellent|Bien|À améliorer|Insuffisant"'
      : '"Excellent|Good|Needs Work|Insufficient"';

    const systemPrompt = [
      langInstruction,
      "",
      isFr
        ? "Tu es un interviewer technique senior qui évalue la réponse d'un candidat. Sois direct, honnête et spécifique."
        : "You are a senior technical interviewer evaluating a candidate answer. Be direct, honest, specific.",
      "",
      isFr ? "RÈGLES :" : "RULES:",
      isFr
        ? "1. Évalue UNIQUEMENT ce que le candidat a écrit. Ne crédite jamais des connaissances qu'il n'a pas démontrées."
        : "1. Evaluate ONLY what the candidate wrote. Never credit knowledge they did not demonstrate.",
      isFr
        ? "2. Charabia, blagues, hors-sujet ou non-réponses = score 0, verdict Insuffisant. Sans exception."
        : "2. Gibberish, jokes, irrelevant or non-answers = score 0, verdict Insufficient. No exceptions.",
      isFr
        ? "3. Effort vague mais sincère = 10-35, expliquer les lacunes."
        : "3. Vague but genuine effort = 10-35, explain gaps.",
      isFr
        ? "4. Technique/Code : exactitude, profondeur, edge cases, efficacité."
        : "4. Technical/Coding: correctness, depth, edge cases, efficiency.",
      isFr
        ? "5. Comportemental : structure STAR, spécificité, impact mesurable."
        : "5. Behavioral: STAR structure, specificity, measurable impact.",
      isFr
        ? "6. Conception système : périmètre, trade-offs, scalabilité, composants."
        : "6. System Design: scope, trade-offs, scalability, components.",
      isFr
        ? "7. Score : 90-100 impressionnant ; 70-89 bien ; 50-69 passable ; 30-49 incomplet ; <30 insuffisant."
        : "7. Score: 90-100 impressive; 70-89 good; 50-69 passable; 30-49 incomplete; <30 insufficient.",
      isFr
        ? "8. Retourner UNIQUEMENT un objet JSON valide. Pas de markdown, pas de texte en dehors du JSON."
        : "8. Output ONLY a valid JSON object. No markdown, no extra text.",
    ].join("\n");

    const userPrompt = [
      `${isFr ? "Poste" : "Role"}: ${(job_title || "Software Engineer").trim()}`,
      `${isFr ? "Type de question" : "Question type"}: ${(question_type || "Technical").trim()}`,
      "",
      `${isFr ? "QUESTION" : "QUESTION"}: ${question.trim()}`,
      "",
      `${isFr ? "RÉPONSE DU CANDIDAT" : "CANDIDATE ANSWER"}: ${answer.trim()}`,
      "",
      `${isFr
        ? `Retourner JSON : { "score": 0-100, "verdict": ${verdictValues}, "what_was_good": "éloge spécifique ou N/A", "what_was_missing": "lacunes spécifiques", "ideal_answer_summary": "2-3 phrases" }`
        : `Return JSON: { "score": 0-100, "verdict": ${verdictValues}, "what_was_good": "specific or N/A", "what_was_missing": "specific gaps", "ideal_answer_summary": "2-3 sentences" }`
      }`,
    ].join("\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const resp = await groq.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature:     0.1,
      response_format: { type: "json_object" },
      max_tokens:      600,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    if (!raw) return NextResponse.json({ detail: isFr ? "Réponse vide du modèle. Réessayez." : "Model returned empty response. Please try again." }, { status: 500 });

    let evaluation: unknown;
    try { evaluation = JSON.parse(raw); }
    catch {
      return NextResponse.json({ detail: isFr ? "Échec d'analyse de l'évaluation IA. Réessayez." : "Failed to parse AI evaluation. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ evaluation }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[evaluate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
