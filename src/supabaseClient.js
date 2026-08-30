import { createClient } from '@supabase/supabase-js';

// ==========================================
// 1. SUPABASE PROJECT CONFIGURATION
// ==========================================
export const SUPABASE_PROJECT_ID = "arbfxnozydyodjkkgdoa";
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_PUBLIC_KEY = "sb_publishable_FdWEKN3Pbyl-WtFCfNPFAg_NFIzZes3";

// ==========================================
// 2. EXPORT CLIENT INSTANCE
// ==========================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY.trim(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

