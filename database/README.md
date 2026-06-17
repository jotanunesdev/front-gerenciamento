# Estrutura do banco de dados

Este projeto guarda os dados em duas áreas principais:

- **Execuções do n8n** — histórico sincronizado dos workflows (`n8n_executions`)
  e a conexão compartilhada com o n8n (`n8n_connections`).
- **Usuários e módulos** — perfis (`profiles`), papéis/admin (`user_roles`) e
  quais módulos cada login enxerga (`user_modules`).

## Como aplicar no seu ambiente

1. Abra um cliente SQL apontando para o seu banco (Supabase ou Postgres).
2. Rode o arquivo [`schema.sql`](./schema.sql) por completo. Ele é idempotente
   (pode rodar mais de uma vez sem erro) e cria tipos, tabelas, permissões
   (GRANT), segurança por linha (RLS), funções e triggers.
3. Crie o primeiro usuário pela tela de login do app.
4. Promova esse usuário a admin (instrução no final do `schema.sql`):

   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('UUID-DO-USUARIO', 'admin');
   ```

5. Logado como admin, cadastre os demais logins e escolha os módulos pela
   própria interface.

> Observação: o trigger que cria o perfil automaticamente depende do schema
> `auth` do Supabase. Em Postgres puro, crie a linha em `profiles` no seu
> próprio fluxo de cadastro (o `schema.sql` só cria o trigger se `auth.users`
> existir).

## SQL Server 2022

Se voce quiser criar a estrutura equivalente em SQL Server 2022, use os
arquivos em `database/sqlserver/`:

- `database/sqlserver/flowcontrol_sqlserver_2022.sql`
- `database/sqlserver/seed_first_admin.sql`
- `database/sqlserver/README.md`
