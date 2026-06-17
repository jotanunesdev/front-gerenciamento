import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { managementApi } from "@/lib/api";
import { MODULES, type ModuleKey } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Usuarios - FlowControl" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["users", "my-role"],
    queryFn: () => managementApi.getRole(),
    retry: false,
  });
  const isAdmin = role?.isAdmin === true;

  const { data, isLoading } = useQuery({
    queryKey: ["users", "list"],
    queryFn: () => managementApi.listUsers(),
    retry: false,
    enabled: isAdmin,
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "microsoft">("password");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [modules, setModules] = useState<ModuleKey[]>(["n8n"]);
  const [busy, setBusy] = useState(false);

  const toggleModule = (key: ModuleKey) => {
    setModules((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  if (roleLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
        <p className="max-w-md text-sm text-muted-foreground">
          Apenas administradores podem gerenciar logins.
        </p>
      </div>
    );
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await managementApi.createUser({
        email,
        displayName: name || undefined,
        authMethod,
        isAdmin: makeAdmin,
        modules: makeAdmin ? undefined : modules,
      });
      if (!response.ok) {
        toast.error(response.error ?? "Falha ao criar login.");
        return;
      }

      toast.success("Login criado com sucesso.");
      setEmail("");
      setName("");
      setAuthMethod("password");
      setMakeAdmin(false);
      setModules(["n8n"]);
      await qc.invalidateQueries({ queryKey: ["users", "list"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar login.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await managementApi.deleteUser(id);
      if (!response.ok) {
        toast.error(response.error ?? "Falha ao remover login.");
        return;
      }
      toast.success("Login removido.");
      await qc.invalidateQueries({ queryKey: ["users", "list"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover login.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Crie e gerencie os logins de acesso a ferramenta
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleCreate}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] lg:col-span-1"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Criar novo login</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Metodo de acesso</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthMethod("password")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  authMethod === "password"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Usuario e senha
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod("microsoft")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  authMethod === "microsoft"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Microsoft
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              O acesso usa a autenticacao da API. Aqui voce libera o e-mail para entrar no sistema.
            </p>
          </div>

          {!makeAdmin ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Modulos que este usuario podera ver
              </p>
              <div className="space-y-1.5">
                {MODULES.map((moduleItem) => (
                  <label key={moduleItem.key} className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={modules.includes(moduleItem.key)}
                      onChange={() => toggleModule(moduleItem.key)}
                      className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <moduleItem.icon className="h-3.5 w-3.5 text-primary" />
                        {moduleItem.label}
                        {moduleItem.comingSoon ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            em breve
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {moduleItem.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <input
              type="checkbox"
              checked={makeAdmin}
              onChange={(event) => setMakeAdmin(event.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Tornar administrador
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Criar login
          </Button>
        </form>

        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Logins existentes</h2>
            <p className="text-xs text-muted-foreground">{data?.users.length ?? 0} conta(s) com acesso</p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(data?.users ?? []).map((userItem) => (
                <div key={userItem.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
                    {(userItem.displayName ?? userItem.email ?? "?").slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {userItem.displayName || userItem.email}
                      </span>
                      {userItem.isAdmin ? (
                        <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <UserIcon className="h-3 w-3" /> Usuario
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {userItem.email}
                      {userItem.lastSignInAt
                        ? ` · entrou ${formatRelative(userItem.lastSignInAt)}`
                        : " · nunca entrou"}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover login?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O acesso de <span className="font-medium text-foreground">{userItem.email}</span> sera removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(userItem.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
