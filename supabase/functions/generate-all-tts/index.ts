import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offset = 0, limit = 10 } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ttsUrl = `${supabaseUrl}/functions/v1/elevenlabs-tts`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Fetch questions
    const { data: questions, error } = await supabase
      .from("questions")
      .select("id, question, correct_answer, question_el, correct_answer_el")
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No more questions to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    const errors: string[] = [];

    for (const q of questions) {
      // Fields to generate for each language
      const tasks = [
        { text: q.question, cacheKey: `${q.id}_question_ru`, lang: "ru" },
        { text: q.correct_answer, cacheKey: `${q.id}_answer_ru`, lang: "ru" },
      ];

      if (q.question_el) {
        tasks.push({ text: q.question_el, cacheKey: `${q.id}_question_el`, lang: "el" });
      }
      if (q.correct_answer_el) {
        tasks.push({ text: q.correct_answer_el, cacheKey: `${q.id}_answer_el`, lang: "el" });
      }

      for (const task of tasks) {
        try {
          const resp = await fetch(ttsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              text: task.text,
              language: task.lang,
              cacheKey: task.cacheKey,
            }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            errors.push(`${task.cacheKey}: ${errText}`);
          } else {
            processed++;
          }

          // Small delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 800));
        } catch (e) {
          errors.push(`${task.cacheKey}: ${e instanceof Error ? e.message : "Unknown"}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        questionsCount: questions.length,
        nextOffset: offset + limit,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-all-tts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
