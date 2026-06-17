import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { z } from "zod";
import { clearSessionCookie, getSessionFromRequest, setSessionCookie, verifyPassword, hashPassword } from "./auth.js";
import { env } from "./config.js";
import { getDb } from "./db.js";
import { n8nFetch } from "./n8n-client.js";
import { getSharedConnection, upsertSharedConnection, deleteSharedConnection } from "./repositories/n8n.js";
import { createUser, deleteUser, findUserByEmail, getProfile, getSessionUserById, listUsers, replaceUserModules, touchLastSignIn, updatePassword, updateProfile } from "./repositories/users.js";
import type { ModuleKey, SessionUser } from "./types.js";

const app = Fastify({ logger: true });

await app.register(cookie);
await app.register(cors, {
  origin: env.API_CORS_ORIGIN,
  credentials: true,
});

declare module "fastify" {
  interface FastifyRequest {
    sessionUser: SessionUser | null;
  }
}

app.addHook("preHandler", async (request) => {
  request.sessionUser = await getSessionFromRequest(request);
});

const moduleSchema = z.enum(["n8n", "server_access"]);

const requireAuth = async (request: any, reply: any) => {
  if (!request.sessionUser) {
    return reply.code(401).send({ error: "Não autenticado." });
  }
};

const requireAdmin = async (request: any, reply: any) => {
  if (!request.sessionUser) {
    return reply.code(401).send({ error: "Não autenticado." });
  }
  if (!request.sessionUser.isAdmin) {
    return reply.code(403).send({ error: "Acesso restrito a administradores." });
  }
};

app.get("/health", async () => ({ ok: true }));

app.post("/auth/login", async (request, reply) => {
  const data = z
    .object({
      email: z.string().trim().email(),
      password: z.string().min(6),
    })
    .parse(request.body);

  const db = await getDb();
  const user = await findUserByEmail(db, data.email);

  if (!user || !user.isActive || !user.passwordHash) {
    return reply.code(401).send({ error: "Credenciais inválidas." });
  }

  const matches = await verifyPassword(data.password, user.passwordHash);
  if (!matches) {
    return reply.code(401).send({ error: "Credenciais inválidas." });
  }

  const sessionUser = await getSessionUserById(db, user.id);
  if (!sessionUser) {
    return reply.code(401).send({ error: "Usuário inativo." });
  }

  await touchLastSignIn(db, user.id);
  await setSessionCookie(reply, sessionUser);

  return { user: sessionUser };
});

app.post("/auth/logout", async (_request, reply) => {
  clearSessionCookie(reply);
  return { ok: true };
});

app.get("/auth/me", { preHandler: requireAuth }, async (request) => {
  const db = await getDb();
  return { user: await getSessionUserById(db, request.sessionUser!.id) };
});

app.get("/profile", { preHandler: requireAuth }, async (request) => {
  const db = await getDb();
  return getProfile(db, request.sessionUser!.id);
});

app.put("/profile", { preHandler: requireAuth }, async (request, reply) => {
  const data = z
    .object({
      displayName: z.string().trim().min(1).max(80),
    })
    .parse(request.body);

  const db = await getDb();
  await updateProfile(db, request.sessionUser!.id, data.displayName);
  const sessionUser = await getSessionUserById(db, request.sessionUser!.id);
  if (sessionUser) {
    await setSessionCookie(reply, sessionUser);
  }
  return { ok: true };
});

app.put("/profile/password", { preHandler: requireAuth }, async (request) => {
  const data = z
    .object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6).max(72),
    })
    .parse(request.body);

  const db = await getDb();
  const user = await findUserByEmail(db, request.sessionUser!.email);
  if (!user?.passwordHash) {
    return { ok: false, error: "Este usuário não possui login por senha." };
  }

  const matches = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!matches) {
    return { ok: false, error: "Senha atual inválida." };
  }

  await updatePassword(db, request.sessionUser!.id, await hashPassword(data.newPassword));
  return { ok: true };
});

app.get("/modules/me", { preHandler: requireAuth }, async (request) => ({
  isAdmin: request.sessionUser!.isAdmin,
  modules: request.sessionUser!.modules,
}));

app.get("/users", { preHandler: requireAdmin }, async () => {
  const db = await getDb();
  return { users: await listUsers(db) };
});

app.post("/users", { preHandler: requireAdmin }, async (request) => {
  const data = z
    .object({
      email: z.string().trim().email().max(255),
      password: z.string().min(6).max(72).optional(),
      authMethod: z.enum(["password", "google", "microsoft"]).default("password"),
      displayName: z.string().trim().max(80).optional(),
      isAdmin: z.boolean().default(false),
      modules: z.array(moduleSchema).default([]),
    })
    .refine((value) => value.authMethod !== "password" || !!value.password, {
      path: ["password"],
      message: "Senha obrigatória para login por senha.",
    })
    .parse(request.body);

  const db = await getDb();
  const existing = await findUserByEmail(db, data.email);
  if (existing) {
    return { ok: false, error: "Já existe um usuário com esse e-mail." };
  }

  await createUser(db, {
    email: data.email,
    passwordHash: data.password ? await hashPassword(data.password) : null,
    authProvider: data.authMethod,
    displayName: data.displayName ?? null,
    isAdmin: data.isAdmin,
    modules: data.modules as ModuleKey[],
  });

  return { ok: true };
});

app.put("/users/:id/modules", { preHandler: requireAdmin }, async (request) => {
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = z
    .object({
      modules: z.array(moduleSchema),
    })
    .parse(request.body);

  const db = await getDb();
  await replaceUserModules(db, params.id, data.modules as ModuleKey[]);
  return { ok: true };
});

app.delete("/users/:id", { preHandler: requireAdmin }, async (request) => {
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  if (params.id === request.sessionUser!.id) {
    return { ok: false, error: "Você não pode remover a si mesmo." };
  }

  const db = await getDb();
  await deleteUser(db, params.id);
  return { ok: true };
});

app.get("/n8n/connection", { preHandler: requireAuth }, async (request, reply) => {
  if (!request.sessionUser!.isAdmin && !request.sessionUser!.modules.includes("n8n")) {
    return reply.code(403).send({ error: "Sem acesso ao módulo n8n." });
  }

  const db = await getDb();
  const connection = await getSharedConnection(db);
  if (!connection) return { connected: false };

  return {
    connected: true,
    id: connection.id,
    name: connection.name,
    baseUrl: connection.base_url,
    updatedAt: connection.updated_at,
  };
});

app.put("/n8n/connection", { preHandler: requireAdmin }, async (request) => {
  const data = z
    .object({
      name: z.string().trim().min(1).max(80),
      baseUrl: z.string().trim().url(),
      apiKey: z.string().trim().min(10).max(2000),
    })
    .parse(request.body);

  await n8nFetch(
    { baseUrl: data.baseUrl, apiKey: data.apiKey },
    "/workflows?limit=1",
  );

  const db = await getDb();
  await upsertSharedConnection(db, {
    userId: request.sessionUser!.id,
    name: data.name,
    baseUrl: data.baseUrl,
    apiKey: data.apiKey,
  });

  return { ok: true };
});

app.delete("/n8n/connection", { preHandler: requireAdmin }, async () => {
  const db = await getDb();
  await deleteSharedConnection(db);
  return { ok: true };
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.code(400).send({
    error: error instanceof Error ? error.message : "Erro inesperado.",
  });
});

const db = await getDb();
await db.request().query("SELECT 1");

await app.listen({
  host: env.API_HOST,
  port: env.API_PORT,
});
