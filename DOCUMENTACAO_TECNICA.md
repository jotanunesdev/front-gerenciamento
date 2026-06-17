# FlowControl — Documentação Técnica

Documento de referência para o time de desenvolvimento. Cobre a stack, a
arquitetura, padrões de código, banco de dados, segurança, gráficos e o passo a
passo para **adicionar novos módulos** ao sistema.

> Público-alvo: pessoa desenvolvedora que vai manter o sistema e adicionar
> funcionalidades. Não é necessário conhecimento prévio do projeto.

---

## 1. Visão geral do produto

**FlowControl** é um painel administrativo (multi-módulo) construído sobre
**TanStack Start** (React 19 full-stack) com backend gerenciado (Supabase:
Postgres + Auth + Storage + Edge).

Hoje existem dois módulos:

| Módulo | Chave (`ModuleKey`) | Status | Função |
|--------|--------------------|--------|--------|
| n8n / Workflows | `n8n` | Ativo | Monitora execuções e workflows de uma instância n8n |
| Acesso a Servidores | `server_access` | Em breve | Monitora acesso de terceiros a servidores |

A ideia central: o **admin configura uma conexão única** com o n8n e
**concede módulos por usuário**. Cada login só enxerga os módulos liberados.

---

## 2. Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | **TypeScript** (strict) |
| Framework | **TanStack Start v1** (SSR + server functions) |
| Roteamento | **TanStack Router** (file-based, type-safe) |
| Build | **Vite 7** |
| UI | **React 19**, **shadcn/ui** (Radix), **Tailwind CSS v4** |
| Estado/dados | **TanStack Query** (`@tanstack/react-query`) |
| Gráficos | **Recharts** (wrapper shadcn em `components/ui/chart.tsx`) |
| Ícones | **lucide-react** |
| Formulários | **react-hook-form** + **zod** |
| Datas | **date-fns** |
| Backend | **Supabase** (Postgres, Auth, RLS) |
| Runtime servidor | Cloudflare Workers (edge, `nodejs_compat`) |
| Gerenciador de pacotes | **bun** (há `bun.lock`) |

### Scripts (`package.json`)

```bash
bun install        # instala dependências
bun run dev        # ambiente de desenvolvimento (Vite)
bun run build      # build de produção
bun run build:dev  # build modo development
bun run preview    # serve o build
bun run lint       # ESLint
bun run format     # Prettier
```

---

## 3. Estrutura de pastas

```text
src/
  routes/                      # Rotas (file-based routing)
    __root.tsx                 # Layout raiz: <html>, <head>, providers
    index.tsx                  # Landing/redirect "/"
    auth.tsx                   # Tela de login/cadastro
    sitemap[.]xml.ts           # Sitemap
    _authenticated/            # Layout protegido (exige login)
      route.tsx                # Sidebar, seletor de módulo, guarda de auth
      dashboard.tsx            # Painel n8n (KPIs + gráfico de área)
      analytics.tsx            # Análises n8n (gráficos + paginação)
      executions.tsx           # Lista de execuções (filtros de período)
      executions_.$id.tsx      # Detalhe de uma execução
      history.tsx              # Histórico
      workflows.tsx            # Lista de workflows
      workflows_.$id.tsx       # Detalhe de um workflow
      server-access.tsx        # Módulo "em breve"
      users.tsx                # Admin: gestão de usuários e módulos
      profile.tsx              # Perfil do usuário
      settings.tsx             # Conexão com o n8n (admin)

  components/
    ui/                        # shadcn/ui (não editar manualmente, gerado)
    ExecutionDialog.tsx        # Componentes reutilizáveis do domínio
    StatusBadge.tsx, ModeBadge.tsx, SyncIndicator.tsx
    NotConnected.tsx           # Estado "n8n não conectado"
    TablePager.tsx             # Paginação reutilizável

  hooks/
    useAuth.tsx                # Contexto de autenticação (sessão Supabase)
    use-mobile.tsx

  lib/
    modules.ts                 # ⭐ Catálogo de módulos e navegação
    n8n.functions.ts           # Server functions do n8n (RPC do cliente)
    n8n.server.ts              # Helpers server-only (fetch ao n8n, agregações)
    users.functions.ts         # Server functions de admin (usuários/módulos)
    profile.functions.ts       # Server functions de perfil
    format.ts                  # Formatação de data/duração (pt-BR)
    config.server.ts           # Leitura de env server-only
    utils.ts                   # cn() e helpers
    api/example.functions.ts   # Exemplo de server function

  integrations/
    supabase/
      client.ts                # Cliente browser (anon key, respeita RLS) — NÃO editar
      client.server.ts         # Cliente admin (service role, ignora RLS) — NÃO editar
      auth-middleware.ts       # requireSupabaseAuth (middleware) — NÃO editar
      auth-attacher.ts         # attachSupabaseAuth (token no RPC) — NÃO editar
      types.ts                 # Tipos gerados do schema — NÃO editar
    lovable/index.ts

  styles.css                   # Tailwind v4 + design tokens (cores, fontes)
  start.ts                     # Registro de middlewares globais
  router.tsx                   # Bootstrap do router

database/
  schema.sql                   # Schema completo idempotente
  README.md                    # Como aplicar o banco

supabase/migrations/           # Migrações versionadas
```

