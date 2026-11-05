import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  authKeys,
  fetchMe,
  loginRequest,
  logoutRequest,
  registerRequest,
  updateProfileRequest,
} from "@/features/auth/api";
import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import type { LoginValues, RegisterValues } from "@/features/auth/schemas";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/api";
import type { User } from "@/types";

function clearSessionQueries(queryClient: ReturnType<typeof useQueryClient>, user: User | null) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "auth",
  });
  queryClient.setQueryData(authKeys.me, user);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    function handleUnauthorized() {
      queryClient.setQueryData(authKeys.me, null);
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [queryClient]);

  const login = useCallback(
    async (values: LoginValues) => {
      const user = await loginRequest({ email: values.email, password: values.password });
      clearSessionQueries(queryClient, user);
      return user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (values: RegisterValues) => {
      const user = await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      clearSessionQueries(queryClient, user);
      return user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSessionQueries(queryClient, null);
    }
  }, [queryClient]);

  const updateProfile = useCallback(
    async (input: { name: string }) => {
      const user = await updateProfileRequest(input);
      queryClient.setQueryData(authKeys.me, user);
      return user;
    },
    [queryClient],
  );

  const refreshUser = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: authKeys.me });
  }, [queryClient]);

  const user = meQuery.data ?? null;
  const value: AuthContextValue = {
    user,
    isLoading: meQuery.isPending,
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
