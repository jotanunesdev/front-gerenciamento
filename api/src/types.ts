export type ModuleKey = "n8n" | "server_access";
export type AuthProvider = "password" | "google" | "microsoft";

export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  modules: ModuleKey[];
  authProvider: AuthProvider;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  modules: ModuleKey[];
}
