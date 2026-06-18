import type { ReactNode } from "react";
import { AlertTriangle, Gauge, Rabbit, Route, ShieldCheck } from "lucide-react";
import type { LoadTestEndpointMetricPayload } from "@/lib/api";
import { formatDurationMs } from "@/lib/format";

interface LoadTestEndpointRankingsProps {
  metrics: LoadTestEndpointMetricPayload[];
}

export function LoadTestEndpointRankings({ metrics }: LoadTestEndpointRankingsProps) {
  const tested = metrics.filter((metric) => metric.requests > 0);
  const real = tested.filter((metric) => metric.executionMode === "real").length;
  const dryRun = tested.filter((metric) => metric.executionMode === "dry-run").length;
  const fastest = [...tested]
    .filter((metric) => metric.averageDurationMs > 0)
    .sort((left, right) => left.averageDurationMs - right.averageDurationMs)
    .slice(0, 8);
  const slowest = [...tested]
    .sort((left, right) => right.p95DurationMs - left.p95DurationMs)
    .slice(0, 8);
  const errors = [...tested]
    .filter((metric) => metric.failures > 0)
    .sort((left, right) => right.failures - left.failures || right.errorRate - left.errorRate)
    .slice(0, 8);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<Route className="h-4 w-4 text-cyan-300" />}
          label="Endpoints testados"
          value={tested.length.toLocaleString("pt-BR")}
          detail="Descobertos automaticamente pelo Swagger"
        />
        <SummaryCard
          icon={<Gauge className="h-4 w-4 text-emerald-300" />}
          label="Handlers reais"
          value={real.toLocaleString("pt-BR")}
          detail="Leituras executadas contra a aplicação"
        />
        <SummaryCard
          icon={<ShieldCheck className="h-4 w-4 text-violet-300" />}
          label="Dry-run seguro"
          value={dryRun.toLocaleString("pt-BR")}
          detail="Escritas e integrações sem efeitos colaterais"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RankingCard
          title="Menor tempo de resposta"
          subtitle="Ordenado pela média"
          icon={<Rabbit className="h-4 w-4 text-emerald-300" />}
          metrics={fastest}
          value={(metric) => formatDurationMs(metric.averageDurationMs)}
          emptyMessage="Aguardando amostras de latência."
        />
        <RankingCard
          title="Maior tempo de resposta"
          subtitle="Ordenado pelo P95"
          icon={<Gauge className="h-4 w-4 text-amber-300" />}
          metrics={slowest}
          value={(metric) => formatDurationMs(metric.p95DurationMs)}
          emptyMessage="Aguardando amostras de latência."
        />
        <RankingCard
          title="Endpoints com mais erros"
          subtitle="Falhas 5xx, rede ou autenticação"
          icon={<AlertTriangle className="h-4 w-4 text-rose-300" />}
          metrics={errors}
          value={(metric) =>
            `${metric.failures.toLocaleString("pt-BR")} · ${metric.errorRate.toFixed(1)}%`
          }
          emptyMessage="Nenhum erro detectado."
        />
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  icon,
  metrics,
  value,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  metrics: LoadTestEndpointMetricPayload[];
  value: (metric: LoadTestEndpointMetricPayload) => string;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#10131c]/90 p-4">
      <div className="mb-3 flex items-start gap-2">
        {icon}
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {metrics.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div
              key={metric.name}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2"
            >
              <span className="w-5 text-xs tabular-nums text-slate-600">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-300">
                    {metric.httpMethod}
                  </span>
                  <span className="truncate font-mono text-[11px] text-slate-300">
                    {metric.endpoint}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-600">
                  {metric.executionMode === "dry-run" ? "dry-run" : "handler real"} ·{" "}
                  {metric.requests.toLocaleString("pt-BR")} chamadas
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-white">
                {value(metric)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
