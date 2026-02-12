import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch questions without Greek translations (limit to 20 per call to avoid timeout)
    const { data: questions, error } = await supabase
      .from("questions")
      .select("id, question, correct_answer, wrong_answers, explanation")
      .is("question_el", null)
      .limit(20);

    if (error) throw error;
    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ message: "All questions already translated", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Translating ${questions.length} questions to Greek...`);

    let translated = 0;
    // Process in batches of 5
    for (let i = 0; i < questions.length; i += 5) {
      const batch = questions.slice(i, i + 5);
      
      const prompt = `Translate the following questions and answers from Russian to Greek. Return a JSON array with the same structure. Keep the same order. Only translate the text, don't change the meaning.

Input:
${JSON.stringify(batch.map(q => ({
  id: q.id,
  question: q.question,
  correct_answer: q.correct_answer,
  wrong_answers: q.wrong_answers,
  explanation: q.explanation,
})), null, 2)}

Return ONLY a valid JSON array with objects having these fields:
- id (same as input)
- question_el (Greek translation of question)
- correct_answer_el (Greek translation of correct_answer)
- wrong_answers_el (array of Greek translations of wrong_answers)
- explanation_el (Greek translation of explanation, or null if original is null)`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a professional Russian to Greek translator. Return only valid JSON, no markdown." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`AI API error: ${errText}`);
        continue;
      }

      const aiResult = await response.json();
      let content = aiResult.choices?.[0]?.message?.content || "";
      
      // Clean markdown code blocks if present
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let translations;
      try {
        translations = JSON.parse(content);
      } catch (e) {
        console.error(`Failed to parse AI response for batch ${i}:`, content);
        continue;
      }

      // Update each question
      for (const t of translations) {
        const { error: updateError } = await supabase
          .from("questions")
          .update({
            question_el: t.question_el,
            correct_answer_el: t.correct_answer_el,
            wrong_answers_el: t.wrong_answers_el,
            explanation_el: t.explanation_el,
          })
          .eq("id", t.id);

        if (updateError) {
          console.error(`Failed to update question ${t.id}:`, updateError);
        } else {
          translated++;
        }
      }
    }

    return new Response(JSON.stringify({ message: "Translation complete", translated, total: questions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
