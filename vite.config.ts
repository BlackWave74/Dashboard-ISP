import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Fallback: ensure env vars are always available even if .env is missing
    ...(process.env.VITE_SUPABASE_URL ? {} : {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://phughcqnevoziyqmpvoj.supabase.co"),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodWdoY3FuZXZveml5cW1wdm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTQxMzMsImV4cCI6MjA4Njc3MDEzM30.CIna0qk0vjHnVuWRowq0AZuKTxra8XyVCgqt8llpvZw"),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify("phughcqnevoziyqmpvoj"),
    }),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI / animation
          "vendor-ui": ["framer-motion", "lucide-react", "sonner"],
          // Radix primitives
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "@radix-ui/react-scroll-area",
          ],
          // Charts
          "vendor-charts": ["recharts"],
          // Data / backend
          "vendor-data": ["@supabase/supabase-js", "@tanstack/react-query"],
          // PDF export
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
        },
      },
    },
  },
}));
