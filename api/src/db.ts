import sql from "mssql";
import { env } from "./config.js";

let poolPromise: Promise<sql.ConnectionPool> | undefined;

export const getDb = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool({
      server: env.SQLSERVER_HOST,
      port: env.SQLSERVER_PORT,
      database: env.SQLSERVER_DATABASE,
      user: env.SQLSERVER_USER,
      password: env.SQLSERVER_PASSWORD,
      options: {
        encrypt: env.SQLSERVER_ENCRYPT,
        trustServerCertificate: env.SQLSERVER_TRUST_SERVER_CERTIFICATE,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    }).connect();
  }

  return poolPromise;
};

export { sql };
