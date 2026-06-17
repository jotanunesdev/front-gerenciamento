import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sun,
  Timer,
  Workflow as WorkflowIcon,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isNotConnectedPayload, managementApi, type HistoryStatsPayload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ExecutionDialog } from "@/components/ExecutionDialog";
import { ModeBadge } from "@/components/ModeBadge";
import { NotConnected } from "@/components/NotConnected";
import { SyncIndicator } from "@/components/SyncIndicator";
import { TablePager } from "@/components/TablePager";
import { formatDurationMs, formatRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - FlowControl" }] }),
  component: DashboardPage,
});

const PERIOD_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
];

function DashboardPage() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(14);
  const [wfPage, setWfPage] = useState(1);
  const WF_PAGE_SIZE = 10;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["n8n", "history-stats", periodDays],
    queryFn: () => managementApi.getHistoryStats({ periodDays }),
    retry: false,
    refetchInterval: 30000,
  });

  const autoSync = useQuery({
    queryKey: ["n8n", "auto-sync"],
    queryFn: async () => {
      const response = await managementApi.syncExecutions();
      if (!("notConnected" in response)) {
        await queryClient.invalidateQueries({ queryKey: ["n8n", "history-stats"] });
        await queryClient.invalidateQueries({ queryKey: ["n8n", "history"] });
      }
      return response;
    },
    retry: false,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
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
          {(error as Error)?.message ?? "Erro ao carregar dados do n8n."}
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
  const t = stats.totals;
  const cards = [
    {
      label: "Workflows",
      value: t.workflows,
      sub: `${t.activeWorkflows} ativos`,
      icon: WorkflowIcon,
      color: "text-chart-4",
    },
    {
      label: "Execucoes (total)",
      value: t.executions,
      sub: "historico completo",
      icon: Activity,
      color: "text-foreground",
    },
    {
      label: "Sucessos",
      value: t.success,
      sub: `${t.successRate}% de exito`,
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      label: "Erros",
      value: t.errorReal,
      sub:
        t.errorManual > 0
          ? `+${t.errorManual} em testes manuais`
          : t.running > 0
            ? `${t.running} em execucao`
            : "erros reais",
      icon: XCircle,
      color: "text-destructive",
    },
  ];

  const todayRate = t.todayTotal > 0 ? Math.round((t.todaySuccess / t.todayTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visao geral das execucoes dos seus workflows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncIndicator
            isFetching={autoSync.isFetching}
            isError={autoSync.isError}
            lastSyncedAt={autoSync.dataUpdatedAt}
          />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Hoje</h2>
              <p className="text-xs text-muted-foreground">
                Execucoes registradas no dia de hoje
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-4 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
            <TodayStat label="Total" value={t.todayTotal} className="text-foreground" />
            <TodayStat label="Sucessos" value={t.todaySuccess} className="text-success" />
            <TodayStat label="Erros reais" value={t.todayErrorReal} className="text-destructive" />
            <TodayStat label="Erros (teste)" value={t.todayErrorManual} className="text-amber-500" />
            <TodayStat label="Automaticas" value={t.todayAuto} className="text-foreground" />
            <TodayStat label="Manuais" value={t.todayManual} className="text-amber-500" />
            <TodayStat label="Exito" value={`${todayRate}%`} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Execucoes nos ultimos {periodDays} dias</h2>
            <div className="flex items-center gap-2">
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
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <Timer className="h-3.5 w-3.5 text-chart-4" />
                media {formatDurationMs(t.avgDurationMs)}
              </span>
            </div>
          </div>

          <div className="h-64 xl:h-80 2xl:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <defs>
                  <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.22 22)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.62 0.22 22)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.013 285)" />
                <XAxis dataKey="date" tickFormatter={(date) => date.slice(5)} stroke="oklch(0.68 0.012 285)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.012 285)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.2 0.013 285)",
                    border: "1px solid oklch(0.28 0.013 285)",
                    borderRadius: "0.5rem",
                    color: "oklch(0.96 0.004 285)",
                    fontSize: "12px",
                  }}
                  labelFormatter={(date) => `Dia ${date}`}
                />
                <Area type="monotone" dataKey="success" name="Sucesso" stroke="oklch(0.7 0.16 155)" fill="url(#gSuccess)" strokeWidth={2} />
                <Area type="monotone" dataKey="error" name="Erro" stroke="oklch(0.62 0.22 22)" fill="url(#gError)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-sm font-semibold">Workflows mais ativos</h2>
          <div className="space-y-4">
            {stats.topWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma execucao ainda.</p>
            ) : null}
            {stats.topWorkflows.map((workflow) => {
              const successPct = workflow.total > 0 ? (workflow.success / workflow.total) * 100 : 0;
              const errorPct = workflow.total > 0 ? (workflow.errors / workflow.total) * 100 : 0;
              const otherPct = Math.max(0, 100 - successPct - errorPct);
              return (
                <Link
                  key={workflow.id}
                  to="/workflows/$id"
                  params={{ id: workflow.id }}
                  className="block rounded-lg p-1 -m-1 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2 pr-2 font-medium">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          workflow.active ? "bg-success" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="truncate">{workflow.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {workflow.total} exec.
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-success" style={{ width: `${successPct}%` }} />
                    <div className="h-full bg-destructive" style={{ width: `${errorPct}%` }} />
                    <div className="h-full bg-chart-4" style={{ width: `${otherPct}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      {workflow.success} sucesso{workflow.success === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-3 w-3" />
                      {workflow.errors} erro{workflow.errors === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto text-muted-foreground">{Math.round(errorPct)}% falha</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Erros recentes</h2>
            <p className="text-xs text-muted-foreground">Ultimas falhas registradas no historico</p>
          </div>
          <XCircle className="h-4 w-4 text-destructive" />
        </div>
        {stats.recentErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <CheckCircle2 className="mb-2 h-7 w-7 text-success" />
            <p className="text-sm text-muted-foreground">Nenhum erro registrado. Tudo funcionando.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentErrors.map((execution) => (
              <button
                key={execution.id}
                onClick={() => setOpenId(execution.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                  <XCircle className="h-4 w-4 text-destructive" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {execution.workflowName ?? "Workflow desconhecido"}
                    </span>
                    <ModeBadge mode={execution.mode} size="xs" />
                  </div>
                  <div className="text-xs text-muted-foreground">#{execution.id}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(execution.startedAt)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Desempenho por workflow</h2>
          <p className="text-xs text-muted-foreground">Execucoes de sucesso e erro de cada workflow</p>
        </div>
        {stats.allWorkflows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma execucao ainda.</p>
        ) : (
          (() => {
            const all = stats.allWorkflows;
            const pageCount = Math.max(1, Math.ceil(all.length / WF_PAGE_SIZE));
            const current = Math.min(wfPage, pageCount);
            const rows = all.slice((current - 1) * WF_PAGE_SIZE, current * WF_PAGE_SIZE);
            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-5 py-2.5 text-left font-medium">Workflow</th>
                        <th className="px-3 py-2.5 text-right font-medium">Total</th>
                        <th className="px-3 py-2.5 text-right font-medium">Sucesso</th>
                        <th className="px-3 py-2.5 text-right font-medium">Erro</th>
                        <th className="px-3 py-2.5 text-right font-medium">Outros</th>
                        <th className="px-5 py-2.5 text-right font-medium">% exito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((workflow) => {
                        const others = workflow.running + workflow.waiting;
                        const okRate = workflow.total > 0 ? Math.round((workflow.success / workflow.total) * 100) : 0;
                        return (
                          <tr key={workflow.id} className="hover:bg-accent/40">
                            <td className="px-5 py-2.5">
                              <span className="flex items-center gap-2">
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                    workflow.active ? "bg-success" : "bg-muted-foreground/40"
                                  }`}
                                />
                                <span className="truncate font-medium">{workflow.name}</span>
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{workflow.total}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-success">{workflow.success}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-destructive">{workflow.errors}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{others}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums font-medium">{okRate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <TablePager
                  page={current}
                  pageCount={pageCount}
                  total={all.length}
                  pageSize={WF_PAGE_SIZE}
                  onPageChange={setWfPage}
                  itemLabel="workflows"
                />
              </>
            );
          })()
        )}
      </div>

      <ExecutionDialog id={openId} open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)} />
    </div>
  );
}

function TodayStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold tabular-nums ${className ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
