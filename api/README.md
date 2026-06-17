# FlowControl API

API Node separada para substituir o Supabase e conversar com o SQL Server.

## Motivo

O frontend atual roda com TanStack Start e estava acoplado ao Supabase para:

- autenticação
- leitura/escrita de perfil
- gestão de usuários
- módulos por usuário
- conexão compartilhada com o n8n

Como o novo banco é SQL Server, a forma mais segura de migrar é manter o
frontend separado e colocar uma API Node entre a interface e o banco.

## Stack

- `fastify`
- `mssql`
- `jose`
- `bcryptjs`
- `zod`

## Pré-requisitos do banco

Rode primeiro:

- [database/schema.sql](</c:/Users/gustavo.trindade/OneDrive - Jotanunes Construtora LTDA/Downloads/Sistema de gerenciamento 1/database/schema.sql>)

Esse schema já inclui as colunas novas em `auth.users`:

- `password_hash`
- `auth_provider`
- `is_active`

## Configuração

1. Copie `api/.env.example` para `api/.env`
2. Preencha conexão do SQL Server e segredo JWT
3. Instale dependências dentro de `api/`

```bash
cd api
npm install
npm run dev
```

## Endpoints prontos

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /profile`
- `PUT /profile`
- `PUT /profile/password`
- `GET /modules/me`
- `GET /users`
- `POST /users`
- `PUT /users/:id/modules`
- `DELETE /users/:id`
- `GET /n8n/connection`
- `PUT /n8n/connection`
- `DELETE /n8n/connection`

## Observação importante

O frontend principal ainda contém chamadas diretas ao Supabase em `src/`.
Esta API já cobre a base para autenticação e administração, mas a migração
completa ainda pede trocar os pontos do frontend que hoje usam:

- `useAuth`
- `supabase.auth.*`
- `requireSupabaseAuth`
- `context.supabase`
- `supabaseAdmin`

Os próximos alvos naturais são:

1. trocar login/sessão do frontend para esta API
2. migrar `profile.functions.ts` e `users.functions.ts`
3. migrar `n8n.functions.ts` para repositórios SQL Server + rotas HTTP
