import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://yphytoroqhspwtvgbikr.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_F7_QQtlOgiro4LLcDhY-og_vo1zWilG";

export const supabase = createClient(supabaseUrl, supabaseKey);
