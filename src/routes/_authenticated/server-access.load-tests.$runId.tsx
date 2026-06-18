import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { trafficMonitoringApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LoadTestEndpointRankings } from "@/components/traffic/LoadTestEndpointRankings";

export const Route = createFileRoute("/_authenticated/server-access/load-tests/$runId")({
  head: () => ({ meta: [{ title: "Execucao de Teste de Carga - FlowControl" }] }),
  component: LoadTestRunPage,
});

const chartConfigs = {
  throughput: {
    requests: { label: "Requests/s", color: "#14b8a6" },
    failures: { label: "Falhas/s", color: "#f43f5e" },
  },
  latency: {
    average: { label: "Media", color: "#38bdf8" },
    p95: { label: "P95", color: "#f59e0b" },
  },
  virtualUsers: {
    vus: { label: "Usuarios virtuais", color: "#a78bfa" },
  },
  totals: {
    cumulativeRequests: { label: "Requests acumuladas", color: "#22c55e" },
    errorRate: { label: "Taxa de erro", color: "#fb7185" },
  },
};

function LoadTestRunPage() {
  const { runId } = Route.useParams();
  const query = useQuery({
    queryKey: ["traffic", "load-tests", "run", runId],
    queryFn: () => trafficMonitoringApi.getLoadTestRun(runId),
    retry: false,
    refetchInterval: (result) => (result.state.data?.status === "running" ? 2_000 : false),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090b11]">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090b11] text-center text-white">
        <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" />
        <h1 className="text-lg font-semibold">Execucao indisponivel</h1>
        <p className="mt-2 text-sm text-slate-400">
          {(query.error as Error)?.message ?? "Nao foi possivel carregar a execucao."}
        </p>
      </div>
    );
  }

  const run = query.data;
  let cumulativeRequests = 0;
  const chartData = run.timeline.map((point) => {
    cumulativeRequests += point.requests;
    return {
      second: point.elapsedSeconds,
      requests: point.requests,
      failures: point.failures,
      average: Math.round(point.averageDurationMs),
      p95: Math.round(point.p95DurationMs),
      vus: point.activeVirtualUsers,
      cumulativeRequests,
      errorRate: point.requests === 0 ? 0 : (point.failures * 100) / point.requests,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#123047_0%,#090b11_35%)] p-4 text-white sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1800px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold">{run.profileName}</h1>
            <p className="text-xs text-slate-400">
              {run.targetBaseUrl} · inicio {formatDateTime(run.startedAtUtc)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                run.status === "running"
                  ? "animate-pulse bg-emerald-400"
                  : run.status === "completed"
                    ? "bg-cyan-400"
                    : "bg-rose-400"
              }`}
            />
            <span className="font-medium">
              {run.status === "running"
                ? `Executando · ${run.progressPercent.toFixed(0)}%`
                : run.status === "completed"
                  ? "Concluido"
                  : "Falhou"}
            </span>
          </div>
        </header>

        {run.capacityResult ? <CapacitySummary result={run.capacityResult} /> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <LiveChart title="Throughput" subtitle="Requests e falhas por segundo">
            <ChartContainer className="h-full min-h-64 w-full" config={chartConfigs.throughput}>
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,.12)" />
                <XAxis dataKey="second" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-requests)"
                  fill="var(--color-requests)"
                  fillOpacity={0.16}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="failures"
                  stroke="var(--color-failures)"
                  fill="var(--color-failures)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </LiveChart>

          <LiveChart title="Latencia" subtitle="Tempo medio e percentil 95 em milissegundos">
            <ChartContainer className="h-full min-h-64 w-full" config={chartConfigs.latency}>
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,.12)" />
                <XAxis dataKey="second" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="var(--color-average)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  stroke="var(--color-p95)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </LiveChart>

          <LiveChart title="Concorrencia" subtitle="Usuarios virtuais ativos">
            <ChartContainer className="h-full min-h-64 w-full" config={chartConfigs.virtualUsers}>
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,.12)" />
                <XAxis dataKey="second" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="vus"
                  stroke="var(--color-vus)"
                  fill="var(--color-vus)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </LiveChart>

          <LiveChart title="Volume e erros" subtitle="Requests acumuladas e taxa de erro">
            <ChartContainer className="h-full min-h-64 w-full" config={chartConfigs.totals}>
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,.12)" />
                <XAxis dataKey="second" tickLine={false} axisLine={false} />
                <YAxis yAxisId="requests" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="errors"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  yAxisId="requests"
                  type="monotone"
                  dataKey="cumulativeRequests"
                  stroke="var(--color-cumulativeRequests)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="errors"
                  type="monotone"
                  dataKey="errorRate"
                  stroke="var(--color-errorRate)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </LiveChart>
        </div>

        <LoadTestEndpointRankings metrics={run.endpointMetrics ?? []} />
      </div>
    </main>
  );
}

function CapacitySummary({
  result,
}: {
  result: NonNullable<
    Awaited<ReturnType<typeof trafficMonitoringApi.getLoadTestRun>>["capacityResult"]
  >;
}) {
  const failureUsers = result.failureStartedAtUsers?.toLocaleString("pt-BR") ?? "Nao detectado";

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-violet-100">Limite observado da API</h2>
        <p className="text-xs text-slate-400">{capacityStopReason(result.stopReason)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CapacityMetric
          label="Limite estavel estimado"
          value={result.estimatedLimitUsers.toLocaleString("pt-BR")}
        />
        <CapacityMetric
          label="Pico observado"
          value={result.peakObservedUsers.toLocaleString("pt-BR")}
        />
        <CapacityMetric label="Inicio das falhas" value={failureUsers} />
        <CapacityMetric
          label="Meta maxima"
          value={result.maximumTargetUsers.toLocaleString("pt-BR")}
        />
      </div>
    </section>
  );
}

function CapacityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">usuarios virtuais</div>
    </div>
  );
}

function capacityStopReason(reason: string) {
  if (reason === "api-unavailable") {
    return "A execucao foi interrompida automaticamente apos a API atingir 5% de indisponibilidade.";
  }

  if (reason === "maximum-reached") {
    return "A API permaneceu disponivel ate o limite configurado de 5.000 usuarios.";
  }

  if (reason === "interrupted") {
    return "A execucao terminou antes de identificar indisponibilidade ou atingir a meta maxima.";
  }

  return "A carga esta aumentando progressivamente ate a API ficar indisponivel ou atingir 5.000 usuarios.";
}

function LiveChart({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#10131c]/90 p-4 shadow-2xl shadow-black/20">
      <div className="mb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
