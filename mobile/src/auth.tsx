import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, clearToken, getToken, setOnUnauthorized, setToken } from "./lib/api";
import type { User } from "./types";

interface Auth {
  user: User | null;
  ready: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const Ctx = createContext<Auth>(null as unknown as Auth);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      qc.clear();
    });
    (async () => {
      try {
        if (await getToken()) setUser((await api<User>("/auth/me")).data);
      } catch {
        // token basi sudah dibersihkan api(); user tetap null -> gate lempar ke /login
      } finally {
        setReady(true);
      }
    })();
    return () => setOnUnauthorized(null);
  }, [qc]);

  async function login(email: string, password: string) {
    const body = await api<User>("/auth/login", { method: "POST", json: { email, password }, auth: false });
    await setToken(body.token as string);
    setUser(body.data);
  }

  async function register(name: string, email: string, password: string) {
    const body = await api<User>("/auth/register", { method: "POST", json: { name, email, password }, auth: false });
    await setToken(body.token as string);
    setUser(body.data);
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      await clearToken();
      setUser(null);
      qc.clear();
    }
  }

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
