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

    const { offset = 0, limit = 10, language } = await req.json().catch(() => ({}));

    const ttsUrl = `${supabaseUrl}/functions/v1/elevenlabs-tts`;

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
      const tasks: { text: string; cacheKey: string; lang: string }[] = [];

      if (!language || language === "ru") {
        tasks.push(
          { text: q.question, cacheKey: `${q.id}_question_ru`, lang: "ru" },
          { text: q.correct_answer, cacheKey: `${q.id}_answer_ru`, lang: "ru" },
        );
      }

      if (!language || language === "el") {
        if (q.question_el) {
          tasks.push({ text: q.question_el, cacheKey: `${q.id}_question_el`, lang: "el" });
        }
        if (q.correct_answer_el) {
          tasks.push({ text: q.correct_answer_el, cacheKey: `${q.id}_answer_el`, lang: "el" });
        }
      }

      for (const task of tasks) {
        try {
          // Pass through the admin's auth token to elevenlabs-tts
          const resp = await fetch(ttsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
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

          await new Promise((r) => setTimeout(r, 500));
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
