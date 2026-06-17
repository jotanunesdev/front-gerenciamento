import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertTriangle,
  BarChart,
  CalendarDays,
  Clock,
  Gauge,
  GitBranch,
  Hand,
  Timer,
  Webhook,
  XCircle,
  Zap,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isNotConnectedPayload, managementApi, type HistoryStatsPayload } from "@/lib/api";
import { NotConnected } from "@/components/NotConnected";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDurationMs } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analises - FlowControl" }] }),
  component: AnalyticsPage,
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const PERIOD_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
];

function AnalyticsPage() {
  const [workflowId, setWorkflowId] = useState("all");
  const [periodDays, setPeriodDays] = useState(30);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["n8n", "history-stats", "analytics", workflowId, periodDays],
    queryFn: () =>
      managementApi.getHistoryStats({
        windowed: true,
        periodDays,
        workflowId: workflowId === "all" ? undefined : workflowId,
      }),
    retry: false,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
        <p className="max-w-md text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Erro ao carregar dados."}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (isNotConnectedPayload(data)) {
    return <NotConnected />;
  }

  const stats = data as HistoryStatsPayload;
  const totals = stats.totals;
  const modes = stats.modeBreakdown;
  const modeTotal = modes.manual + modes.auto + modes.webhook + modes.sub + modes.other || 1;
  const modeRows = [
    { key: "auto", label: "Automaticas", value: modes.auto, Icon: Zap, color: "bg-primary" },
    { key: "webhook", label: "Webhook", value: modes.webhook, Icon: Webhook, color: "bg-sky-500" },
    { key: "sub", label: "Sub-fluxos", value: modes.sub, Icon: GitBranch, color: "bg-violet-500" },
    { key: "manual", label: "Manuais", value: modes.manual, Icon: Hand, color: "bg-amber-500" },
    { key: "other", label: "Outros", value: modes.other, Icon: Clock, color: "bg-muted-foreground" },
  ].filter((row) => row.value > 0);
  const peak = stats.hourly.reduce(
    (best, hour) => (hour.total > best.total ? hour : best),
    stats.hourly[0],
  );
  const kpis = [
    { label: "Execucoes", value: totals.executions, sub: "historico total", Icon: Gauge, color: "text-foreground" },
    { label: "Exito geral", value: `${totals.successRate}%`, sub: `${totals.success} sucessos`, Icon: Gauge, color: "text-success" },
    { label: "Exito automatico", value: `${totals.autoSuccessRate}%`, sub: "sem testes manuais", Icon: Zap, color: "text-primary" },
    { label: "Duracao media", value: formatDurationMs(totals.avgDurationMs), sub: `pico as ${String(peak.hour).padStart(2, "0")}h`, Icon: Timer, color: "text-chart-4" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analises</h1>
          <p className="text-sm text-muted-foreground">
            Padroes de execucao, origem dos disparos e gargalos de desempenho
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          <Select value={workflowId} onValueChange={setWorkflowId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Todos os workflows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os workflows</SelectItem>
              {stats.workflowOptions.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
              <item.Icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{item.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-1 text-sm font-semibold">Origem das execucoes</h2>
          <p className="mb-4 text-xs text-muted-foreground">Quanto do total veio de testes manuais</p>
          <div className="space-y-3.5">
            {modeRows.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados ainda.</p> : null}
            {modeRows.map((row) => {
              const pct = Math.round((row.value / modeTotal) * 100);
              return (
                <div key={row.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <row.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{row.value} · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Atividade por hora</h2>
              <p className="text-xs text-muted-foreground">
                Quando seus workflows mais executam (horario de Brasilia)
              </p>
            </div>
            <Clock className="h-4 w-4 text-chart-4" />
          </div>
          <div className="h-56 xl:h-72 2xl:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={stats.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.013 285)" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={(hour) => `${String(hour).padStart(2, "0")}`} stroke="oklch(0.68 0.012 285)" fontSize={11} interval={1} />
                <YAxis stroke="oklch(0.68 0.012 285)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "oklch(0.28 0.013 285 / 0.4)" }}
                  contentStyle={{
                    background: "oklch(0.2 0.013 285)",
                    border: "1px solid oklch(0.28 0.013 285)",
                    borderRadius: "0.5rem",
                    color: "oklch(0.96 0.004 285)",
                    fontSize: "12px",
                  }}
                  labelFormatter={(hour) => `${String(hour).padStart(2, "0")}:00`}
                />
                <Bar dataKey="success" name="Sucesso" stackId="a" fill="oklch(0.7 0.16 155)" />
                <Bar dataKey="error" name="Erro" stackId="a" fill="oklch(0.62 0.22 22)" radius={[3, 3, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Por dia da semana</h2>
            <CalendarDays className="h-4 w-4 text-chart-4" />
          </div>
          <div className="h-56 xl:h-72 2xl:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={stats.weekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.013 285)" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(day) => WEEKDAYS[day]} stroke="oklch(0.68 0.012 285)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.012 285)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "oklch(0.28 0.013 285 / 0.4)" }}
                  contentStyle={{
                    background: "oklch(0.2 0.013 285)",
                    border: "1px solid oklch(0.28 0.013 285)",
                    borderRadius: "0.5rem",
                    color: "oklch(0.96 0.004 285)",
                    fontSize: "12px",
                  }}
                  labelFormatter={(day) => WEEKDAYS[day as number]}
                />
                <Bar dataKey="total" name="Execucoes" radius={[3, 3, 0, 0]}>
                  {stats.weekday.map((_, index) => (
                    <Cell key={index} fill="oklch(0.62 0.19 264)" />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Mais problematicos</h2>
            <XCircle className="h-4 w-4 text-destructive" />
          </div>
          <div className="space-y-3">
            {stats.topErrorWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum erro registrado.</p>
            ) : null}
            {stats.topErrorWorkflows.map((workflow) => {
              const rate = workflow.total > 0 ? Math.round((workflow.errors / workflow.total) * 100) : 0;
              return (
                <Link
                  key={workflow.id}
                  to="/workflows/$id"
                  params={{ id: workflow.id }}
                  className="block rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2 font-medium">{workflow.name}</span>
                    <span className="shrink-0 text-xs font-medium text-destructive">{rate}%</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {workflow.errors} erro{workflow.errors === 1 ? "" : "s"} em {workflow.total} execucoes
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Mais lentos</h2>
            <Timer className="h-4 w-4 text-chart-4" />
          </div>
          <div className="space-y-3">
            {[...stats.allWorkflows]
              .filter((workflow) => workflow.avgDurationMs != null)
              .sort((left, right) => (right.avgDurationMs ?? 0) - (left.avgDurationMs ?? 0))
              .slice(0, 5)
              .map((workflow) => (
                <Link
                  key={workflow.id}
                  to="/workflows/$id"
                  params={{ id: workflow.id }}
                  className="flex items-center justify-between rounded-lg p-1.5 -m-1.5 text-sm transition-colors hover:bg-accent/40"
                >
                  <span className="truncate pr-2 font-medium">{workflow.name}</span>
                  <span className="shrink-0 text-xs font-medium text-chart-4">
                    {formatDurationMs(workflow.avgDurationMs)}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
