import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText, topic } = await req.json();
    
    if (!documentText) {
      return new Response(
        JSON.stringify({ error: "Document text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const topicDescriptions: Record<string, string> = {
      history: "История Греции (древняя, средневековая, современная)",
      culture: "Культура и традиции Греции (праздники, обычаи, искусство)",
      laws: "Законы и политика Греции (конституция, права граждан)",
      geography: "География Греции (регионы, города, острова, природа)",
    };

    const topicDescription = topicDescriptions[topic] || topic;

    const systemPrompt = `Ты эксперт по подготовке к экзамену на греческое гражданство. 
Твоя задача - проанализировать текст документа и извлечь из него вопросы для тестирования.

Для каждого вопроса:
1. Извлеки или сформулируй вопрос на основе информации в тексте
2. Определи правильный ответ из текста
3. Придумай 3 правдоподобных, но неправильных варианта ответа
4. Добавь краткое объяснение правильного ответа

Тема документа: ${topicDescription}

ВАЖНО: 
- Вопросы должны быть на русском языке
- Неправильные ответы должны быть похожи на правильный, но содержать ошибку
- Ответы должны быть краткими (1-5 слов обычно)
- Верни JSON массив вопросов

Формат ответа (только JSON, без markdown):
[
  {
    "question": "Текст вопроса?",
    "correct_answer": "Правильный ответ",
    "wrong_answers": ["Неправильный 1", "Неправильный 2", "Неправильный 3"],
    "explanation": "Краткое объяснение"
  }
]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Проанализируй этот документ и создай вопросы для тестирования:\n\n${documentText}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит запросов. Попробуйте позже." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Недостаточно кредитов AI. Пополните баланс." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Ошибка AI сервиса" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (remove markdown code blocks if present)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    const questions = JSON.parse(jsonContent);

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-questions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
