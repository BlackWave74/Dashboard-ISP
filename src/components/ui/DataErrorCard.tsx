import { AlertCircle, RefreshCw } from "lucide-react";
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

/**
 * Standardised error display for failed data loads / chart errors.
 * Keeps the UI consistent across all pages.
 */
export default function DataErrorCard({
  title = "Erro ao carregar dados",
  message = "Não foi possível obter as informações. Tente novamente em alguns instantes.",
  onRetry,
  compact = false,
}: DataErrorCardProps) {
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
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className={`font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}>
          {title}
        </p>
        <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"} max-w-md`}>
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-foreground/70 transition hover:bg-white/[0.08] hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      )}
    </motion.div>
  );
}
