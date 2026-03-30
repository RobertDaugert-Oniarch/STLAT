import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const RATE_LIMIT_MS = 60_000;

interface SelectQuestionsBody {
  categoryPerformance: Record<string, number>;
  availableByCategory: Record<string, string[]>;
  seenIds: string[];
}

export const selectQuestions = functions
  .runWith({ secrets: ["OPENAI_API_KEY"] })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Verify Firebase Auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Rate limiting: check last AI call timestamp per user
    const db = admin.firestore();
    const rateLimitRef = db.collection("aiRateLimit").doc(uid);
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists) {
      const lastCall = rateLimitDoc.data()?.lastCall?.toMillis?.() ?? 0;
      if (Date.now() - lastCall < RATE_LIMIT_MS) {
        res.status(429).json({ error: "Rate limit exceeded. Try again later." });
        return;
      }
    }

    // Parse and validate request body
    const body = req.body as SelectQuestionsBody;
    if (
      !body.categoryPerformance ||
      !body.availableByCategory ||
      !body.seenIds
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Build the OpenAI prompt
    const systemPrompt = `You are an adaptive quiz selector. You receive a user's per-category performance history (percentage correct) and a pool of available question IDs grouped by category. Your job is to return a JSON object with two arrays:
- "mainIds": exactly 20 question IDs (the primary test questions)
- "backupIds": exactly 10 question IDs (reserve questions, all different from mainIds)

Rules:
1. Give MORE main questions from categories where the user performs WORSE (lower percentage) to help them improve weak areas.
2. Guarantee at least 2 main questions per category.
3. Backup questions should cover all 4 categories roughly equally and must NOT overlap with main questions.
4. Prefer questions NOT in the recentlySeenIds list, but you may include them if no alternatives exist.
5. Return ONLY valid JSON with no extra text.`;

    const userPrompt = JSON.stringify({
      categoryPerformance: body.categoryPerformance,
      availableByCategory: body.availableByCategory,
      recentlySeenIds: body.seenIds,
      targets: { main: 20, backup: 10 },
    });

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OPENAI_API_KEY secret not configured");
        res.status(500).json({ error: "Server configuration error" });
        return;
      }
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenAI API error:", response.status, errText);
        res.status(502).json({ error: "AI service unavailable" });
        return;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        res.status(502).json({ error: "Empty AI response" });
        return;
      }

      // Update rate limit timestamp
      await rateLimitRef.set({ lastCall: admin.firestore.FieldValue.serverTimestamp() });

      const plan = JSON.parse(content);
      res.status(200).json(plan);
    } catch (err) {
      console.error("Cloud Function selectQuestions error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);
