import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/ENDPOINTS";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        credentials: "include",
      });
      const data = res.ok ? await res.json() : null;
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signInWithGoogle = async (credential: string) => {
    const res = await apiRequest("POST", "/api/auth/google", { credential });
    const data = await res.json();
    setUser(data);
  };

  const signOut = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
