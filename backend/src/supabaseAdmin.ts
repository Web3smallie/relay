import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Notice: Supabase admin credentials not set. Database persistence will be disabled.");
}

// This client bypasses Row Level Security — use ONLY in trusted backend code,
// never expose this client or its key to the frontend.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);