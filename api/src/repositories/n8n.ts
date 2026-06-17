import type { ConnectionPool } from "mssql";
import { sql } from "../db.js";

export const getSharedConnection = async (db: ConnectionPool) => {
  const result = await db.request().query(`
    SELECT TOP 1
      id,
      user_id,
      name,
      base_url,
      api_key,
      created_at,
      updated_at
    FROM dbo.n8n_connections
    ORDER BY created_at ASC;
  `);

  return result.recordset[0] ?? null;
};

export const upsertSharedConnection = async (
  db: ConnectionPool,
  input: { userId: string; name: string; baseUrl: string; apiKey: string },
) => {
  const existing = await getSharedConnection(db);
  if (existing) {
    await db
      .request()
      .input("id", sql.UniqueIdentifier, existing.id)
      .input("name", sql.NVarChar(80), input.name)
      .input("baseUrl", sql.NVarChar(2048), input.baseUrl)
      .input("apiKey", sql.NVarChar(2000), input.apiKey)
      .query(`
        UPDATE dbo.n8n_connections
        SET name = @name,
            base_url = @baseUrl,
            api_key = @apiKey,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id;
      `);
    return existing.id as string;
  }

  await db
    .request()
    .input("userId", sql.UniqueIdentifier, input.userId)
    .input("name", sql.NVarChar(80), input.name)
    .input("baseUrl", sql.NVarChar(2048), input.baseUrl)
    .input("apiKey", sql.NVarChar(2000), input.apiKey)
    .query(`
      INSERT INTO dbo.n8n_connections (user_id, name, base_url, api_key)
      VALUES (@userId, @name, @baseUrl, @apiKey);
    `);
};

export const deleteSharedConnection = async (db: ConnectionPool) => {
  await db.request().query(`
    DELETE FROM dbo.n8n_connections;
  `);
};
