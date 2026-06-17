import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Info, Loader2, Save, User } from "lucide-react";
import { managementApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Perfil - FlowControl" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => managementApi.getProfile(),
    retry: false,
  });

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (data) setDisplayName(data.displayName);
  }, [data]);

  const handleSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingName(true);
    try {
      const response = await managementApi.updateProfile(displayName);
      if (!response.ok) {
        toast.error(response.error ?? "Falha ao salvar perfil.");
        return;
      }
      toast.success("Perfil atualizado.");
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar perfil.");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuracao de perfil</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie suas informacoes pessoais no sistema.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSaveName}
            className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-primary" /> Informacoes pessoais
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={data?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                O e-mail nao pode ser alterado por aqui.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome de exibicao</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
            <Button type="submit" disabled={savingName}>
              {savingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar alteracoes
            </Button>
          </form>

          <div className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              A senha nao e mais gerenciada pelo frontend. A autenticacao agora passa pela API em{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                C:\api-gerenciamento
              </code>
              .
            </div>
          </div>
        </>
      )}
    </div>
  );
}
