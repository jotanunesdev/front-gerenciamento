import { randomUUID } from "node:crypto";
import type { ConnectionPool } from "mssql";
import { sql } from "../db.js";
import type { AppUser, AuthProvider, ModuleKey, SessionUser } from "../types.js";

const ALL_MODULES: ModuleKey[] = ["n8n", "server_access"];

const parseModulesJson = (modulesJson: string | null | undefined): ModuleKey[] => {
  if (!modulesJson) return [];

  return (JSON.parse(modulesJson) as Array<{ value: ModuleKey }>).map(
    (item) => item.value,
  );
};

const mapUser = (row: any): AppUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name ?? null,
  isAdmin: Boolean(row.is_admin),
  modules: row.is_admin ? [...ALL_MODULES] : parseModulesJson(row.modules_json),
  authProvider: (row.auth_provider ?? "password") as AuthProvider,
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  lastSignInAt: row.last_sign_in_at
    ? new Date(row.last_sign_in_at).toISOString()
    : null,
});

export const listUsers = async (db: ConnectionPool): Promise<AppUser[]> => {
  const result = await db.request().query(`
    SELECT
      u.id,
      u.email,
      p.display_name,
      u.auth_provider,
      u.created_at,
      u.last_sign_in_at,
      CASE WHEN EXISTS (
        SELECT 1 FROM dbo.user_roles ur WHERE ur.user_id = u.id AND ur.role = N'admin'
      ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS is_admin,
      (
        SELECT um.module AS [value]
        FROM dbo.user_modules um
        WHERE um.user_id = u.id
        FOR JSON PATH
      ) AS modules_json
    FROM auth.users u
    LEFT JOIN dbo.profiles p ON p.id = u.id
    WHERE u.is_active = 1
    ORDER BY u.created_at DESC;
  `);

  return result.recordset.map(mapUser);
};

export const findUserByEmail = async (db: ConnectionPool, email: string) => {
  const result = await db.request().input("email", sql.NVarChar(255), email).query(`
    SELECT TOP 1
      u.id,
      u.email,
      u.password_hash,
      u.auth_provider,
      u.is_active,
      u.last_sign_in_at,
      p.display_name,
      CASE WHEN EXISTS (
        SELECT 1 FROM dbo.user_roles ur WHERE ur.user_id = u.id AND ur.role = N'admin'
      ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS is_admin,
      (
        SELECT um.module AS [value]
        FROM dbo.user_modules um
        WHERE um.user_id = u.id
        FOR JSON PATH
      ) AS modules_json
    FROM auth.users u
    LEFT JOIN dbo.profiles p ON p.id = u.id
    WHERE u.email = @email;
  `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string | null,
    authProvider: (row.auth_provider ?? "password") as AuthProvider,
    isActive: Boolean(row.is_active),
    displayName: row.display_name ?? null,
    isAdmin: Boolean(row.is_admin),
    modules: row.is_admin ? [...ALL_MODULES] : parseModulesJson(row.modules_json),
  };
};

export const getSessionUserById = async (
  db: ConnectionPool,
  userId: string,
): Promise<SessionUser | null> => {
  const result = await db.request().input("userId", sql.UniqueIdentifier, userId).query(`
    SELECT TOP 1
      u.id,
      u.email,
      p.display_name,
      CASE WHEN EXISTS (
        SELECT 1 FROM dbo.user_roles ur WHERE ur.user_id = u.id AND ur.role = N'admin'
      ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS is_admin,
      (
        SELECT um.module AS [value]
        FROM dbo.user_modules um
        WHERE um.user_id = u.id
        FOR JSON PATH
      ) AS modules_json
    FROM auth.users u
    LEFT JOIN dbo.profiles p ON p.id = u.id
    WHERE u.id = @userId AND u.is_active = 1;
  `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? null,
    isAdmin: Boolean(row.is_admin),
    modules: row.is_admin ? [...ALL_MODULES] : parseModulesJson(row.modules_json),
  };
};

