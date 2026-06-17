import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Timer,
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
import { isNotConnectedPayload, managementApi, type WorkflowDetailPayload } from "@/lib/api";
import { NotConnected } from "@/components/NotConnected";
import { StatusBadge } from "@/components/StatusBadge";
import { ModeBadge } from "@/components/ModeBadge";
import { formatDateTime, formatDuration, formatDurationMs } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/workflows_/$id")({
  head: () => ({ meta: [{ title: "Detalhe do workflow - FlowControl" }] }),
  component: WorkflowDetailPage,
});

function WorkflowDetailPage() {
  const { id } = useParams({ from: "/_authenticated/workflows_/$id" });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["n8n", "workflow-detail", id],
    queryFn: () => managementApi.getWorkflowDetail(id),
    retry: false,
    refetchInterval: 30000,
  });

  if (isNotConnectedPayload(data)) {
    return <NotConnected />;
  }

  const detail = data as WorkflowDetailPayload | undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/workflows"
        className="-ml-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Workflows
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
          <p className="max-w-md text-sm text-muted-foreground">
            {(error as Error)?.message ?? "Erro ao carregar o workflow."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 truncate text-2xl font-bold tracking-tight">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    detail!.workflow.active
                      ? "bg-success shadow-[0_0_10px_var(--color-success)]"
                      : "bg-muted-foreground/40"
                  }`}
                />
                {detail!.workflow.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail!.workflow.active ? "Ativo" : "Inativo"} · ID {detail!.workflow.id}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Execucoes" value={String(detail!.totals.executions)} icon={Activity} color="text-foreground" />
            <Kpi label="Taxa de exito" value={`${detail!.totals.successRate}%`} icon={CheckCircle2} color="text-success" />
            <Kpi
              label="Erros"
              value={String(detail!.totals.errorReal)}
              sub={detail!.totals.errorManual > 0 ? `+${detail!.totals.errorManual} em testes manuais` : undefined}
              icon={XCircle}
              color="text-destructive"
            />
            <Kpi label="Duracao media" value={formatDurationMs(detail!.totals.avgDurationMs)} icon={Timer} color="text-chart-4" />
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 text-sm font-semibold">Execucoes nos ultimos 14 dias</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={detail!.timeline}>
                  <defs>
                    <linearGradient id="wfSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="wfError" x1="0" y1="0" x2="0" y2="1">
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
                  />
                  <Area type="monotone" dataKey="success" name="Sucesso" stroke="oklch(0.7 0.16 155)" fill="url(#wfSuccess)" strokeWidth={2} />
                  <Area type="monotone" dataKey="error" name="Erro" stroke="oklch(0.62 0.22 22)" fill="url(#wfError)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Execucoes recentes</h2>
            </div>
            {detail!.recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <Circle className="mb-3 h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma execucao salva para este workflow.</p>
                <p className="mt-1 text-xs text-muted-foreground">Sincronize o historico para ver os dados aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {detail!.recent.map((execution) => (
                  <Link
                    key={execution.id}
                    to="/executions/$id"
                    params={{ id: execution.id }}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40"
                  >
                    <StatusBadge status={execution.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{execution.id}</span>
                        <ModeBadge mode={execution.mode} size="xs" />
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-xs text-foreground">{formatDateTime(execution.startedAt)}</div>
                      <div className="text-xs text-muted-foreground">{formatDuration(execution.startedAt, execution.stoppedAt)}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
