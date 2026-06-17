import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { managementApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ModeBadge } from "@/components/ModeBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDuration } from "@/lib/format";

export function ExecutionDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["n8n", "execution", id],
    queryFn: () => managementApi.getExecution(id!),
    enabled: open && !!id,
    retry: false,
  });

  const notConnected = data && "notConnected" in data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">Detalhe da execucao</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError || notConnected ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
            <p className="max-w-md text-sm text-muted-foreground">
              {notConnected
                ? "Conecte seu n8n para ver os detalhes."
                : (error as Error)?.message ?? "Erro ao carregar a execucao."}
            </p>
          </div>
        ) : data && !("notConnected" in data) ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">
                  {data.workflowName ?? `Workflow ${data.workflowId ?? "?"}`}
                </h3>
                <p className="text-xs text-muted-foreground">#{data.id}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={data.status} />
                <ModeBadge mode={data.mode} size="xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-3">
              <Field label="Inicio" value={formatDateTime(data.startedAt)} />
              <Field label="Fim" value={formatDateTime(data.stoppedAt)} />
              <Field label="Duracao" value={formatDuration(data.startedAt, data.stoppedAt)} />
            </div>

            {data.topError || data.nodeErrors.length > 0 ? (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <XCircle className="h-4 w-4" /> Erros encontrados
                </h4>
                {data.topError ? <ErrorCard error={data.topError} primary /> : null}
                {data.nodeErrors
                  .filter((item) => item.message !== data.topError?.message)
                  .map((item, index) => (
                    <ErrorCard key={`${item.node}-${index}`} error={item} />
                  ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm">Concluida sem erros registrados.</p>
              </div>
            )}

            {data.executedNodes.length > 0 ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold">
                  Nos executados ({data.executedNodes.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.executedNodes.map((node) => (
                    <span
                      key={node}
                      className="max-w-full break-all rounded-md bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground"
                    >
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-1">
              <Button asChild variant="outline" size="sm">
                <Link to="/executions/$id" params={{ id: data.id }}>
                  Abrir pagina completa
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type NodeError = {
  node: string;
  message: string;
  description?: string | null;
  stack?: string | null;
};

function ErrorCard({
  error,
  primary = false,
}: {
  error: NodeError;
  primary?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showStack, setShowStack] = useState(false);

  const copy = async () => {
    const text = [`No: ${error.node}`, error.message, error.description ?? "", error.stack ?? ""]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Erro copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Nao foi possivel copiar");
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        primary ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div
          className={cn(
            "min-w-0 break-words text-xs font-medium uppercase tracking-wide",
            primary ? "text-destructive" : "text-muted-foreground",
          )}
        >
          No: {error.node}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={copy}
          className="-mr-1.5 -mt-1.5 h-7 gap-1.5 px-2 text-xs text-muted-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      <p className="break-words text-sm font-medium">{error.message}</p>
      {error.description ? (
        <p className="mt-1 break-words text-sm text-muted-foreground">{error.description}</p>
      ) : null}

      {error.stack ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowStack((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showStack && "rotate-180")}
            />
            {showStack ? "Ocultar" : "Ver"} stack trace
          </button>
          {showStack ? (
            <pre className="mt-2 max-h-56 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-lg bg-background/60 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
              {error.stack}
            </pre>
          ) : null}
        </div>
      ) : null}
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
