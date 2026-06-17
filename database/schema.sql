/*
  FlowControl - SQL Server 2022 schema

  This file replaces the original Supabase/Postgres schema with a SQL Server
  equivalent so the database can be created directly in SQL Server.

  It creates:
    - compatibility schemas and roles
    - optional auth.users compatibility table
    - core FlowControl tables
    - constraints, indexes, helper functions and triggers
    - Row-Level Security policies using SESSION_CONTEXT

  Session context conventions:
    - app.user_id:    UNIQUEIDENTIFIER of the authenticated user
    - app.bypass_rls: BIT flag (1 = bypass policies, service-role behavior)
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'auth')
    EXEC(N'CREATE SCHEMA [auth]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'security')
    EXEC(N'CREATE SCHEMA [security]');
GO

IF DATABASE_PRINCIPAL_ID(N'anon') IS NULL
    CREATE ROLE [anon];
GO

IF DATABASE_PRINCIPAL_ID(N'authenticated') IS NULL
    CREATE ROLE [authenticated];
GO

IF DATABASE_PRINCIPAL_ID(N'service_role') IS NULL
    CREATE ROLE [service_role];
GO

IF OBJECT_ID(N'[auth].[users]', N'U') IS NULL
BEGIN
    CREATE TABLE [auth].[users] (
        [id] UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT [PK_auth_users] PRIMARY KEY CLUSTERED,
        [email] NVARCHAR(255) NOT NULL,
        [password_hash] NVARCHAR(255) NULL,
        [auth_provider] NVARCHAR(50) NOT NULL
            CONSTRAINT [DF_auth_users_auth_provider] DEFAULT N'password',
        [is_active] BIT NOT NULL
            CONSTRAINT [DF_auth_users_is_active] DEFAULT ((1)),
        [raw_user_meta_data] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_auth_users_created_at] DEFAULT SYSUTCDATETIME(),
        [updated_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_auth_users_updated_at] DEFAULT SYSUTCDATETIME(),
        [last_sign_in_at] DATETIME2(0) NULL,
        CONSTRAINT [CK_auth_users_raw_user_meta_data_json]
            CHECK ([raw_user_meta_data] IS NULL OR ISJSON([raw_user_meta_data]) = 1)
    );
END;
GO

IF COL_LENGTH(N'auth.users', N'password_hash') IS NULL
    ALTER TABLE [auth].[users] ADD [password_hash] NVARCHAR(255) NULL;
GO

IF COL_LENGTH(N'auth.users', N'auth_provider') IS NULL
BEGIN
    ALTER TABLE [auth].[users]
    ADD [auth_provider] NVARCHAR(50) NOT NULL
        CONSTRAINT [DF_auth_users_auth_provider] DEFAULT N'password';
END;
GO

IF COL_LENGTH(N'auth.users', N'is_active') IS NULL
BEGIN
    ALTER TABLE [auth].[users]
    ADD [is_active] BIT NOT NULL
        CONSTRAINT [DF_auth_users_is_active] DEFAULT ((1));
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_auth_users_email'
      AND object_id = OBJECT_ID(N'[auth].[users]')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_auth_users_email]
        ON [auth].[users] ([email]);
END;
GO

IF OBJECT_ID(N'[dbo].[profiles]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[profiles] (
        [id] UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT [PK_profiles] PRIMARY KEY CLUSTERED,
        [email] NVARCHAR(255) NULL,
        [display_name] NVARCHAR(255) NULL,
        [created_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_profiles_created_at] DEFAULT SYSUTCDATETIME(),
        [updated_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_profiles_updated_at] DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF OBJECT_ID(N'[dbo].[FK_profiles_auth_users]', N'F') IS NULL
BEGIN
    ALTER TABLE [dbo].[profiles]
    ADD CONSTRAINT [FK_profiles_auth_users]
        FOREIGN KEY ([id]) REFERENCES [auth].[users]([id]) ON DELETE CASCADE;
END;
GO

IF OBJECT_ID(N'[dbo].[user_roles]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[user_roles] (
        [id] UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT [DF_user_roles_id] DEFAULT NEWSEQUENTIALID(),
        [user_id] UNIQUEIDENTIFIER NOT NULL,
        [role] NVARCHAR(50) NOT NULL,
        [created_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_user_roles_created_at] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_user_roles] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [CK_user_roles_role] CHECK ([role] IN (N'admin', N'user')),
        CONSTRAINT [UQ_user_roles_user_role] UNIQUE ([user_id], [role])
    );
END;
GO

IF OBJECT_ID(N'[dbo].[FK_user_roles_auth_users]', N'F') IS NULL
BEGIN
    ALTER TABLE [dbo].[user_roles]
    ADD CONSTRAINT [FK_user_roles_auth_users]
        FOREIGN KEY ([user_id]) REFERENCES [auth].[users]([id]) ON DELETE CASCADE;
END;
GO

IF OBJECT_ID(N'[dbo].[user_modules]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[user_modules] (
        [id] UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT [DF_user_modules_id] DEFAULT NEWSEQUENTIALID(),
        [user_id] UNIQUEIDENTIFIER NOT NULL,
        [module] NVARCHAR(50) NOT NULL,
        [created_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_user_modules_created_at] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_user_modules] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [CK_user_modules_module] CHECK ([module] IN (N'n8n', N'server_access')),
        CONSTRAINT [UQ_user_modules_user_module] UNIQUE ([user_id], [module])
    );
END;
GO

IF OBJECT_ID(N'[dbo].[FK_user_modules_auth_users]', N'F') IS NULL
BEGIN
    ALTER TABLE [dbo].[user_modules]
    ADD CONSTRAINT [FK_user_modules_auth_users]
        FOREIGN KEY ([user_id]) REFERENCES [auth].[users]([id]) ON DELETE CASCADE;
END;
GO

IF OBJECT_ID(N'[dbo].[n8n_connections]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[n8n_connections] (
        [id] UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT [DF_n8n_connections_id] DEFAULT NEWSEQUENTIALID(),
        [user_id] UNIQUEIDENTIFIER NOT NULL,
        [name] NVARCHAR(80) NOT NULL
            CONSTRAINT [DF_n8n_connections_name] DEFAULT N'Meu n8n',
        [base_url] NVARCHAR(2048) NOT NULL,
        [api_key] NVARCHAR(2000) NOT NULL,
        [created_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_n8n_connections_created_at] DEFAULT SYSUTCDATETIME(),
        [updated_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_n8n_connections_updated_at] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_n8n_connections] PRIMARY KEY CLUSTERED ([id])
    );
END;
GO

IF OBJECT_ID(N'[dbo].[FK_n8n_connections_auth_users]', N'F') IS NULL
BEGIN
    ALTER TABLE [dbo].[n8n_connections]
    ADD CONSTRAINT [FK_n8n_connections_auth_users]
        FOREIGN KEY ([user_id]) REFERENCES [auth].[users]([id]) ON DELETE CASCADE;
END;
GO

IF OBJECT_ID(N'[dbo].[n8n_executions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[n8n_executions] (
        [id] UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT [DF_n8n_executions_id] DEFAULT NEWSEQUENTIALID(),
        [user_id] UNIQUEIDENTIFIER NOT NULL,
        [execution_id] NVARCHAR(255) NOT NULL,
        [workflow_id] NVARCHAR(255) NULL,
        [workflow_name] NVARCHAR(255) NULL,
        [status] NVARCHAR(50) NOT NULL,
        [mode] NVARCHAR(50) NULL,
        [started_at] DATETIME2(0) NULL,
        [stopped_at] DATETIME2(0) NULL,
        [finished] BIT NOT NULL
            CONSTRAINT [DF_n8n_executions_finished] DEFAULT ((0)),
        [synced_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_n8n_executions_synced_at] DEFAULT SYSUTCDATETIME(),
        [created_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_n8n_executions_created_at] DEFAULT SYSUTCDATETIME(),
        [updated_at] DATETIME2(0) NOT NULL
            CONSTRAINT [DF_n8n_executions_updated_at] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_n8n_executions] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UQ_n8n_executions_user_execution] UNIQUE ([user_id], [execution_id])
    );
END;
GO

IF OBJECT_ID(N'[dbo].[FK_n8n_executions_auth_users]', N'F') IS NULL
BEGIN
    ALTER TABLE [dbo].[n8n_executions]
    ADD CONSTRAINT [FK_n8n_executions_auth_users]
        FOREIGN KEY ([user_id]) REFERENCES [auth].[users]([id]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_n8n_executions_user_started'
      AND object_id = OBJECT_ID(N'[dbo].[n8n_executions]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_n8n_executions_user_started]
        ON [dbo].[n8n_executions] ([user_id], [started_at] DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_n8n_executions_user_status'
      AND object_id = OBJECT_ID(N'[dbo].[n8n_executions]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_n8n_executions_user_status]
        ON [dbo].[n8n_executions] ([user_id], [status]);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_n8n_executions_workflow_id'
      AND object_id = OBJECT_ID(N'[dbo].[n8n_executions]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_n8n_executions_workflow_id]
        ON [dbo].[n8n_executions] ([workflow_id]);
END;
GO

CREATE OR ALTER FUNCTION [dbo].[has_role] (
    @user_id UNIQUEIDENTIFIER,
    @role NVARCHAR(50)
)
RETURNS BIT
AS
BEGIN
    DECLARE @result BIT = 0;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[user_roles] AS [ur]
        WHERE [ur].[user_id] = @user_id
          AND [ur].[role] = @role
    )
    BEGIN
        SET @result = 1;
    END;

    RETURN @result;
END;
GO

CREATE OR ALTER FUNCTION [dbo].[has_module] (
    @user_id UNIQUEIDENTIFIER,
    @module NVARCHAR(50)
)
RETURNS BIT
AS
BEGIN
    DECLARE @result BIT = 0;

    IF dbo.[has_role](@user_id, N'admin') = 1
        RETURN 1;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[user_modules] AS [um]
        WHERE [um].[user_id] = @user_id
          AND [um].[module] = @module
    )
    BEGIN
        SET @result = 1;
    END;

    RETURN @result;
END;
GO

CREATE OR ALTER FUNCTION [security].[fn_same_user_or_bypass] (
    @user_id UNIQUEIDENTIFIER
)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS [fn_securitypredicate_result]
    WHERE COALESCE(TRY_CONVERT(BIT, SESSION_CONTEXT(N'app.bypass_rls')), 0) = 1
       OR TRY_CONVERT(UNIQUEIDENTIFIER, SESSION_CONTEXT(N'app.user_id')) = @user_id;
GO

CREATE OR ALTER FUNCTION [security].[fn_admin_or_bypass] (
    @user_id UNIQUEIDENTIFIER
)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS [fn_securitypredicate_result]
    WHERE COALESCE(TRY_CONVERT(BIT, SESSION_CONTEXT(N'app.bypass_rls')), 0) = 1
       OR EXISTS (
            SELECT 1
            FROM [dbo].[user_roles] AS [ur]
            WHERE [ur].[user_id] = TRY_CONVERT(UNIQUEIDENTIFIER, SESSION_CONTEXT(N'app.user_id'))
              AND [ur].[role] = N'admin'
       );
GO

CREATE OR ALTER TRIGGER [dbo].[tr_profiles_set_updated_at]
ON [dbo].[profiles]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE [p]
    SET [updated_at] = SYSUTCDATETIME()
    FROM [dbo].[profiles] AS [p]
    INNER JOIN [inserted] AS [i]
        ON [p].[id] = [i].[id];
END;
GO

CREATE OR ALTER TRIGGER [dbo].[tr_n8n_connections_set_updated_at]
ON [dbo].[n8n_connections]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE [c]
    SET [updated_at] = SYSUTCDATETIME()
    FROM [dbo].[n8n_connections] AS [c]
    INNER JOIN [inserted] AS [i]
        ON [c].[id] = [i].[id];
END;
GO

CREATE OR ALTER TRIGGER [dbo].[tr_n8n_executions_set_updated_at]
ON [dbo].[n8n_executions]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE [e]
    SET [updated_at] = SYSUTCDATETIME()
    FROM [dbo].[n8n_executions] AS [e]
    INNER JOIN [inserted] AS [i]
        ON [e].[id] = [i].[id];
END;
GO

CREATE OR ALTER TRIGGER [auth].[tr_users_sync_profile]
ON [auth].[users]
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    MERGE [dbo].[profiles] AS [target]
    USING (
        SELECT
            [i].[id],
            [i].[email],
            COALESCE(
                NULLIF(JSON_VALUE([i].[raw_user_meta_data], N'$.display_name'), N''),
                NULLIF(JSON_VALUE([i].[raw_user_meta_data], N'$.full_name'), N''),
                CASE
                    WHEN CHARINDEX(N'@', [i].[email]) > 1
                        THEN LEFT([i].[email], CHARINDEX(N'@', [i].[email]) - 1)
                    ELSE [i].[email]
                END
            ) AS [display_name]
        FROM [inserted] AS [i]
    ) AS [src]
    ON [target].[id] = [src].[id]
    WHEN MATCHED THEN
        UPDATE SET
            [email] = [src].[email],
            [display_name] = [src].[display_name],
            [updated_at] = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT ([id], [email], [display_name])
        VALUES ([src].[id], [src].[email], [src].[display_name]);
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.security_policies
    WHERE name = N'ProfilesPolicy'
      AND schema_id = SCHEMA_ID(N'security')
)
    DROP SECURITY POLICY [security].[ProfilesPolicy];
GO

CREATE SECURITY POLICY [security].[ProfilesPolicy]
ADD FILTER PREDICATE [security].[fn_same_user_or_bypass]([id]) ON [dbo].[profiles],
ADD BLOCK PREDICATE [security].[fn_same_user_or_bypass]([id]) ON [dbo].[profiles] AFTER INSERT,
ADD BLOCK PREDICATE [security].[fn_same_user_or_bypass]([id]) ON [dbo].[profiles] AFTER UPDATE
WITH (STATE = ON);
GO

IF EXISTS (
    SELECT 1
    FROM sys.security_policies
    WHERE name = N'UserRolesPolicy'
      AND schema_id = SCHEMA_ID(N'security')
)
    DROP SECURITY POLICY [security].[UserRolesPolicy];
GO

CREATE SECURITY POLICY [security].[UserRolesPolicy]
ADD FILTER PREDICATE [security].[fn_same_user_or_bypass]([user_id]) ON [dbo].[user_roles],
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[user_roles] AFTER INSERT,
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[user_roles] AFTER UPDATE,
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[user_roles] BEFORE DELETE
WITH (STATE = ON);
GO

IF EXISTS (
    SELECT 1
    FROM sys.security_policies
    WHERE name = N'UserModulesPolicy'
      AND schema_id = SCHEMA_ID(N'security')
)
    DROP SECURITY POLICY [security].[UserModulesPolicy];
GO

CREATE SECURITY POLICY [security].[UserModulesPolicy]
ADD FILTER PREDICATE [security].[fn_same_user_or_bypass]([user_id]) ON [dbo].[user_modules],
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[user_modules] AFTER INSERT,
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[user_modules] AFTER UPDATE,
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[user_modules] BEFORE DELETE
WITH (STATE = ON);
GO

IF EXISTS (
    SELECT 1
    FROM sys.security_policies
    WHERE name = N'N8nConnectionsPolicy'
      AND schema_id = SCHEMA_ID(N'security')
)
    DROP SECURITY POLICY [security].[N8nConnectionsPolicy];
GO

CREATE SECURITY POLICY [security].[N8nConnectionsPolicy]
ADD FILTER PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[n8n_connections],
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[n8n_connections] AFTER INSERT,
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[n8n_connections] AFTER UPDATE,
ADD BLOCK PREDICATE [security].[fn_admin_or_bypass]([user_id]) ON [dbo].[n8n_connections] BEFORE DELETE
WITH (STATE = ON);
GO

IF EXISTS (
    SELECT 1
    FROM sys.security_policies
    WHERE name = N'N8nExecutionsPolicy'
      AND schema_id = SCHEMA_ID(N'security')
)
    DROP SECURITY POLICY [security].[N8nExecutionsPolicy];
GO

CREATE SECURITY POLICY [security].[N8nExecutionsPolicy]
ADD FILTER PREDICATE [security].[fn_same_user_or_bypass]([user_id]) ON [dbo].[n8n_executions],
ADD BLOCK PREDICATE [security].[fn_same_user_or_bypass]([user_id]) ON [dbo].[n8n_executions] AFTER INSERT,
ADD BLOCK PREDICATE [security].[fn_same_user_or_bypass]([user_id]) ON [dbo].[n8n_executions] AFTER UPDATE,
ADD BLOCK PREDICATE [security].[fn_same_user_or_bypass]([user_id]) ON [dbo].[n8n_executions] BEFORE DELETE
WITH (STATE = ON);
GO

GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[profiles] TO [authenticated];
GRANT SELECT ON [dbo].[user_roles] TO [authenticated];
GRANT SELECT ON [dbo].[user_modules] TO [authenticated];
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[n8n_connections] TO [authenticated];
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[n8n_executions] TO [authenticated];
GO

GRANT SELECT, INSERT, UPDATE, DELETE ON [auth].[users] TO [service_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[profiles] TO [service_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[user_roles] TO [service_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[user_modules] TO [service_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[n8n_connections] TO [service_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[n8n_executions] TO [service_role];
GO

REVOKE EXECUTE ON OBJECT::[dbo].[tr_profiles_set_updated_at] FROM PUBLIC;
REVOKE EXECUTE ON OBJECT::[dbo].[tr_n8n_connections_set_updated_at] FROM PUBLIC;
REVOKE EXECUTE ON OBJECT::[dbo].[tr_n8n_executions_set_updated_at] FROM PUBLIC;
REVOKE EXECUTE ON OBJECT::[auth].[tr_users_sync_profile] FROM PUBLIC;
GO

REVOKE EXECUTE ON OBJECT::[dbo].[has_role] FROM [anon];
REVOKE EXECUTE ON OBJECT::[dbo].[has_role] FROM PUBLIC;
REVOKE EXECUTE ON OBJECT::[dbo].[has_module] FROM [anon];
REVOKE EXECUTE ON OBJECT::[dbo].[has_module] FROM PUBLIC;
GRANT EXECUTE ON OBJECT::[dbo].[has_role] TO [authenticated];
GRANT EXECUTE ON OBJECT::[dbo].[has_role] TO [service_role];
GRANT EXECUTE ON OBJECT::[dbo].[has_module] TO [authenticated];
GRANT EXECUTE ON OBJECT::[dbo].[has_module] TO [service_role];
GO

/*
  Example:
    EXEC sys.sp_set_session_context @key = N'app.user_id', @value = N'00000000-0000-0000-0000-000000000000';
    EXEC sys.sp_set_session_context @key = N'app.bypass_rls', @value = 1;

  Seed the first admin with:
    INSERT INTO [dbo].[user_roles] ([user_id], [role])
    VALUES ('00000000-0000-0000-0000-000000000000', N'admin');
*/
