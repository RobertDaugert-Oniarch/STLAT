import type { Question, CategoryStats, SurveyCategory, AIQuestionPlan } from "../types/survey";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function getApiKey(): string {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!key) throw new Error("VITE_OPENAI_API_KEY is not set");
  return key;
}

function buildPrompt(
  categoryPerformance: Record<string, number>,
  availableByCategory: Record<string, string[]>,
  recentlySeenIds: string[],
): { system: string; user: string } {
  const system = `You are an adaptive quiz selector. You receive a user's per-category performance history (percentage correct) and a pool of available question IDs grouped by category. Your job is to return a JSON object with two arrays:
- "mainIds": exactly 20 question IDs (the primary test questions)
- "backupIds": exactly 10 question IDs (reserve questions, all different from mainIds)

Rules:
1. Give MORE main questions from categories where the user performs WORSE (lower percentage) to help them improve weak areas.
2. Guarantee at least 2 main questions per category.
3. Backup questions should cover all 4 categories roughly equally and must NOT overlap with main questions.
4. Prefer questions NOT in the recentlySeenIds list, but you may include them if no alternatives exist.
5. Return ONLY valid JSON with no extra text.`;

  const user = JSON.stringify({
    categoryPerformance,
    availableByCategory,
    recentlySeenIds,
    targets: { main: 20, backup: 10 },
  });

  return { system, user };
}

function fallbackSelection(
  allQuestions: Question[],
  categories: readonly SurveyCategory[],
): { main: Question[]; backup: Question[] } {
  const byCategory: Record<string, Question[]> = {};
  for (const cat of categories) byCategory[cat] = [];
  for (const q of allQuestions) {
    if (byCategory[q.category]) byCategory[q.category].push(q);
  }

  // Shuffle each category
  for (const cat of categories) {
    byCategory[cat].sort(() => Math.random() - 0.5);
  }

  const main: Question[] = [];
  const backup: Question[] = [];
  const usedIds = new Set<string>();

  // Pick 5 main per category (or fewer if not enough)
  for (const cat of categories) {
    const pool = byCategory[cat];
    const take = Math.min(5, pool.length);
    for (let i = 0; i < take; i++) {
      main.push(pool[i]);
      usedIds.add(pool[i].id);
    }
  }

  // Pick backup from remaining
  for (const cat of categories) {
    const pool = byCategory[cat].filter((q) => !usedIds.has(q.id));
    const take = Math.min(3, pool.length);
    for (let i = 0; i < take; i++) {
      backup.push(pool[i]);
    }
  }

  return { main: main.sort(() => Math.random() - 0.5), backup };
}

export async function selectQuestions(
  allQuestions: Question[],
  categoryHistory: Record<string, CategoryStats>,
  seenQuestionIds: string[],
  categories: readonly SurveyCategory[],
): Promise<{ main: Question[]; backup: Question[] }> {
  // Build lookup
  const questionMap = new Map<string, Question>();
  for (const q of allQuestions) questionMap.set(q.id, q);

  // Build category performance (0–100)
  const categoryPerformance: Record<string, number> = {};
  const availableByCategory: Record<string, string[]> = {};

  for (const cat of categories) {
    categoryPerformance[cat] = categoryHistory[cat]?.percentage ?? 50;
    availableByCategory[cat] = [];
  }
  for (const q of allQuestions) {
    if (availableByCategory[q.category]) {
      availableByCategory[q.category].push(q.id);
    }
  }

  // If total available < 30, skip AI and use fallback
  if (allQuestions.length < 30) {
    return fallbackSelection(allQuestions, categories);
  }

  try {
    const apiKey = getApiKey();
    const { system, user } = buildPrompt(categoryPerformance, availableByCategory, seenQuestionIds);

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.warn("AI survey service: API error", response.status);
      return fallbackSelection(allQuestions, categories);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return fallbackSelection(allQuestions, categories);
    }

    const plan: AIQuestionPlan = JSON.parse(content);

    // Validate and map IDs to questions
    const mainQuestions = plan.mainIds
      ?.map((id: string) => questionMap.get(id))
      .filter((q): q is Question => q !== undefined)
      ?? [];

    const backupQuestions = plan.backupIds
      ?.map((id: string) => questionMap.get(id))
      .filter((q): q is Question => q !== undefined)
      ?? [];

    // If AI returned too few, fill with fallback
    if (mainQuestions.length < 10) {
      console.warn("AI returned too few questions, using fallback");
      return fallbackSelection(allQuestions, categories);
    }

    return { main: mainQuestions, backup: backupQuestions };
  } catch (err) {
    console.warn("AI survey service error, using fallback:", err);
    return fallbackSelection(allQuestions, categories);
  }
}
