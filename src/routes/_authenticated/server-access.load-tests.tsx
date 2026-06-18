import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Flame,
  Gauge,
  Loader2,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { trafficMonitoringApi, type LoadTestProfilePayload } from "@/lib/api";
import { formatDateTime, formatDurationMs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/server-access/load-tests")({
  head: () => ({ meta: [{ title: "Teste de Carga - FlowControl" }] }),
  component: LoadTestsPage,
});

function LoadTestsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLoadTestsIndex = pathname === "/server-access/load-tests";
  const queryClient = useQueryClient();
  const profilesQuery = useQuery({
    queryKey: ["traffic", "load-tests", "profiles"],
    queryFn: () => trafficMonitoringApi.listLoadTestProfiles(),
    retry: false,
    enabled: isLoadTestsIndex,
  });
  const runsQuery = useQuery({
    queryKey: ["traffic", "load-tests", "runs"],
    queryFn: () => trafficMonitoringApi.listLoadTestRuns(30),
    retry: false,
    refetchInterval: 15_000,
    enabled: isLoadTestsIndex,
  });

  const startMutation = useMutation({
    mutationFn: (profileKey: string) => trafficMonitoringApi.startLoadTest({ profileKey }),
    onSuccess: async (run) => {
      toast.success("Teste iniciado. Abrindo janela de acompanhamento.");
      await queryClient.invalidateQueries({ queryKey: ["traffic", "load-tests", "runs"] });
      openRunWindow(run.runId);
    },
    onError: (error) => {
      toast.error((error as Error)?.message ?? "Nao foi possivel iniciar o teste.");
    },
  });

  if (!isLoadTestsIndex) {
    return <Outlet />;
  }

  const profiles = profilesQuery.data?.profiles ?? [];
  const runs = runsQuery.data?.runs ?? [];
  const activeRunId = runs.find((run) => run.status === "running")?.runId ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Teste de Carga</h1>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Dispare testes `k6` em tres niveis e acompanhe throughput, latencia e concorrencia
            em uma janela dedicada. Todos os resultados ficam salvos no banco de auditoria.
          </p>
        </div>

        {activeRunId ? (
          <Button variant="outline" onClick={() => openRunWindow(activeRunId)}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Abrir execucao ativa
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {profilesQuery.isLoading ? (
          <LoadingCards />
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.key}
              profile={profile}
              disabled={startMutation.isPending || !!activeRunId}
              isStarting={startMutation.isPending && startMutation.variables === profile.key}
              onStart={() => startMutation.mutate(profile.key)}
            />
          ))
        )}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Historico persistido</h2>
            <p className="text-xs text-muted-foreground">
              Execucoes gravadas no banco `GERENCIAMENTO`.
            </p>
          </div>
          {runsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
        </div>

        {runsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : runs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma execucao salva ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Teste</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Inicio</th>
                  <th className="pb-3 pr-4 font-medium">Requests</th>
                  <th className="pb-3 pr-4 font-medium">Erro</th>
                  <th className="pb-3 pr-4 font-medium">P95</th>
                  <th className="pb-3 pl-4 font-medium text-right">Acao</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.runId} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{run.profileName}</div>
                      <div className="text-xs text-muted-foreground">{run.targetBaseUrl}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDateTime(run.startedAtUtc)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {run.totalRequests.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{run.errorRate.toFixed(1)}%</td>
                    <td className="py-3 pr-4">{formatDurationMs(run.p95DurationMs)}</td>
                    <td className="py-3 pl-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => openRunWindow(run.runId)}>
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileCard({
  profile,
  disabled,
  isStarting,
  onStart,
}: {
  profile: LoadTestProfilePayload;
  disabled: boolean;
  isStarting: boolean;
  onStart: () => void;
}) {
  const accent = getProfileAccent(profile.key);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{profile.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{profile.description}</p>
        </div>
        <ProfileIcon profileKey={profile.key} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Duracao estimada"
          value={Math.max(1, Math.round(profile.expectedDurationSeconds / 60))}
          suffix="min"
        />
        <MetricCard label="Pico de VUs" value={profile.maxVirtualUsers} />
      </div>

      <Button className="mt-5 w-full" disabled={disabled} onClick={onStart}>
        {isStarting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Flame className="mr-2 h-4 w-4" />
        )}
        Iniciar teste
      </Button>
    </section>
  );
}

function LoadingCards() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex min-h-60 items-center justify-center rounded-3xl border border-border bg-card"
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ))}
    </>
  );
}

function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/35 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}

function ProfileIcon({ profileKey }: { profileKey: string }) {
  if (profileKey === "baseline") {
    return <ShieldCheck className="h-6 w-6 text-emerald-500" />;
  }

  if (profileKey === "intenso") {
    return <Gauge className="h-6 w-6 text-amber-500" />;
  }

  return <Siren className="h-6 w-6 text-rose-500" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
        Concluido
      </Badge>
    );
  }

  if (status === "failed") {
    return (
      <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/15">Falhou</Badge>
    );
  }

  return (
    <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
      Executando
    </Badge>
  );
}

function getProfileAccent(profileKey: string) {
  if (profileKey === "baseline") {
    return "linear-gradient(90deg, #10b981, #34d399)";
  }

  if (profileKey === "intenso") {
    return "linear-gradient(90deg, #f59e0b, #f97316)";
  }

  return "linear-gradient(90deg, #ef4444, #fb7185)";
}

function openRunWindow(runId: string) {
  const url = `/server-access/load-tests/${runId}`;
  const popup = window.open(url, "_blank", "popup=yes,width=1440,height=960");
  if (!popup) {
    window.location.assign(url);
  }
}
