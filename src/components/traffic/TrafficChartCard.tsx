import type { ReactNode } from "react";

interface TrafficChartCardProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export function TrafficChartCard({
  title,
  description,
  children,
  className = "",
}: TrafficChartCardProps) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