export const touchLastSignIn = async (db: ConnectionPool, userId: string) => {
  await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`
      UPDATE auth.users
      SET last_sign_in_at = SYSUTCDATETIME(),
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId;
    `);
};

export const getProfile = async (db: ConnectionPool, userId: string) => {
  const result = await db.request().input("userId", sql.UniqueIdentifier, userId).query(`
    SELECT TOP 1
      p.display_name,
      u.email
    FROM auth.users u
    LEFT JOIN dbo.profiles p ON p.id = u.id
    WHERE u.id = @userId;
  `);

  const row = result.recordset[0];
  return {
    displayName: row?.display_name ?? "",
    email: row?.email ?? "",
  };
};

export const updateProfile = async (
  db: ConnectionPool,
  userId: string,
  displayName: string,
) => {
  await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("displayName", sql.NVarChar(255), displayName)
    .query(`
      UPDATE dbo.profiles
      SET display_name = @displayName,
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId;

      UPDATE auth.users
      SET raw_user_meta_data = JSON_MODIFY(
        COALESCE(raw_user_meta_data, N'{}'),
        '$.display_name',
        @displayName
      ),
      updated_at = SYSUTCDATETIME()
      WHERE id = @userId;
    `);
};

export const updatePassword = async (
  db: ConnectionPool,
  userId: string,
  passwordHash: string,
) => {
  await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("passwordHash", sql.NVarChar(255), passwordHash)
    .query(`
      UPDATE auth.users
      SET password_hash = @passwordHash,
          auth_provider = N'password',
          updated_at = SYSUTCDATETIME()
      WHERE id = @userId;
    `);
};

export const createUser = async (
  db: ConnectionPool,
  input: {
    email: string;
    passwordHash: string | null;
    authProvider: AuthProvider;
    displayName: string | null;
    isAdmin: boolean;
    modules: ModuleKey[];
  },
) => {
  const userId = randomUUID();
  const trx = db.transaction();
  await trx.begin();

  try {
    await trx
      .request()
      .input("id", sql.UniqueIdentifier, userId)
      .input("email", sql.NVarChar(255), input.email)
      .input("passwordHash", sql.NVarChar(255), input.passwordHash)
      .input("authProvider", sql.NVarChar(50), input.authProvider)
      .input(
        "rawUserMetaData",
        sql.NVarChar(sql.MAX),
        JSON.stringify(
          input.displayName ? { display_name: input.displayName } : {},
        ),
      )
      .query(`
        INSERT INTO auth.users (
          id, email, password_hash, auth_provider, raw_user_meta_data
        )
        VALUES (
          @id, @email, @passwordHash, @authProvider, @rawUserMetaData
        );
      `);

    await trx
      .request()
      .input("id", sql.UniqueIdentifier, userId)
      .input("role", sql.NVarChar(50), input.isAdmin ? "admin" : "user")
      .query(`
        INSERT INTO dbo.user_roles (user_id, role)
        VALUES (@id, @role);
      `);

    if (!input.isAdmin) {
      for (const moduleKey of input.modules) {
        await trx
          .request()
          .input("id", sql.UniqueIdentifier, userId)
          .input("module", sql.NVarChar(50), moduleKey)
          .query(`
            INSERT INTO dbo.user_modules (user_id, module)
            VALUES (@id, @module);
          `);
      }
    }

    await trx.commit();
    return userId;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
};

export const replaceUserModules = async (
  db: ConnectionPool,
  userId: string,
  modules: ModuleKey[],
) => {
  const trx = db.transaction();
  await trx.begin();

  try {
    await trx
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .query(`
        DELETE FROM dbo.user_modules
        WHERE user_id = @userId;
      `);

    for (const moduleKey of modules) {
      await trx
        .request()
        .input("userId", sql.UniqueIdentifier, userId)
        .input("module", sql.NVarChar(50), moduleKey)
        .query(`
          INSERT INTO dbo.user_modules (user_id, module)
          VALUES (@userId, @module);
        `);
    }

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
};

export const deleteUser = async (db: ConnectionPool, userId: string) => {
  await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`
      DELETE FROM auth.users
      WHERE id = @userId;
    `);
};
