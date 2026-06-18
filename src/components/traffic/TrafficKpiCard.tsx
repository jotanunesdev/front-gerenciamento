import type { LucideIcon } from "lucide-react";

interface TrafficKpiCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  iconClassName: string;
}

export function TrafficKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClassName,
}: TrafficKpiCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${iconClassName}`} />
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
