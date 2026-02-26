import { AlertCircle, LogIn, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface DataErrorCardProps {
  /** Short user-friendly title */
  title?: string;
  /** Detail message */
  message?: string;
  /** Retry callback — shows a button when provided */
  onRetry?: () => void;
  /** Compact mode for inline use inside grids */
  compact?: boolean;
}

/** Check if an error message is auth/JWT related */
function isAuthError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("jwt expired") ||
    lower.includes("jwt") ||
    lower.includes("pgrst301") ||
    lower.includes("pgrst303") ||
    lower.includes("sessão expirou") ||
    lower.includes("token") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid claim")
  );
}

/**
 * Standardised error display for failed data loads / chart errors.
 * Keeps the UI consistent across all pages.
 */
export default function DataErrorCard({
  title,
  message,
  onRetry,
  compact = false,
}: DataErrorCardProps) {
  const authError = isAuthError(message);
  const displayTitle = title ?? (authError ? "Sessão expirada" : "Erro ao carregar dados");
  const displayMessage = authError
    ? "Sua sessão expirou. Faça login novamente para continuar acessando os dados."
    : (message ?? "Não foi possível obter as informações. Tente novamente em alguns instantes.");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.06] text-center ${
        compact ? "p-4" : "p-8"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        {authError ? (
          <LogIn className="h-5 w-5 text-destructive" />
        ) : (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
      </div>
      <div className="space-y-1">
        <p className={`font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}>
          {displayTitle}
        </p>
        <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"} max-w-md`}>
          {displayMessage}
        </p>
      </div>
      {authError ? (
        <button
          type="button"
          onClick={() => {
            // Clear session and redirect to login
            try { localStorage.removeItem("auth_session"); } catch {}
            window.location.href = "/login";
          }}
          className="mt-1 flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20"
        >
          <LogIn className="h-3.5 w-3.5" />
          Fazer login novamente
        </button>
      ) : onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-foreground/70 transition hover:bg-white/[0.08] hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      ) : null}
    </motion.div>
  );
}
