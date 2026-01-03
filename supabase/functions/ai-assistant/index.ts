import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = "ru", skipContext = false } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's last message for RAG search
    const userMessage = messages[messages.length - 1]?.content || "";
    
    // Search knowledge base for relevant context (skip if processing text)
    let knowledgeContext = "";
    if (userMessage && !skipContext) {
      console.log("Searching knowledge base for:", userMessage);
      
      const { data: articles, error: searchError } = await supabase
        .from("knowledge_base")
        .select("title, content, category")
        .textSearch("title", userMessage.split(" ").join(" | "), { type: "websearch", config: "russian" })
        .limit(3);

      if (searchError) {
        console.log("Text search failed, trying simple search:", searchError.message);
        // Fallback to simple ILIKE search
        const { data: fallbackArticles } = await supabase
          .from("knowledge_base")
          .select("title, content, category")
          .or(`title.ilike.%${userMessage.split(" ")[0]}%,content.ilike.%${userMessage.split(" ")[0]}%`)
          .limit(3);
        
        if (fallbackArticles && fallbackArticles.length > 0) {
          knowledgeContext = fallbackArticles
            .map((a) => `[${a.category}] ${a.title}:\n${a.content}`)
            .join("\n\n---\n\n");
        }
      } else if (articles && articles.length > 0) {
        knowledgeContext = articles
          .map((a) => `[${a.category}] ${a.title}:\n${a.content}`)
          .join("\n\n---\n\n");
      }
      
      console.log("Found knowledge context:", knowledgeContext ? "yes" : "no");
    }

    const systemPrompt = language === "ru" 
      ? `Ты — AI-ассистент, помогающий с вопросами о греческом гражданстве, визах, процедурах получения документов и жизни в Греции.

Правила:
- Отвечай кратко, по делу, дружелюбно
- Если не знаешь ответа — честно скажи об этом
- Используй только проверенную информацию из базы знаний
- Всегда рекомендуй уточнять актуальные требования в официальных источниках
- Не давай юридических консультаций, только общую информацию

${knowledgeContext ? `БАЗА ЗНАНИЙ (используй эту информацию для ответов):\n${knowledgeContext}` : "База знаний пока пуста. Отвечай на основе общих знаний, предупреждая что информация требует проверки."}`
      : `Είσαι ένας AI βοηθός που βοηθά με ερωτήσεις σχετικά με την ελληνική ιθαγένεια, τις βίζες, τις διαδικασίες εγγράφων και τη ζωή στην Ελλάδα.

Κανόνες:
- Απάντησε συνοπτικά, στην ουσία, φιλικά
- Αν δεν ξέρεις την απάντηση - πες το ειλικρινά
- Χρησιμοποίησε μόνο επαληθευμένες πληροφορίες από τη βάση γνώσεων
- Πάντα συνιστώ να επιβεβαιώνεις τις τρέχουσες απαιτήσεις σε επίσημες πηγές
- Μη δίνεις νομικές συμβουλές, μόνο γενικές πληροφορίες

${knowledgeContext ? `ΒΑΣΗ ΓΝΩΣΕΩΝ (χρησιμοποίησε αυτές τις πληροφορίες για απαντήσεις):\n${knowledgeContext}` : "Η βάση γνώσεων είναι ακόμα άδεια. Απάντησε με βάση τις γενικές γνώσεις, προειδοποιώντας ότι οι πληροφορίες χρειάζονται επαλήθευση."}`;

    console.log("Calling Lovable AI Gateway...");
    
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
          ...messages,
        ],
        stream: true,
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
          JSON.stringify({ error: "Исчерпан лимит AI. Обратитесь к администратору." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    console.log("Streaming response...");
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
