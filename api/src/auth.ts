import { createSecretKey, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "./config.js";
import type { SessionUser } from "./types.js";

const secret = createSecretKey(Buffer.from(env.API_JWT_SECRET, "utf8"));

interface SessionClaims {
  sub: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  modules: string[];
}

export const hashPassword = async (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = async (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signSessionToken = async (user: SessionUser) =>
  new SignJWT({
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
    modules: user.modules,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

export const verifySessionToken = async (token: string): Promise<SessionUser> => {
  const { payload } = await jwtVerify(token, secret);
  const claims = payload as unknown as SessionClaims;

  return {
    id: claims.sub,
    email: claims.email,
    displayName: claims.displayName,
    isAdmin: claims.isAdmin,
    modules: (claims.modules ?? []) as SessionUser["modules"],
  };
};

export const setSessionCookie = async (
  reply: FastifyReply,
  user: SessionUser,
) => {
  const token = await signSessionToken(user);
  reply.setCookie(env.API_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 60 * 60 * 12,
  });
};

export const clearSessionCookie = (reply: FastifyReply) => {
  reply.clearCookie(env.API_COOKIE_NAME, { path: "/" });
};

export const getSessionFromRequest = async (
  request: FastifyRequest,
): Promise<SessionUser | null> => {
  const token = request.cookies[env.API_COOKIE_NAME];
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
};

export const constantEquals = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};
