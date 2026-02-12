// Supabase public configuration
// These are PUBLIC keys (anon key is safe to expose in client-side code)
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://stubkeeuttixteqckshd.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWJrZWV1dHRpeHRlcWNrc2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjQ0OTIsImV4cCI6MjA3MzA0MDQ5Mn0.YcpSKrTSb1P1REC8lgkdduDITX52h_z7ArPD6XIkrlU";
