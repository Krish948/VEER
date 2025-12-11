import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY"); // Optional: for premium news API

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client with service role key for database operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface DailyDataItem {
  data_type: string;
  title: string;
  content: string;
  source?: string;
  source_url?: string;
  metadata?: Record<string, unknown>;
}

// Fetch today's quote using a free API
async function fetchDailyQuote(): Promise<DailyDataItem | null> {
  try {
    const response = await fetch("https://api.quotable.io/random");
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      data_type: "quote",
      title: `Quote by ${data.author}`,
      content: data.content,
      source: data.author,
      metadata: { tags: data.tags },
    };
  } catch (error) {
    console.error("Failed to fetch quote:", error);
    return null;
  }
}

// Fetch a random interesting fact
async function fetchDailyFact(): Promise<DailyDataItem | null> {
  try {
    const response = await fetch("https://uselessfacts.jsph.pl/random.json?language=en");
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      data_type: "fact",
      title: "Interesting Fact",
      content: data.text,
      source: "uselessfacts.jsph.pl",
      source_url: data.permalink,
    };
  } catch (error) {
    console.error("Failed to fetch fact:", error);
    return null;
  }
}

// Fetch current date info (holidays, events)
async function fetchDateInfo(): Promise<DailyDataItem | null> {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    const response = await fetch(`https://today.zenquotes.io/api/${month}/${day}`);
    if (!response.ok) {
      // Fallback to simple date info
      return {
        data_type: "date_info",
        title: `Today: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        content: `Day ${Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)} of ${today.getFullYear()}`,
        source: "system",
      };
    }
    
    const data = await response.json();
    return {
      data_type: "date_info",
      title: `Today: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      content: JSON.stringify(data),
      source: "zenquotes.io",
      metadata: data,
    };
  } catch (error) {
    console.error("Failed to fetch date info:", error);
    const today = new Date();
    return {
      data_type: "date_info",
      title: `Today: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      content: `Current date information for ${today.toISOString()}`,
      source: "system",
    };
  }
}

// Fetch news headlines (using free news API alternatives)
async function fetchNewsHeadlines(): Promise<DailyDataItem[]> {
  const items: DailyDataItem[] = [];
  
  try {
    // Try using a free news API or RSS feed
    // Using News API if key is configured
    if (NEWS_API_KEY) {
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${NEWS_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        for (const article of data.articles || []) {
          items.push({
            data_type: "news",
            title: article.title,
            content: article.description || article.content || "",
            source: article.source?.name,
            source_url: article.url,
            metadata: {
              publishedAt: article.publishedAt,
              author: article.author,
              urlToImage: article.urlToImage,
            },
          });
        }
      }
    }
    
    // Fallback: If no news API key, try fetching from a free alternative
    if (items.length === 0) {
      // Try Hacker News top stories as fallback
      const hnResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      if (hnResponse.ok) {
        const storyIds = await hnResponse.json();
        const topStories = storyIds.slice(0, 5);
        
        for (const storyId of topStories) {
          try {
            const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`);
            if (storyResponse.ok) {
              const story = await storyResponse.json();
              items.push({
                data_type: "tech_news",
                title: story.title,
                content: story.text || `${story.score} points | ${story.descendants || 0} comments`,
                source: "Hacker News",
                source_url: story.url || `https://news.ycombinator.com/item?id=${storyId}`,
                metadata: {
                  score: story.score,
                  by: story.by,
                  time: story.time,
                },
              });
            }
          } catch (e) {
            console.error("Failed to fetch HN story:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch news:", error);
  }
  
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if we already fetched data today
    const { data: existingData } = await supabase
      .from("daily_data")
      .select("id")
      .gte("fetched_at", today.toISOString())
      .limit(1);
    
    const forceRefresh = req.method === "POST" && (await req.json().catch(() => ({}))).force === true;
    
    if (existingData && existingData.length > 0 && !forceRefresh) {
      return new Response(
        JSON.stringify({ message: "Data already updated today", updated: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Clear old data (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from("daily_data")
      .delete()
      .lt("fetched_at", sevenDaysAgo.toISOString());
    
    // Fetch fresh data from various sources
    const [quote, fact, dateInfo, news] = await Promise.all([
      fetchDailyQuote(),
      fetchDailyFact(),
      fetchDateInfo(),
      fetchNewsHeadlines(),
    ]);
    
    const itemsToInsert: DailyDataItem[] = [];
    
    if (quote) itemsToInsert.push(quote);
    if (fact) itemsToInsert.push(fact);
    if (dateInfo) itemsToInsert.push(dateInfo);
    itemsToInsert.push(...news);
    
    // Insert new data
    if (itemsToInsert.length > 0) {
      const { error } = await supabase
        .from("daily_data")
        .insert(itemsToInsert.map(item => ({
          ...item,
          fetched_at: new Date().toISOString(),
        })));
      
      if (error) {
        console.error("Failed to insert daily data:", error);
        throw error;
      }
    }
    
    return new Response(
      JSON.stringify({
        message: "Daily data updated successfully",
        updated: true,
        items_count: itemsToInsert.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update daily data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
