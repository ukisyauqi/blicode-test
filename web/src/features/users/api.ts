import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PaginationMeta, Role, User } from "@/types";

export type UserStatusFilter = "all" | "active" | "inactive";

export type UserFilters = {
  search: string;
  role: Role | "";
  status: UserStatusFilter;
  page: number;
  limit: number;
};

export type UserListResult = {
  users: User[];
  meta: PaginationMeta;
};

export const USER_SORT = "created_at_desc";

export const userKeys = {
  all: ["users"] as const,
  list: (filters: UserFilters) => ["users", "list", filters] as const,
  detail: (id: string) => ["users", "detail", id] as const,
  reporters: ["users", "reporters"] as const,
};

function normalizeMeta(
  meta: PaginationMeta | undefined,
  users: User[],
  filters: UserFilters,
): PaginationMeta {
  const total = meta?.total ?? users.length;
  return {
    page: meta?.page ?? filters.page,
    limit: meta?.limit ?? filters.limit,
    total,
    totalPages: meta?.totalPages ?? Math.max(1, Math.ceil(total / filters.limit)),
  };
}

export async function listUsers(filters: UserFilters): Promise<UserListResult> {
  const response = await api.get<User[]>("/users", {
    search: filters.search.trim(),
    role: filters.role,
    is_active:
      filters.status === "all" ? undefined : filters.status === "active" ? "true" : "false",
    page: filters.page,
    limit: filters.limit,
  });
  const users = Array.isArray(response.data) ? response.data : [];
  return { users, meta: normalizeMeta(response.meta, users, filters) };
}

export async function getUser(id: string): Promise<User> {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<User> {
  const response = await api.post<User>("/users", input);
  return response.data;
}

export async function updateUser(
  id: string,
  input: { name: string; email: string; role: Role },
): Promise<User> {
  const response = await api.put<User>(`/users/${id}`, input);
  return response.data;
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<User> {
  const response = await api.patch<User>(`/users/${id}/status`, { isActive });
  return response.data;
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await api.patch<void>(`/users/${id}/password`, { password });
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete<void>(`/users/${id}`);
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => listUsers(filters),
    placeholderData: (previous) => previous,
  });
}

export function useReporterOptions(enabled: boolean) {
  return useQuery({
    queryKey: userKeys.reporters,
    queryFn: () => listUsers({ search: "", role: "", status: "all", page: 1, limit: 100 }),
    enabled,
    staleTime: 60_000,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => getUser(id!),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; role: Role }) => updateUser(id, input),
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.detail(id), user);
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({ queryKey: userKeys.reporters });
    },
  });
}

export function useUpdateUserStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => updateUserStatus(id, isActive),
    onSuccess: (user) => {
      // Update detail immediately and refetch it to guarantee UI consistency.
      // api uses cache: "no-store", so refetch won't be overwritten by a stale 304.
      queryClient.setQueryData(userKeys.detail(user.id), user);
      if (id && id !== user.id) queryClient.setQueryData(userKeys.detail(id), user);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) });
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({ queryKey: userKeys.reporters });
    },
  });
}

export function useResetUserPassword(id: string) {
  return useMutation({
    mutationFn: (password: string) => resetUserPassword(id, password),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