---

## 4. Roteamento (TanStack Router)

Roteamento é **baseado em arquivos** em `src/routes/`. O arquivo
`src/routeTree.gen.ts` é **gerado automaticamente** — nunca editar à mão.

Convenção de nomes:

| Arquivo | URL |
|---------|-----|
| `index.tsx` | `/` |
| `auth.tsx` | `/auth` |
| `_authenticated/dashboard.tsx` | `/dashboard` (protegido) |
| `_authenticated/executions_.$id.tsx` | `/executions/:id` |

- Pastas/arquivos com **`_` na frente** são *layout routes* (não aparecem na
  URL). `_authenticated/` é o layout que exige login.
- **`$param`** é segmento dinâmico. O `_` antes do ponto (`executions_.$id`)
  evita que o detalhe herde o layout da lista.
- A string em `createFileRoute("...")` deve **bater exatamente** com o caminho
  gerado pelo nome do arquivo.

Modelo de uma rota nova:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/minha-pagina")({
  head: () => ({ meta: [{ title: "Minha página — FlowControl" }] }),
  component: MinhaPagina,
});

function MinhaPagina() {
  return <div>...</div>;
}
```

Navegação sempre com `<Link to=... />` (type-safe), nunca `<a href>`:

```tsx
import { Link } from "@tanstack/react-router";
<Link to="/executions/$id" params={{ id }}>Ver</Link>
```

---

## 5. Camada de servidor (server functions)

Regra de ouro: **acesso a banco, segredos e APIs externas só dentro de server
functions** (`createServerFn`) — nunca em loaders/componentes diretamente.

### Anatomia

```tsx
// src/lib/exemplo.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const minhaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])          // exige usuário autenticado
  .inputValidator((input: { id: string }) =>  // valida entrada com zod
    z.object({ id: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {      // executa no servidor
    const { supabase, userId } = context;      // cliente com RLS do usuário
    // ... lógica ...
    return { ok: true };                       // retorne sempre DTO simples
  });
```

A cadeia `.inputValidator().handler()` deve ficar **contínua** e nessa ordem.

### Como chamar no cliente

```tsx
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

const fn = useServerFn(minhaFn);
const { data } = useQuery({
  queryKey: ["minha-chave"],
  queryFn: () => fn({ data: { id: "123" } }),
});
```

### Convenção de arquivos

- `*.functions.ts` → contém `createServerFn`; pode ser importado por
  componentes/rotas (o build substitui o corpo por um stub RPC no cliente).
- `*.server.ts` → helpers server-only; **nunca** importar diretamente de uma
  rota/componente. Importar somente de outro `.server.ts` ou **dentro** do
  `.handler()` via `await import(...)`.

### Três clientes Supabase (não confundir)

| Import | Onde usar | Chave | RLS |
|--------|-----------|-------|-----|
| `@/integrations/supabase/client` | Browser (auth, realtime) | publishable | aplica |
| `context.supabase` (via `requireSupabaseAuth`) | Server fn como o usuário | publishable + token | aplica |
| `@/integrations/supabase/client.server` (`supabaseAdmin`) | Server, admin/webhooks | service role | **ignora** |

`supabaseAdmin` só pode ser carregado **dentro** do handler:
`const { supabaseAdmin } = await import("@/integrations/supabase/client.server");`
e sempre depois de autorizar o chamador (ex.: `assertAdmin`).

### Middleware global

Server functions com `requireSupabaseAuth` dependem de `attachSupabaseAuth`
registrado em `src/start.ts` (anexa o token ao RPC). Já está configurado — não
remover.

---

## 6. Autenticação e autorização

- **Sessão**: `useAuth()` (`src/hooks/useAuth.tsx`) expõe `user`, `session`,
  `loading`, `signOut`, ouvindo `supabase.auth.onAuthStateChange`.
- **Guarda de rota**: `_authenticated/route.tsx` redireciona para `/auth` se
  não houver usuário.
- **Papéis (roles)**: armazenados em `user_roles` (NUNCA no perfil). Verificação
  via função `has_role(user_id, role)` (SECURITY DEFINER).
- **Módulos por usuário**: tabela `user_modules` + função
  `has_module(user_id, module)` (admin sempre tem acesso a tudo).

No servidor, autorize sempre com as funções RPC:

```ts
const { data: isAdmin } = await context.supabase.rpc("has_role", {
  _user_id: context.userId, _role: "admin",
});
if (!isAdmin) throw new Error("Forbidden");
```

> Importante: o controle de acesso é **por módulo**, não por conexão. Uma vez
> conectado o n8n, todos com o módulo `n8n` leem os mesmos dados.

---

## 7. Banco de dados

### Tabelas (schema `public`)

| Tabela | Conteúdo |
|--------|----------|
| `profiles` | Perfil do usuário (criado por trigger no signup) |
| `user_roles` | Papéis (`admin`, etc.) — enum `app_role` |
| `user_modules` | Módulos liberados por usuário — enum `app_module` |
| `n8n_connections` | Conexão compartilhada com o n8n (base_url + api_key) |
| `n8n_executions` | Histórico sincronizado de execuções |

### Regras obrigatórias ao criar tabela nova

Toda tabela em `public` precisa de **GRANT + RLS + policies** na mesma migração,
nesta ordem:

```sql
CREATE TABLE public.minha_tabela (...);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.minha_tabela TO authenticated;
GRANT ALL ON public.minha_tabela TO service_role;

ALTER TABLE public.minha_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rows"
  ON public.minha_tabela FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

Sem GRANT, a API retorna erro de permissão mesmo com RLS configurado.

### Funções (SECURITY DEFINER)

`has_role`, `has_module`, `handle_new_user` (cria profile no signup),
`update_updated_at_column` (trigger de `updated_at`).

### Como aplicar o banco

Rodar `database/schema.sql` (idempotente) em um cliente SQL. Depois promover o
primeiro usuário a admin:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('UUID-DO-USUARIO', 'admin');
```

Migrações novas ficam em `supabase/migrations/` (uma por mudança).

---

## 8. Design system (Tailwind v4)

- Tokens definidos em `src/styles.css` (tema escuro por padrão), em `oklch`.
- **Nunca** use classes de cor cruas (`text-white`, `bg-black`). Use sempre os
  tokens semânticos: `bg-background`, `text-foreground`, `bg-primary`,
  `text-muted-foreground`, `border-border`, `text-success`, `text-destructive`,
  `bg-card`, e as cores de gráfico `chart-1..5`.
- Fontes: `--font-sans` (Inter) e `--font-mono` (JetBrains Mono).
- Componentes shadcn/ui ficam em `components/ui/` — preferível customizar via
  variantes (CVA) a editar manualmente.

Para adicionar uma cor nova: declare a variável em `:root` (e no tema escuro)
dentro de `styles.css` e mapeie em `@theme inline` como `--color-...`.

---

## 9. Gráficos — como criar e reaproveitar

Os gráficos usam **Recharts**. Há dois caminhos:

### A) Direto com Recharts (padrão atual do projeto)

Exemplo real (área), como em `dashboard.tsx`:

```tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

<div className="h-72 w-full">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={timeline}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Area
        type="monotone"
        dataKey="success"
        stroke="var(--color-chart-1)"
        fill="var(--color-chart-1)"
        fillOpacity={0.2}
      />
    </AreaChart>
  </ResponsiveContainer>
</div>
```

Para gráfico de barras, troque por `BarChart`/`Bar` (ver `analytics.tsx`, que
usa `Bar`, `Cell` e cores `var(--color-chart-N)`).

**Boas práticas de cor**: sempre referencie os tokens de tema
(`var(--color-chart-1)` … `--color-chart-5`, `--color-primary`,
`--color-destructive`) para manter consistência e suporte a tema.

### B) Wrapper shadcn (`components/ui/chart.tsx`)

Para legendas/tooltips padronizados, use `ChartContainer` + `ChartConfig`:

```tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const config = {
  success: { label: "Sucesso", color: "var(--color-chart-1)" },
  error:   { label: "Erro",    color: "var(--color-destructive)" },
} satisfies ChartConfig;

<ChartContainer config={config} className="h-72 w-full">
  <BarChart data={data}>
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="success" fill="var(--color-success)" radius={4} />
  </BarChart>
</ChartContainer>
```

### De onde vêm os dados dos gráficos

As agregações são feitas **no servidor**, em `n8n.server.ts` / `n8n.functions.ts`
(ex.: `getHistoryStats` devolve `timeline`, `hourly`, `modeBreakdown`,
`totals`, etc., já agrupados no fuso `America/Sao_Paulo`). Na hora de criar um
gráfico novo, **adicione o cálculo na server function** e consuma via
`useServerFn` + `useQuery` — não agregue grandes volumes no cliente.

### Paginação reutilizável

`components/TablePager.tsx` é o componente padrão de paginação (já usado em
analytics/executions). Uso:

```tsx
const PAGE = 10;
const [page, setPage] = useState(1);
const pageCount = Math.ceil(items.length / PAGE);
const visible = items.slice((page - 1) * PAGE, page * PAGE);

<TablePager
  page={page} pageCount={pageCount} total={items.length}
  pageSize={PAGE} onPageChange={setPage} itemLabel="workflows"
/>
```

---

## 10. Como adicionar um novo MÓDULO (passo a passo)

O sistema foi desenhado para escalar por módulos. Para adicionar, por exemplo,
um módulo "Faturamento":

### Passo 1 — Registrar a chave do módulo no enum do banco

Crie uma migração adicionando o valor ao enum `app_module`:

```sql
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'faturamento';
```

### Passo 2 — Declarar o módulo no catálogo (`src/lib/modules.ts`)

```ts
export type ModuleKey = "n8n" | "server_access" | "faturamento";

// dentro de MODULES:
{
  key: "faturamento",
  label: "Faturamento",
  description: "Controle de faturas e cobranças.",
  icon: Receipt, // import de lucide-react
  nav: [
    { to: "/faturas", label: "Faturas", icon: Receipt },
    { to: "/cobrancas", label: "Cobranças", icon: CreditCard },
  ],
},
```

A sidebar e o seletor de módulo passam a exibir o módulo automaticamente para
quem tiver acesso (a navegação é derivada de `MODULES`).

### Passo 3 — Criar as rotas

Crie os arquivos sob `_authenticated/` (ex.: `_authenticated/faturas.tsx`,
`_authenticated/cobrancas.tsx`) seguindo o modelo da seção 4. Todas as páginas
de módulo ficam dentro de `_authenticated/` para herdar a guarda de login e a
sidebar.

### Passo 4 — Criar as server functions

Em `src/lib/faturamento.functions.ts`, com `requireSupabaseAuth` e uma checagem
de acesso ao módulo (espelhando `assertN8nAccess`):

```ts
async function assertFaturamentoAccess(context) {
  const { data } = await context.supabase.rpc("has_module", {
    _user_id: context.userId, _module: "faturamento",
  });
  if (!data) throw new Error("Sem acesso ao módulo faturamento.");
}
```

### Passo 5 — Tabelas (se houver) com GRANT + RLS

Siga a seção 7 para qualquer tabela nova.

### Passo 6 — Conceder o módulo aos usuários

Logado como admin, em `/users`, marque o módulo para os logins desejados
(usa `setUserModules`). Nada além disso é necessário — a UI reage ao catálogo.

> Resumo do que torna um módulo "plugável": **enum `app_module`** (banco) +
> **entrada em `MODULES`** (navegação/UI) + **rotas** + **server functions com
> `has_module`**. O restante (sidebar, seletor, guarda) é automático.

---

## 11. Integração com o n8n

- A conexão (base URL + API key) é **única e compartilhada**, guardada em
  `n8n_connections`. Só admin cria/edita (tela `/settings`), e a credencial é
  testada antes de salvar (`saveConnection` faz um fetch de teste).
- `n8n.server.ts` centraliza o `n8nFetch` (autenticação por header) e as
  agregações de histórico/estatísticas. A API key **nunca** é devolvida ao
  cliente (`getConnection` retorna só metadados).
- Execuções são paginadas via cursor da API do n8n (limite de 250 por página),
  com `maxTotal` para limitar o histórico carregado.

---

## 12. Segurança — checklist para o time

- [ ] Toda tabela nova em `public` tem GRANT + RLS + policies.
- [ ] Papéis sempre em `user_roles` (nunca no profile) — evita escalonamento.
- [ ] Server functions sensíveis chamam `requireSupabaseAuth` **e** checam
      papel/módulo (`has_role`/`has_module`).
- [ ] `supabaseAdmin` (service role) só dentro de `.handler()` e após autorizar.
- [ ] Segredos lidos só no servidor (`process.env` dentro do handler). Variáveis
      `VITE_*` vão para o cliente — não colocar segredo com esse prefixo.
- [ ] Webhooks/endpoints públicos (se criados) vão em `src/routes/api/public/*`
      e devem verificar assinatura/segredo internamente.

---

## 13. Deploy / publicação

- O app roda em runtime de edge (Cloudflare Workers, `nodejs_compat`). Evite
  pacotes Node-only (que usam `child_process`, binários nativos, `fs.watch`).
- Variáveis de ambiente:
  - Servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY` (lidas via `process.env` no servidor).
  - Cliente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Migrações do banco devem ser aplicadas no ambiente de produção antes do
  deploy do código que depende delas.
- Não editar os arquivos auto-gerados: `src/routeTree.gen.ts`,
  `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`,
  `.env`.

---

## 14. Convenções e cuidados (resumo)

- **TypeScript strict**: todo import precisa resolver; crie o arquivo antes de
  importá-lo.
- Componentes pequenos e focados em `components/`; hooks em `hooks/`.
- Sempre use tokens de cor semânticos do design system.
- Leitura de dados: `useServerFn` + `useQuery` (não `useEffect` + `fetch`).
- Não quebrar a cadeia `createServerFn().inputValidator().handler()`.
- Datas/durações: usar helpers de `src/lib/format.ts` (formatação pt-BR).

---

Dúvidas sobre o domínio começam em três arquivos: **`src/lib/modules.ts`**
(o que existe), **`src/routes/_authenticated/route.tsx`** (como a navegação é
montada) e **`src/lib/n8n.functions.ts`** (como os dados são buscados).
