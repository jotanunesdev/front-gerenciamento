import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { beginMicrosoftAuthentication } from "@/lib/entra-auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar - FlowControl" },
      { name: "description", content: "Acesse o painel administrativo do FlowControl." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, navigate, user]);

  const handleMicrosoftLogin = async () => {
    setBusy(true);
    try {
      await beginMicrosoftAuthentication();
    } catch (error) {
      setBusy(false);
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel iniciar a autenticacao Microsoft.",
      );
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-chart-4/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo} alt="FlowControl" className="mb-4 h-12 w-auto object-contain" />
          <h1 className="text-2xl font-bold tracking-tight">FlowControl</h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel Administrativo</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 text-center">
            <h2 className="text-sm font-semibold">Entrar com Microsoft</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A autenticacao deste sistema usa Microsoft Entra ID.
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => void handleMicrosoftLogin()}
            disabled={busy || loading}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continuar com Microsoft
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Voce sera redirecionado para a autenticacao corporativa da Microsoft.
          </p>
        </div>
      </div>
    </div>
  );
}
