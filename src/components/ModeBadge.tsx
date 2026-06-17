import { Hand, Zap, Webhook, GitBranch, HelpCircle } from "lucide-react";

type ModeInfo = {
  label: string;
  Icon: typeof Hand;
  className: string;
  isManual: boolean;
};

export function getModeInfo(mode: string | null | undefined): ModeInfo {
  switch (mode) {
    case "manual":
      return {
        label: "Manual",
        Icon: Hand,
        className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        isManual: true,
      };
    case "trigger":
    case "schedule":
      return {
        label: "Automático",
        Icon: Zap,
        className: "border-primary/30 bg-primary/10 text-primary",
        isManual: false,
      };
    case "webhook":
      return {
        label: "Webhook",
        Icon: Webhook,
        className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        isManual: false,
      };
    case "integrated":
    case "internal":
      return {
        label: "Sub-fluxo",
        Icon: GitBranch,
        className: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
        isManual: false,
      };
    default:
      return {
        label: mode ? mode : "—",
        Icon: HelpCircle,
        className: "border-border bg-muted text-muted-foreground",
        isManual: false,
      };
  }
}

export function ModeBadge({
  mode,
  size = "sm",
}: {
  mode: string | null | undefined;
  size?: "sm" | "xs";
}) {
  const { label, Icon, className } = getModeInfo(mode);
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";
  const icon = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${pad} ${className}`}
    >
      <Icon className={icon} />
      {label}
    </span>
  );
}
