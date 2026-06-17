import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { managementApi, sessionApi, type AppAuthUser } from "@/lib/api";
import {
  completeMicrosoftAuthenticationFromRedirect,
  hasMicrosoftCallbackParams,
} from "@/lib/entra-auth";

interface AuthContextValue {
  user: AppAuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const response = await managementApi.getMe();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (hasMicrosoftCallbackParams()) {
        try {
          await completeMicrosoftAuthenticationFromRedirect();
        } catch {
          setUser(null);
          setLoading(false);
          return;
        }
      }

      await refresh();
    };

    void bootstrap();
  }, []);

  const signOut = async () => {
    await sessionApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
