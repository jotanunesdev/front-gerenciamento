import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  API_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  API_JWT_SECRET: z.string().min(16),
  API_COOKIE_NAME: z.string().min(1).default("flowcontrol_token"),
  SQLSERVER_HOST: z.string().min(1),
  SQLSERVER_PORT: z.coerce.number().int().positive().default(1433),
  SQLSERVER_DATABASE: z.string().min(1),
  SQLSERVER_USER: z.string().min(1),
  SQLSERVER_PASSWORD: z.string().min(1),
  SQLSERVER_ENCRYPT: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SQLSERVER_TRUST_SERVER_CERTIFICATE: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  N8N_DEFAULT_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
});

export const env = envSchema.parse(process.env);
