import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY");
const ENWS_API_KEY = Deno.env.get("ENWS_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate current date string for system prompts
const getCurrentDateString = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'UTC'
  };
  return now.toLocaleDateString('en-US', options);
};

// Dynamic system prompts that include the current date
const getSystemPrompts = () => {
  const currentDate = getCurrentDateString();
  const dateContext = `Today's date is ${currentDate}. Always use current, up-to-date information. If asked about recent events, news, or data, acknowledge that your training data has a cutoff date and recommend checking reliable sources for the most recent information.`;
  
  return {
    auto: `You are VEER in Auto mode. ${dateContext} Choose the best style (helper, coder, tutor, study, silent, explain) based on the user request and respond accordingly.`,
    helper: `You are VEER, a helpful AI assistant. ${dateContext} Provide clear, concise, and friendly responses.`,
    coder: `You are VEER in Coder mode. ${dateContext} Help with programming, debugging, and code explanations. Format code properly.`,
    tutor: `You are VEER in Tutor mode. ${dateContext} Explain concepts clearly, break down complex topics, and help with learning.`,
    study: `You are VEER in Study mode. ${dateContext} Help organize notes, create summaries, and generate study materials.`,
    silent: `You are VEER in Silent mode. ${dateContext} Respond only when directly asked. Keep responses extremely brief.`,
    explain: `You are VEER in Explain mode. ${dateContext} Provide detailed, thorough explanations with examples and context.`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      message,
      mode,
      history = [],
      service = "auto", // Changed default to auto - will prefer OpenAI if available
      location,
      query,
    } = body as Record<string, unknown>;

    const systemPrompts = getSystemPrompts();
    const systemPrompt = systemPrompts[mode as keyof typeof systemPrompts] || systemPrompts.helper;

    const messages = [
      { role: "system", content: systemPrompt },
      ...((history || []) as Array<Record<string, unknown>>).map((msg: Record<string, unknown>) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message },
    ];

    // Auto-select service: prefer OpenAI if available, then Lovable
    const effectiveService = service === "auto" 
      ? (OPENAI_API_KEY ? "openai" : (LOVABLE_API_KEY ? "lovable" : "none"))
      : service;

    if (effectiveService === "openai" || (service === "auto" && OPENAI_API_KEY)) {
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("OpenAI error:", resp.status, txt);
        throw new Error("OpenAI request failed");
      }

      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
      return new Response(JSON.stringify({ reply, tool: "openai" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (service === "weather") {
      if (!WEATHER_API_KEY) throw new Error("WEATHER_API_KEY not configured");
      if (!location) throw new Error("location is required for weather service");

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${WEATHER_API_KEY}&units=metric`;
      const resp = await fetch(url);
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Weather API error:", resp.status, txt);
        throw new Error("Weather API request failed");
      }

      const data = await resp.json();
      return new Response(JSON.stringify({ reply: data, tool: "weather" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (service === "enws") {
      if (!ENWS_API_KEY) throw new Error("ENWS_API_KEY not configured");
      if (!query) throw new Error("query is required for enws service");

      const url = `https://api.enws.example/v1/search?q=${encodeURIComponent(query)}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ENWS_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("ENWS API error:", resp.status, txt);
        throw new Error("ENWS API request failed");
      }

      const data = await resp.json();
      return new Response(JSON.stringify({ reply: data, tool: "enws" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fallback to Lovable gateway
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lovableResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, temperature: 0.7, max_tokens: 1000 }),
    });

    if (!lovableResp.ok) {
      const txt = await lovableResp.text();
      console.error("Lovable error:", lovableResp.status, txt);
      throw new Error("Lovable request failed");
    }

    const lovableData = await lovableResp.json();
    const reply = lovableData.choices?.[0]?.message?.content || lovableData.choices?.[0]?.text || "";

    return new Response(JSON.stringify({ reply, tool: "lovable" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
