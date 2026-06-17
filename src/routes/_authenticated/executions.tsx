import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarIcon,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { managementApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ModeBadge, getModeInfo } from "@/components/ModeBadge";
import { NotConnected } from "@/components/NotConnected";
import { ExecutionDialog } from "@/components/ExecutionDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TablePager } from "@/components/TablePager";
import { formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/executions")({
  head: () => ({ meta: [{ title: "Execucoes - FlowControl" }] }),
  component: ExecutionsPage,
});

type Filter = "all" | "success" | "error" | "running" | "waiting";
type Origin = "all" | "auto" | "manual";
type Period = "all" | "7d" | "14d" | "30d" | "60d" | "90d" | "custom";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "error", label: "Erros" },
  { value: "success", label: "Sucesso" },
  { value: "running", label: "Executando" },
  { value: "waiting", label: "Aguardando" },
];

const origins: { value: Origin; label: string }[] = [
  { value: "all", label: "Todas origens" },
  { value: "auto", label: "Automaticas" },
  { value: "manual", label: "Manuais" },
];

const periods: { value: Period; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "7d", label: "7 dias" },
  { value: "14d", label: "14 dias" },
  { value: "30d", label: "30 dias" },
  { value: "60d", label: "60 dias" },
  { value: "90d", label: "90 dias" },
  { value: "custom", label: "Personalizado" },
];

const PAGE_SIZE = 20;

function ExecutionsPage() {
  const [status, setStatus] = useState<Filter>("all");
  const [origin, setOrigin] = useState<Origin>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["n8n", "stored-executions"],
    queryFn: () => managementApi.listStoredExecutions(),
    retry: false,
    refetchInterval: 30000,
  });

  const range = useMemo<{ from: number; to: number } | null>(() => {
    const now = Date.now();
    const days = (value: number) => ({ from: now - value * 86400000, to: now });
    switch (period) {
      case "7d":
        return days(7);
      case "14d":
        return days(14);
      case "30d":
        return days(30);
      case "60d":
        return days(60);
      case "90d":
        return days(90);
      case "custom": {
        if (!customFrom && !customTo) return null;
        const from = customFrom ? new Date(customFrom).setHours(0, 0, 0, 0) : -Infinity;
        const to = customTo ? new Date(customTo).setHours(23, 59, 59, 999) : Infinity;
        return { from, to };
      }
      default:
        return null;
    }
  }, [customFrom, customTo, period]);

  const query = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!data || "notConnected" in data) return [];
    return data.executions.filter((execution) => {
      if (status !== "all" && execution.status !== status) return false;
      if (
        query !== "" &&
        !(execution.workflowName ?? "").toLowerCase().includes(query) &&
        !execution.id.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (origin === "manual" && !getModeInfo(execution.mode).isManual) return false;
      if (origin === "auto" && getModeInfo(execution.mode).isManual) return false;
      if (range) {
        const timestamp = execution.startedAt ? new Date(execution.startedAt).getTime() : Number.NaN;
        if (Number.isNaN(timestamp) || timestamp < range.from || timestamp > range.to) {
          return false;
        }
      }
      return true;
    });
  }, [data, origin, query, range, status]);

  if (data && "notConnected" in data) {
    return <NotConnected />;
  }

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const resetTo =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Execucoes</h1>
          <p className="text-sm text-muted-foreground">
            Execucoes recentes de todos os workflows
          </p>
        </div>
        <Button variant="outline" size="sm" className="self-start sm:self-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => resetTo(setStatus)(filter.value)}
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
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => resetTo(setSearch)(event.target.value)}
            placeholder="Buscar workflow ou #ID"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {origins.map((item) => (
          <button
            key={item.value}
            onClick={() => resetTo(setOrigin)(item.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              origin === item.value
                ? "border-foreground/40 bg-foreground/5 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Periodo</span>
        <div className="flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
          {periods.map((item) => (
            <button
              key={item.value}
              onClick={() => resetTo(setPeriod)(item.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                period === item.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === "custom" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-7 justify-start text-xs font-normal", !customFrom && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {customFrom ? format(customFrom, "dd/MM/yyyy") : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={(date) => {
                    setCustomFrom(date);
                    setPage(1);
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">ate</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-7 justify-start text-xs font-normal", !customTo && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {customTo ? format(customTo, "dd/MM/yyyy") : "Ate"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={(date) => {
                    setCustomTo(date);
                    setPage(1);
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
            <p className="max-w-md px-4 text-sm text-muted-foreground">
              {(error as Error)?.message ?? "Erro ao carregar execucoes."}
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListChecks className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search.trim() ? "Nenhuma execucao corresponde a busca." : "Nenhuma execucao encontrada."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Workflow</th>
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">Origem</th>
                    <th className="px-4 py-3 text-left font-medium">Inicio</th>
                    <th className="px-4 py-3 text-right font-medium">Duracao</th>
                    <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Fim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((execution) => (
                    <tr
                      key={execution.id}
                      onClick={() => setOpenId(execution.id)}
                      className="cursor-pointer transition-colors hover:bg-accent/40"
                    >
                      <td className="px-4 py-3"><StatusBadge status={execution.status} /></td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[16rem] truncate font-medium">
                          {execution.workflowName ?? `Workflow ${execution.workflowId ?? "?"}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{execution.id}</td>
                      <td className="px-4 py-3"><ModeBadge mode={execution.mode} size="xs" /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(execution.startedAt)}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                        {formatDuration(execution.startedAt, execution.stoppedAt)}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground lg:table-cell">
                        {execution.stoppedAt ? formatDateTime(execution.stoppedAt) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePager
              page={current}
              pageCount={pageCount}
              total={visible.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="execucoes"
            />
          </>
        )}
      </div>

      <ExecutionDialog id={openId} open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)} />
    </div>
  );
}
