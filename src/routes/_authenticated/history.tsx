import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Loader2,
} from "lucide-react";
import { managementApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ModeBadge } from "@/components/ModeBadge";
import { ExecutionDialog } from "@/components/ExecutionDialog";
import { NotConnected } from "@/components/NotConnected";
import { SyncIndicator } from "@/components/SyncIndicator";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDuration } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Historico - FlowControl" }] }),
  component: HistoryPage,
});

type Filter = "all" | "success" | "error" | "running" | "waiting";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "error", label: "Erros" },
  { value: "success", label: "Sucesso" },
  { value: "running", label: "Executando" },
  { value: "waiting", label: "Aguardando" },
];

const PAGE_SIZE = 50;

function HistoryPage() {
  const [status, setStatus] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["n8n", "history", status, page],
    queryFn: () => managementApi.listHistory({ status, page, pageSize: PAGE_SIZE }),
    retry: false,
  });

  const autoSync = useQuery({
    queryKey: ["n8n", "auto-sync"],
    queryFn: async () => {
      const response = await managementApi.syncExecutions();
      if (!("notConnected" in response)) {
        await queryClient.invalidateQueries({ queryKey: ["n8n", "history"] });
        await queryClient.invalidateQueries({ queryKey: ["n8n", "history-stats"] });
      }
      return response;
    },
    retry: false,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const sync = useMutation({
    mutationFn: () => managementApi.syncExecutions(),
    onSuccess: async (response) => {
      if ("notConnected" in response) {
        toast.error("Conecte seu n8n antes de sincronizar.");
        return;
      }
      toast.success(
        `Sincronizado: ${response.saved} execucoes processadas · ${response.total} no historico.` +
          (response.deleted > 0 ? ` · ${response.deleted} removidas de workflows excluidos.` : ""),
      );
      await queryClient.invalidateQueries({ queryKey: ["n8n", "history"] });
      await queryClient.invalidateQueries({ queryKey: ["n8n", "history-stats"] });
    },
    onError: (mutationError) => {
      toast.error((mutationError as Error)?.message ?? "Falha ao sincronizar.");
    },
  });

  if (data && "notConnected" in data) {
    return <NotConnected />;
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historico</h1>
          <p className="text-sm text-muted-foreground">
            Historico permanente, mantido mesmo apos o n8n apagar execucoes antigas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SyncIndicator
            isFetching={autoSync.isFetching}
            isError={autoSync.isError}
            lastSyncedAt={autoSync.dataUpdatedAt}
          />
          <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            Sincronizar agora
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(0);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                status === filter.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {total > 0 ? (
          <span className="text-xs text-muted-foreground">
            {total} execu{total === 1 ? "cao" : "coes"} no total
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
            <p className="max-w-md px-4 text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Erro ao carregar o historico."}
            </p>
          </div>
        ) : !data || data.executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <DatabaseZap className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma execucao salva ainda.</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Clique em “Sincronizar agora” para puxar e guardar as execucoes do seu n8n.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.executions.map((execution) => (
              <button
                key={execution.id}
                onClick={() => setOpenId(execution.id)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
              >
                <StatusBadge status={execution.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {execution.workflowName ?? `Workflow ${execution.workflowId ?? "?"}`}
                    </span>
                    <ModeBadge mode={execution.mode} size="xs" />
                  </div>
                  <div className="text-xs text-muted-foreground">#{execution.id}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-xs text-foreground">{formatDateTime(execution.startedAt)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(execution.startedAt, execution.stoppedAt)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Pagina {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>
              Proxima <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <ExecutionDialog id={openId} open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)} />
    </div>
  );
}
