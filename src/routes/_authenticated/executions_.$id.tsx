import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { isNotConnectedPayload, managementApi, type N8nExecutionDetail } from "@/lib/api";
import { NotConnected } from "@/components/NotConnected";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDuration } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/executions_/$id")({
  head: () => ({ meta: [{ title: "Detalhe da execucao - FlowControl" }] }),
  component: ExecutionDetailPage,
});

function ExecutionDetailPage() {
  const { id } = useParams({ from: "/_authenticated/executions_/$id" });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["n8n", "execution", id],
    queryFn: () => managementApi.getExecution(id),
    retry: false,
  });

  if (isNotConnectedPayload(data)) {
    return <NotConnected />;
  }

  const execution = data as N8nExecutionDetail | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/executions">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
          <p className="max-w-md text-sm text-muted-foreground">
            {(error as Error)?.message ?? "Erro ao carregar a execucao."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight">
                  {execution!.workflowName ?? `Workflow ${execution!.workflowId ?? "?"}`}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Execucao #{execution!.id}</p>
              </div>
              <StatusBadge status={execution!.status} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Inicio" value={formatDateTime(execution!.startedAt)} />
              <Field label="Fim" value={formatDateTime(execution!.stoppedAt)} />
              <Field label="Duracao" value={formatDuration(execution!.startedAt, execution!.stoppedAt)} />
              <Field label="Modo" value={execution!.mode ?? "-"} />
            </div>
          </div>

          {execution!.topError || execution!.nodeErrors.length > 0 ? (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <XCircle className="h-4 w-4" /> Erros encontrados
              </h2>

              {execution!.topError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-destructive">
                    No: {execution!.topError.node}
                  </div>
                  <p className="text-sm font-medium">{execution!.topError.message}</p>
                  {execution!.topError.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{execution!.topError.description}</p>
                  ) : null}
                  {execution!.topError.stack ? (
                    <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-background/60 p-3 font-mono text-xs text-muted-foreground">
                      {execution!.topError.stack}
                    </pre>
                  ) : null}
                </div>
              ) : null}

              {execution!.nodeErrors
                .filter((item) => item.message !== execution!.topError?.message)
                .map((item, index) => (
                  <div key={`${item.node}-${index}`} className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      No: {item.node}
                    </div>
                    <p className="text-sm font-medium">{item.message}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-5">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm">Esta execucao foi concluida sem erros registrados.</p>
            </div>
          )}

          {execution!.executedNodes.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold">
                Nos executados ({execution!.executedNodes.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {execution!.executedNodes.map((node) => (
                  <span
                    key={node}
                    className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {node}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
