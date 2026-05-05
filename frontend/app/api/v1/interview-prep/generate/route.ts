import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const MODEL = "qwen/qwen3-32b";

interface GenerateBody {
  job_title: string;
  company_name: string;
  job_field: string;
  experience_level: string;
  tech_stack?: string;
  extra_context?: string;
  language?: string; // "en" | "fr"
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as GenerateBody;
    const { job_title, company_name, job_field, experience_level } = body;
    const lang = body.language === "fr" ? "fr" : "en";
    const isFr = lang === "fr";

    if (!job_title?.trim() || !job_field?.trim() || !experience_level?.trim()) {
      return NextResponse.json(
        { detail: isFr ? "Intitulé du poste, domaine et niveau sont requis." : "job_title, job_field, and experience_level are required." },
        { status: 400 },
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ detail: "Groq API key not configured." }, { status: 500 });
    }

    const level = experience_level.trim().toLowerCase();
    const isJunior = level.includes("junior") || level.includes("entry");
    const isSenior = level.includes("senior") || level.includes("lead") || level.includes("staff") || level.includes("principal");

    const companyCtx = company_name?.trim()
      ? isFr
        ? `L'entreprise cible est "${company_name.trim()}". Utilise ta connaissance de cette entreprise (stack, culture, produits, défis d'ingénierie à leur échelle) pour que chaque question soit clairement liée à CETTE entreprise.`
        : `The target company is "${company_name.trim()}". Use your knowledge of this company (tech stack, products, culture, scale challenges) to make every question feel specifically tailored to THIS company.`
      : isFr
        ? "Aucune entreprise spécifique. Concentre-toi rigoureusement sur le rôle et le domaine."
        : "No specific company. Make questions deeply role-specific and field-specific.";

    const techCtx = body.tech_stack?.trim()
      ? isFr
        ? `La stack du candidat est : ${body.tech_stack.trim()}. Au moins 3 questions doivent impliquer directement une ou plusieurs de ces technologies spécifiques — bugs, edge cases, ou décisions de conception.`
        : `The candidate's tech stack is: ${body.tech_stack.trim()}. At least 3 questions must directly involve these technologies — bugs, edge cases, or design decisions.`
      : "";

    const extraCtx = body.extra_context?.trim()
      ? isFr
        ? `Contexte supplémentaire : ${body.extra_context.trim()}. Utilise-le pour cibler davantage les questions.`
        : `Extra context: ${body.extra_context.trim()}. Use this to make questions more targeted.`
      : "";

    const levelRules = isJunior ? [
      isFr
        ? "Mix : 3 questions de code/algorithme (implémenter ou trouver un bug dans un extrait court), 2 concepts techniques, 2 scénarios de débogage, 2 comportementaux (expérience passée spécifique), 1 conception système (petite échelle)."
        : "Mix: 3 coding/algorithm (implement or fix a bug in a short snippet), 2 technical concepts, 2 debugging scenarios, 2 behavioral, 1 system design (small scale).",
      isFr ? "Difficulté : surtout Facile-Moyen. Pas d'architecture ni de leadership." : "Difficulty: mostly Easy-Medium. No architecture or leadership questions.",
      isFr
        ? "Questions de code : fournis un extrait cassé (5-15 lignes) et demande de trouver le bug ou compléter la fonction."
        : "Coding questions: provide a short broken code snippet (5-15 lines) and ask to find the bug or complete the function.",
    ] : isSenior ? [
      isFr
        ? "Mix : 1 code difficile (bug complexe ou algorithme avec edge cases), 2 conception système avancée (distribué, pannes, haute disponibilité), 2 décisions d'architecture (trade-offs à l'échelle), 2 leadership/ownership (ambiguïté, inter-équipes, incidents), 2 expertise domaine (connaissance technique approfondie), 1 comportemental (décision technique la plus difficile prise)."
        : "Mix: 1 hard coding (complex bug or algorithm with edge cases), 2 advanced system design (distributed, failures, HA), 2 architecture decisions (trade-offs at scale), 2 leadership/ownership, 2 domain expertise, 1 behavioral (hardest technical decision made).",
      isFr ? "Difficulté : Difficile pour tout. Chaque question doit faire galérer un junior ou mid-level." : "Difficulty: Hard across the board. Every question should challenge junior/mid candidates.",
      isFr
        ? "Code : extrait non trivial avec un bug subtil (race condition, fuite mémoire, off-by-one en code concurrent) — identifier, expliquer, corriger avec implications en production."
        : "Coding: non-trivial snippet with a subtle bug (race condition, memory leak, off-by-one in concurrent code) — identify, explain, fix with production implications.",
      isFr
        ? "Conception système : exiger des chiffres précis, conscience du théorème CAP, modèles de cohérence, stratégies de récupération sur pannes."
        : "System design: demand specific numbers, CAP theorem awareness, consistency models, failure recovery strategies.",
    ] : [
      isFr
        ? "Mix : 2 code (trouver le bug ou optimiser un extrait réel), 2 conception système (trade-offs à moyenne échelle), 2 profondeur technique (pourquoi X plutôt que Y, edge cases, internes), 2 comportementaux (ownership, conflit, livraison), 1 scénario de débogage, 1 étude de cas domaine."
        : "Mix: 2 coding (find the bug or optimize a snippet), 2 system design (medium scale trade-offs), 2 technical depth, 2 behavioral, 1 debugging scenario, 1 domain case study.",
      isFr ? "Difficulté : Moyen-Difficile. Les questions doivent nécessiter une vraie expérience." : "Difficulty: Medium-Hard. Questions must require real experience.",
      isFr
        ? "Code : extrait cassé ou inefficace (10-20 lignes), corriger, optimiser ou expliquer l'impact en production."
        : "Coding: broken or inefficient snippet (10-20 lines), fix + explain production impact.",
    ];

    const langInstruction = isFr
      ? "IMPORTANT : Tu dois répondre ENTIÈREMENT en français. Questions, hints, types, niveaux de difficulté — tout doit être en français."
      : "IMPORTANT: Respond entirely in English.";

    const systemPrompt = [
      langInstruction,
      "",
      isFr
        ? `Tu es un ingénieur principal et interviewer technique dans une entreprise de premier plan. Tu conduis un entretien de niveau ${experience_level.trim()}.`
        : `You are a principal engineer and technical interviewer at a top-tier tech company conducting a ${experience_level.trim()} level interview.`,
      "",
      isFr
        ? "TON RÔLE : Générer 10 questions d'entretien qui challengent vraiment un candidat réel à ce niveau. Pas des questions de manuel — de vraies questions qui distinguent les bons candidats des excellents."
        : "YOUR JOB: Generate 10 interview questions that genuinely challenge a real candidate at this level. Not textbook questions — real ones that separate good from great.",
      "",
      isFr ? "RÈGLES ABSOLUES :" : "ABSOLUTE RULES:",
      isFr
        ? "1. ZÉRO question générique ou RH. Pas de 'parlez-moi de vous', pas de forces/faiblesses."
        : "1. ZERO generic or HR questions. No 'tell me about yourself', no strengths/weaknesses.",
      isFr
        ? "2. Les questions de code DOIVENT inclure un vrai extrait de code (cassé, inefficace ou incomplet) dans le texte de la question."
        : "2. Coding questions MUST include an actual code snippet (broken, inefficient, or incomplete) inside the question text.",
      isFr
        ? "3. Chaque question doit être assez spécifique pour qu'une réponse vague soit clairement fausse."
        : "3. Every question must be specific enough that a vague answer is clearly wrong.",
      isFr
        ? "4. Les questions de conception système doivent spécifier l'échelle, les contraintes ou un scénario de panne."
        : "4. System design questions must specify scale, constraints, or a failure scenario.",
      isFr
        ? "5. Les questions comportementales doivent porter sur une situation PASSÉE SPÉCIFIQUE, pas des hypothèses."
        : "5. Behavioral questions must ask about a SPECIFIC past situation, not hypotheticals.",
      `6. ${companyCtx}`,
      techCtx ? `7. ${techCtx}` : isFr ? "7. Rends les questions techniquement profondes pour le domaine." : "7. Make questions technically deep for the field.",
      extraCtx ? `8. ${extraCtx}` : "",
      "",
      isFr ? "MIX DE QUESTIONS POUR CE NIVEAU :" : "QUESTION MIX FOR THIS LEVEL:",
      ...levelRules,
      "",
      isFr
        ? "FORMAT DE SORTIE : Un tableau JSON brut de exactement 10 objets. Pas de balises markdown, pas de texte avant ou après."
        : "OUTPUT FORMAT: A raw JSON array of exactly 10 objects. No markdown fences, no text before or after.",
      isFr
        ? 'Schéma : { "id": 1-10, "question": string (inclure l\'extrait de code inline si applicable, utiliser \\n pour les sauts de ligne), "type": "Technique|Conception Système|Comportemental|Étude de cas|Codage", "difficulty": "Facile|Moyen|Difficile", "hint": "1 phrase sur ce qu\'une bonne réponse doit couvrir" }'
        : 'Schema: { "id": 1-10, "question": string (include code snippet inline if applicable, use \\n for newlines), "type": "Technical|System Design|Behavioral|Case Study|Coding", "difficulty": "Easy|Medium|Hard", "hint": "1 sentence on what a strong answer must cover" }',
    ].filter(Boolean).join("\n");

    const userPrompt = [
      `${isFr ? "Poste" : "Role"}: ${job_title.trim()}`,
      `${isFr ? "Domaine" : "Field"}: ${job_field.trim()}`,
      `${isFr ? "Niveau" : "Experience Level"}: ${experience_level.trim()}`,
      body.tech_stack?.trim() ? `${isFr ? "Stack" : "Tech Stack"}: ${body.tech_stack.trim()}` : "",
      body.extra_context?.trim() ? `${isFr ? "Contexte" : "Extra"}: ${body.extra_context.trim()}` : "",
      company_name?.trim() ? `${isFr ? "Entreprise" : "Company"}: ${company_name.trim()}` : "",
      "",
      isFr ? "Génère les 10 questions maintenant. Inclure de vrais extraits de code si nécessaire. Sortie en JSON uniquement." : "Generate the 10 questions now. Include real code snippets where required. Output only the JSON array.",
    ].filter(Boolean).join("\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const resp = await groq.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature:     0.3,
      response_format: { type: "json_object" },
      max_tokens:      3000,
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    if (!raw) {
      return NextResponse.json({ detail: isFr ? "Le modèle n'a retourné aucun contenu. Réessayez." : "Model returned empty response. Please try again." }, { status: 500 });
    }

    let questions: unknown[];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (Array.isArray(parsed?.questions)) {
        questions = parsed.questions;
      } else {
        const arr = Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v));
        if (arr) { questions = arr as unknown[]; }
        else { throw new Error("No array found"); }
      }
    } catch {
      return NextResponse.json({ detail: isFr ? "Échec d'analyse de la réponse IA. Réessayez." : "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ questions }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled:", msg);
    return NextResponse.json({ detail: msg || "Internal Server Error" }, { status: 500 });
  }
}
