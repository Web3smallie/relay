import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase admin environment variables");
}

// This client bypasses Row Level Security — use ONLY in trusted backend code,
// never expose this client or its key to the frontend.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);