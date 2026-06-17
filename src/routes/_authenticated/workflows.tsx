import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Circle, Loader2, RefreshCw, Workflow } from "lucide-react";
import { managementApi } from "@/lib/api";
import { NotConnected } from "@/components/NotConnected";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/workflows")({
  head: () => ({ meta: [{ title: "Workflows - FlowControl" }] }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["n8n", "workflows"],
    queryFn: () => managementApi.listWorkflows(),
    retry: false,
  });

  if (data && "notConnected" in data) {
    return <NotConnected />;
  }

  const workflows = data?.workflows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">Todos os fluxos do seu n8n</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
          <p className="max-w-md text-sm text-muted-foreground">
            {(error as Error)?.message ?? "Erro ao carregar workflows."}
          </p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Nenhum workflow encontrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Link
              key={workflow.id}
              to="/workflows/$id"
              params={{ id: workflow.id }}
              className="group rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Workflow className="h-5 w-5 text-primary" />
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    workflow.active
                      ? "border-success/30 bg-success/15 text-success"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  <Circle className="h-2 w-2 fill-current" />
                  {workflow.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <h3 className="mt-4 truncate font-semibold">{workflow.name}</h3>
              <div className="mt-1 text-xs text-muted-foreground">
                {workflow.nodeCount} nos · atualizado {formatDateTime(workflow.updatedAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
