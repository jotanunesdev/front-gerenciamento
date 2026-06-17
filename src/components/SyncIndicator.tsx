import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatRelative } from "@/lib/format";

type SyncIndicatorProps = {
  isFetching: boolean;
  isError: boolean;
  /** epoch ms of last successful sync (0 if never) */
  lastSyncedAt: number;
  className?: string;
};

export function SyncIndicator({
  isFetching,
  isError,
  lastSyncedAt,
  className = "",
}: SyncIndicatorProps) {
  let icon = <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  let text = "Sincronizado";
  let tone = "text-muted-foreground";

  if (isFetching) {
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin text-chart-4" />;
    text = "Sincronizando…";
  } else if (isError) {
    icon = <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    text = "Falha na sincronização automática";
    tone = "text-destructive";
  } else if (lastSyncedAt > 0) {
    text = `Atualizado ${formatRelative(new Date(lastSyncedAt).toISOString())}`;
  } else {
    text = "Aguardando primeira sincronização…";
  }

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs ${tone} ${className}`}
      title={
        lastSyncedAt > 0
          ? `Última sincronização: ${new Date(lastSyncedAt).toLocaleString("pt-BR")}`
          : "Ainda não sincronizado"
      }
    >
      {icon}
      {text}
    </span>
  );
}
