import { apiRequest } from "./api";
import { setCookie, getCookie, removeCookie } from "@/lib/cookies";

interface SetupStatus {
  is_configured: boolean;
}

interface SetupData {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "owner" | "admin" | "viewer";
  };
}

export async function checkSetupStatus(): Promise<SetupStatus> {
  return apiRequest<SetupStatus>("/setup/status");
}

export async function createAdmin(data: SetupData): Promise<{ message: string }> {
  return apiRequest("/setup", { method: "POST", body: data });
}

export async function loginUser(data: LoginData): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/login", {
    method: "POST",
    body: data,
  });

  setCookie("access_token", response.access_token, 30);
  localStorage.setItem("user", JSON.stringify(response.user));

  return response;
}

export function logout() {
  removeCookie("access_token");
  localStorage.removeItem("user");
}

export function getStoredUser() {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    if (user && (!user.name || user.name.trim().toLowerCase() === "admin")) {
      user.name = "Sayme";
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch {}
    }
    return user;
  } catch {
    return null;
  }
}

export async function refreshUserProfile(): Promise<void> {
  if (!isAuthenticated()) return;
  try {
    const profile = await apiRequest<{ id: number; name: string; email: string; role: "owner" | "admin" | "viewer" }>("/profile");
    if (profile) {
      const current = getStoredUser() || {};
      const updated = {
        ...current,
        id: profile.id,
        name: (!profile.name || profile.name.trim().toLowerCase() === "admin") ? "Sayme" : profile.name,
        email: profile.email,
        role: profile.role || current.role || "owner",
      };
      localStorage.setItem("user", JSON.stringify(updated));
    }
  } catch {
    // Silencioso se estiver offline ou em rota pública
  }
}

export function isAuthenticated(): boolean {
  return !!getCookie("access_token");
}
