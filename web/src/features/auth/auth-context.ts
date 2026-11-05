import { createContext, useContext } from "react";

import type { LoginValues, RegisterValues } from "@/features/auth/schemas";
import type { User } from "@/types";

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (values: LoginValues) => Promise<User>;
  register: (values: RegisterValues) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (input: { name: string }) => Promise<User>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return context;
}
