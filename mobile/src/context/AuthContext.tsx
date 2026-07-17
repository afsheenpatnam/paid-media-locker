import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, UserProfile } from "../api/client";

const TOKEN_KEY = "pml_auth_token";

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          try {
            const { user: profile } = await api.me(stored);
            setToken(stored);
            setUser(profile);
          } catch {
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
          }
        }
      } catch {
        // e.g. SecureStore is unavailable on this platform (web) -- treat as logged out.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persistSession(newToken: string, profile: UserProfile) {
    // Best-effort: on platforms without SecureStore (web), the session just
    // won't survive a page reload, but login/register still succeeds.
    await SecureStore.setItemAsync(TOKEN_KEY, newToken).catch(() => {});
    setToken(newToken);
    setUser(profile);
  }

  async function login(email: string, password: string) {
    const res = await api.login({ email, password });
    await persistSession(res.token, res.user);
  }

  async function register(email: string, password: string, displayName: string) {
    const res = await api.register({ email, password, displayName });
    await persistSession(res.token, res.user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  }

  async function refreshProfile() {
    if (!token) return;
    const { user: profile } = await api.me(token);
    setUser(profile);
  }

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, refreshProfile }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
