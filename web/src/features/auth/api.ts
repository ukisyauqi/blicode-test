import { api } from "@/lib/api";
import type { User } from "@/types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export async function fetchMe(): Promise<User> {
  const response = await api.get<User>("/auth/me");
  return response.data;
}

export async function loginRequest(input: { email: string; password: string }): Promise<User> {
  const response = await api.post<User>("/auth/login", input);
  return response.data;
}

export async function registerRequest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const response = await api.post<User>("/auth/register", input);
  return response.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post<void>("/auth/logout");
}

export async function updateProfileRequest(input: { name: string }): Promise<User> {
  const response = await api.patch<User>("/auth/me", input);
  return response.data;
}

export async function changePasswordRequest(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.patch<void>("/auth/me/password", input);
}
