import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Question {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
}

interface VerificationResult {
  questionId: string;
  isCorrect: boolean;
  comment: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json() as { questions: Question[] };

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Не предоставлены вопросы для проверки" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const results: VerificationResult[] = [];

    // Process questions in batches of 5 for efficiency
    const batchSize = 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      const prompt = `Ты — эксперт по проверке тестовых вопросов. Проанализируй каждый вопрос и определи, правильно ли указан ответ.

Для каждого вопроса верни JSON объект с полями:
- questionId: ID вопроса
- isCorrect: true если правильный ответ действительно верный, false если есть ошибка
- comment: краткий комментарий (если всё верно — "Верно", если ошибка — объясни какой ответ правильный)

Вопросы для проверки:
${batch.map((q, idx) => `
Вопрос ${idx + 1} (ID: ${q.id}):
"${q.question}"
Указанный правильный ответ: "${q.correct_answer}"
Неправильные варианты: ${q.wrong_answers.map(a => `"${a}"`).join(", ")}
`).join("\n")}

Ответь ТОЛЬКО валидным JSON массивом без markdown разметки, например:
[{"questionId": "...", "isCorrect": true, "comment": "Верно"}, ...]`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Ты эксперт по проверке образовательных тестов. Отвечай только валидным JSON без markdown." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Превышен лимит запросов, попробуйте позже." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Необходимо пополнить баланс Lovable AI." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI gateway error");
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content || "";
      
      // Parse the AI response
      try {
        // Clean up potential markdown formatting
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        }
        if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        cleanContent = cleanContent.trim();

        const batchResults = JSON.parse(cleanContent) as VerificationResult[];
        results.push(...batchResults);
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        // Return fallback results for this batch
        batch.forEach(q => {
          results.push({
            questionId: q.id,
            isCorrect: true,
            comment: "Не удалось проверить — ошибка парсинга"
          });
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("verify-answers error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
