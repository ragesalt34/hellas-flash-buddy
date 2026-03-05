import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface Fix {
  questionId: string;
  correct_answer: string;
  explanation: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - require admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (roleError || !hasRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { questions, mode = 'verify' } = await req.json() as { questions: Question[], mode?: 'verify' | 'fix' };

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

    // FIX MODE
    if (mode === 'fix') {
      const fixes: Fix[] = [];
      const batchSize = 5;
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        
        const prompt = `Ты — эксперт по истории, культуре, законам и географии Греции. Для каждого вопроса укажи ПРАВИЛЬНЫЙ ответ.

Для каждого вопроса верни JSON объект с полями:
- questionId: ID вопроса  
- correct_answer: правильный ответ (если текущий правильный — верни его же, если неправильный — исправь)
- explanation: краткое объяснение почему этот ответ правильный (1-2 предложения)

Вопросы для исправления:
${batch.map((q, idx) => `
Вопрос ${idx + 1} (ID: ${q.id}):
"${q.question}"
Текущий ответ: "${q.correct_answer}"
Другие варианты: ${q.wrong_answers.map(a => `"${a}"`).join(", ")}
`).join("\n")}

Ответь ТОЛЬКО валидным JSON массивом без markdown разметки:
[{"questionId": "...", "correct_answer": "...", "explanation": "..."}, ...]`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Ты эксперт по Греции. Отвечай только валидным JSON без markdown." },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("AI gateway error:", response.status, errorText);
          throw new Error("AI gateway error");
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content || "";
        
        try {
          let cleanContent = content.trim();
          if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
          if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
          if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
          cleanContent = cleanContent.trim();
          const batchFixes = JSON.parse(cleanContent) as Fix[];
          fixes.push(...batchFixes);
        } catch (parseError) {
          console.error("Failed to parse fix response:", content);
        }
      }

      return new Response(
        JSON.stringify({ fixes }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // VERIFY MODE (default)
    const results: VerificationResult[] = [];
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
      
      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
        if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
        if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
        cleanContent = cleanContent.trim();
        const batchResults = JSON.parse(cleanContent) as VerificationResult[];
        results.push(...batchResults);
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
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
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
