import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Info, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { managementApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Conexao - FlowControl" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["n8n", "connection"],
    queryFn: () => managementApi.getConnection(),
    retry: false,
  });

  const [name, setName] = useState("Meu n8n");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.connected) {
      setName(data.name ?? "Meu n8n");
      setBaseUrl(data.baseUrl ?? "");
    }
  }, [data]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await managementApi.saveConnection({
        name,
        baseUrl,
        apiKey: apiKey.trim() || undefined,
      });
      if (!response.ok) {
        toast.error(response.error ?? "Falha ao salvar conexao.");
        return;
      }
      toast.success("Conexao salva e testada com sucesso.");
      setApiKey("");
      await qc.invalidateQueries({ queryKey: ["n8n"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar conexao.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await managementApi.deleteConnection();
      toast.success("Conexao removida.");
      setBaseUrl("");
      setApiKey("");
      setName("Meu n8n");
      await qc.invalidateQueries({ queryKey: ["n8n"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover conexao.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conexao com o n8n</h1>
        <p className="text-sm text-muted-foreground">
          Conecte seu n8n usando a URL da instancia e uma API Key.
        </p>
      </div>

      <div className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          No n8n, gere uma API Key em{" "}
          <span className="font-medium text-foreground">Settings → n8n API → Create an API key</span>.
          A URL e o endereco publico da sua instancia, por exemplo{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            https://n8n.seudominio.com
          </code>
          .
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome da conexao</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL da instancia</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://n8n.seudominio.com"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">
              API Key {data?.connected ? "(deixe em branco para manter a atual)" : ""}
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="key"
                type="password"
                className="pl-9"
                placeholder={data?.connected ? "************" : "n8n_api_..."}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                required={!data?.connected}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {data?.connected ? "Salvar alteracoes" : "Conectar"}
            </Button>
            {data?.connected ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={busy}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remover
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
