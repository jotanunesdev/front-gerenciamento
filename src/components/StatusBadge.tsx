import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  HelpCircle,
} from "lucide-react";

const config: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  success: {
    label: "Sucesso",
    className: "bg-success/15 text-success border-success/30",
    icon: CheckCircle2,
  },
  error: {
    label: "Erro",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    icon: XCircle,
  },
  running: {
    label: "Executando",
    className: "bg-chart-4/15 text-chart-4 border-chart-4/30",
    icon: Loader2,
  },
  waiting: {
    label: "Aguardando",
    className: "bg-warning/15 text-warning border-warning/30",
    icon: Clock,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const c = config[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
    icon: HelpCircle,
  };
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        c.className,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "running" && "animate-spin")} />
      {c.label}
    </span>
  );
}
