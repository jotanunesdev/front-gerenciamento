import { createFileRoute } from "@tanstack/react-router";
import { ServerCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/server-access")({
  head: () => ({ meta: [{ title: "Servidores — FlowControl" }] }),
  component: ServerAccessPage,
});

function ServerAccessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Acesso a Servidores
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitoramento de acesso de terceiros aos servidores da empresa
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center shadow-[var(--shadow-card)]">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <ServerCog className="h-7 w-7 text-primary" />
        </span>
        <h2 className="text-lg font-semibold">Módulo em breve</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Este módulo está reservado para o monitoramento de acessos de
          terceiros aos servidores. A estrutura já está pronta — os dados serão
          conectados em breve.
        </p>
      </div>
    </div>
  );
}
