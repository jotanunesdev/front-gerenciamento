/*
  Seed example for the first admin user in SQL Server 2022.
  Replace the values below before running.
*/

DECLARE @UserId UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000000';
DECLARE @Email NVARCHAR(255) = N'admin@empresa.com';
DECLARE @DisplayName NVARCHAR(255) = N'Administrador';

IF NOT EXISTS (
    SELECT 1
    FROM [auth].[users]
    WHERE [id] = @UserId
)
BEGIN
    INSERT INTO [auth].[users] ([id], [email], [raw_user_meta_data])
    VALUES (
        @UserId,
        @Email,
        N'{"display_name":"' + REPLACE(@DisplayName, N'"', N'\"') + N'"}'
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM [dbo].[user_roles]
    WHERE [user_id] = @UserId
      AND [role] = N'admin'
)
BEGIN
    INSERT INTO [dbo].[user_roles] ([user_id], [role])
    VALUES (@UserId, N'admin');
END;
