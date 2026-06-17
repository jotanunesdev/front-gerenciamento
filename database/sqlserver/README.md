# FlowControl no SQL Server 2022

Este diretorio contem a traducao da camada de banco do projeto para SQL Server 2022.

## Arquivos

- `flowcontrol_sqlserver_2022.sql`: schema principal idempotente.
- `seed_first_admin.sql`: exemplo para criar o primeiro admin localmente.

## O que foi traduzido

- Tabelas principais: `profiles`, `user_roles`, `user_modules`, `n8n_connections`, `n8n_executions`.
- Tabela de compatibilidade `auth.users` para substituir o gatilho que, no Supabase, nasce de `auth.users`.
- Funcoes `has_role` e `has_module`.
- Triggers de `updated_at`.
- Regras de Row-Level Security usando `SESSION_CONTEXT`.
- Grants basicos para roles `authenticated` e `service_role`.

## Como aplicar

1. Execute `flowcontrol_sqlserver_2022.sql` em um banco SQL Server 2022 vazio.
2. Ajuste e execute `seed_first_admin.sql`.
3. Se voce quiser respeitar as regras de RLS da traducao, defina o contexto da sessao:

```sql
EXEC sys.sp_set_session_context @key = N'app.user_id', @value = N'00000000-0000-0000-0000-000000000000';
EXEC sys.sp_set_session_context @key = N'app.bypass_rls', @value = 0;
```

Para reproduzir o comportamento do `service_role` do Supabase na sessao atual:

```sql
EXEC sys.sp_set_session_context @key = N'app.bypass_rls', @value = 1;
```

## Limite importante

O projeto nao depende so do schema. Hoje a aplicacao usa diretamente:

- Supabase Auth (`signInWithPassword`, OAuth, `auth.admin.createUser`, `auth.admin.deleteUser`, `auth.updateUser`)
- Supabase RPC para `has_role` e `has_module`
- Cliente admin `service_role` para bypass de RLS

Ou seja: este diretorio cobre a base SQL, mas a aplicacao nao passa a funcionar em SQL Server sem refatorar a camada backend em `src/integrations/supabase/` e as server functions em `src/lib/`.

## Observacao sobre a origem

O script foi consolidado a partir de `database/schema.sql` e das migrations em `supabase/migrations/`. Existe drift entre esses dois conjuntos; a traducao prioriza o estado mais recente observado nas migrations para politicas de acesso e mantem o modelo funcional descrito no schema consolidado.
