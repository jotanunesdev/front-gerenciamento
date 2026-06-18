import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Gauge,
  Loader2,
  RefreshCw,
  ServerCog,
  Users,
} from "lucide-react";
import { trafficMonitoringApi } from "@/lib/api";
import { formatDateTime, formatDurationMs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrafficEndpointTable } from "@/components/traffic/TrafficEndpointTable";
import { TrafficKpiCard } from "@/components/traffic/TrafficKpiCard";
import { TrafficDistributionCharts } from "@/components/traffic/TrafficDistributionCharts";
import { TrafficRankingCharts } from "@/components/traffic/TrafficRankingCharts";
import { TrafficTimeSeriesCharts } from "@/components/traffic/TrafficTimeSeriesCharts";

export const Route = createFileRoute("/_authenticated/server-access")({
  head: () => ({ meta: [{ title: "Tráfego de APIs - FlowControl" }] }),
  component: ServerAccessPage,
});

const PERIOD_OPTIONS = [
  { value: 1, label: "24 horas" },
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];
const TRACKED_STATUS_CODES = [200, 400, 401, 403, 404, 500];

function ServerAccessPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDashboardRoute = pathname === "/server-access";
  const [periodDays, setPeriodDays] = useState(7);
  const [apiName, setApiName] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [excludeLoadTestTraffic, setExcludeLoadTestTraffic] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["traffic-monitoring", periodDays, apiName, environment, excludeLoadTestTraffic],
    queryFn: () =>
      trafficMonitoringApi.getDashboard({
        periodDays,
        apiName: apiName === "all" ? undefined : apiName,
        environment: environment === "all" ? undefined : environment,
        excludeLoadTestTraffic,
      }),
    retry: false,
    refetchInterval: 60_000,
    enabled: isDashboardRoute,
  });

  if (!isDashboardRoute) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-lg font-semibold">Monitoramento indisponível</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Não foi possível consultar os dados de tráfego da API."}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const summary = data.summary;
  const statusMap = new Map(data.statusCodes.map((item) => [item.statusCode, item.total]));
  const kpis = [
    {
      label: "Requisições",
      value: summary.totalRequests.toLocaleString("pt-BR"),
      detail: `${summary.uniqueUsers} usuários · ${summary.uniqueSystems} sistemas`,
      icon: Activity,
      iconClassName: "text-primary",
    },
    {
      label: "Tempo médio",
      value: formatDurationMs(summary.averageDurationMs),
      detail: "tempo médio de resposta",
      icon: Clock3,
      iconClassName: "text-chart-4",
    },
    {
      label: "Taxa de erro",
      value: `${summary.errorRate.toFixed(1)}%`,
      detail: `${summary.errorRequests.toLocaleString("pt-BR")} respostas com erro`,
      icon: AlertTriangle,
      iconClassName: summary.errorRate > 5 ? "text-destructive" : "text-warning",
    },
    {
      label: "Volume por minuto",
      value: summary.requestsPerMinute.toFixed(1),
      detail: `pico de ${summary.peakRequestsPerMinute}/min`,
      icon: Gauge,
      iconClassName: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ServerCog className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Tráfego de APIs</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Consumo, desempenho, erros e origem das chamadas monitoradas
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodDays(option.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  periodDays === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Select value={apiName} onValueChange={setApiName}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todas as APIs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as APIs</SelectItem>
              {data.filters.apiNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos os ambientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ambientes</SelectItem>
              {data.filters.environments.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex h-9 items-center gap-2 rounded-md border border-border px-3">
            <Checkbox
              id="exclude-load-test-traffic"
              checked={excludeLoadTestTraffic}
              onCheckedChange={(checked) => setExcludeLoadTestTraffic(checked === true)}
            />
            <Label
              htmlFor="exclude-load-test-traffic"
              className="cursor-pointer whitespace-nowrap text-xs font-medium"
            >
              Ignorar requisições de teste
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <TrafficKpiCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {TRACKED_STATUS_CODES.map((statusCode) => {
          const total = statusMap.get(statusCode) ?? 0;
          const isErrorStatus = statusCode >= 400;
          return (
            <div
              key={statusCode}
              className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div
                className={`font-mono text-sm font-semibold ${isErrorStatus ? "text-destructive" : "text-success"}`}
              >
                HTTP {statusCode}
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums">
                {total.toLocaleString("pt-BR")}
              </div>
              <div className="text-xs text-muted-foreground">respostas</div>
            </div>
          );
        })}
      </div>

      <TrafficDistributionCharts
        statusCodes={data.statusCodes}
        requestsByApi={data.requestsByApi}
      />

      <TrafficTimeSeriesCharts
        timeline={data.timeline}
        requestsPerMinute={data.requestsPerMinute}
        errors500ByHour={data.errors500ByHour}
      />

      <TrafficRankingCharts
        topEndpoints={data.topEndpoints}
        slowestEndpoints={data.slowestEndpoints}
        topErrorEndpoints={data.topErrorEndpoints}
        topUsers={data.topUsers}
      />

      <div className="grid gap-6 2xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Top 10 endpoints mais acessados</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Rotas agrupadas pelo template normalizado
          </p>
          <TrafficEndpointTable rows={data.topEndpoints} emptyMessage="Sem endpoints no período." />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Top 10 endpoints mais lentos</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Considera rotas com pelo menos duas chamadas
          </p>
          <TrafficEndpointTable
            rows={data.slowestEndpoints}
            emptyMessage="Sem dados suficientes para calcular lentidão."
          />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Maiores consumidores</h2>
            <Users className="h-4 w-4 text-chart-4" />
          </div>
          <div className="space-y-3">
            {data.topConsumers.length === 0 ? <EmptyText /> : null}
            {data.topConsumers.map((consumer) => (
              <div
                key={`${consumer.consumerType}-${consumer.consumer}`}
                className="rounded-lg bg-muted/35 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium">{consumer.consumer}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {consumer.total.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{consumer.consumerType === "system" ? "Sistema" : "Usuário"}</span>
                  <span>
                    {consumer.errors} erros · {formatDurationMs(consumer.averageDurationMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-sm font-semibold">Endpoints lentos por usuário</h2>
          <div className="space-y-3">
            {data.slowestEndpointsByUser.length === 0 ? <EmptyText /> : null}
            {data.slowestEndpointsByUser.slice(0, 6).map((row) => (
              <div key={`${row.userName}-${row.httpMethod}-${row.endpoint}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{row.userName}</span>
                  <span className="shrink-0 font-semibold text-warning">
                    {formatDurationMs(row.averageDurationMs)}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {row.httpMethod} {row.endpoint} · {row.total} chamadas
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-sm font-semibold">Erros recentes</h2>
          <div className="space-y-3">
            {data.recentErrors.length === 0 ? <EmptyText label="Nenhum erro no período." /> : null}
            {data.recentErrors.slice(0, 7).map((item) => (
              <div
                key={`${item.requestedAtUtc}-${item.traceId}`}
                className="border-b border-border/50 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs">
                    {item.httpMethod} {item.endpoint}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-destructive">
                    HTTP {item.statusCode}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTime(item.requestedAtUtc)} · {item.userName} ·{" "}
                  {formatDurationMs(item.durationMs)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="text-right text-xs text-muted-foreground">
        Atualizado em {formatDateTime(data.generatedAtUtc)}
      </p>
    </div>
  );
}

function EmptyText({ label = "Sem dados no período." }: { label?: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}
