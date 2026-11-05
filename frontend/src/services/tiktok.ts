import { apiRequest } from "./api";

export interface TikTokAccount {
  id: number;
  label: string;
  advertiser_id: string;
  token_valid: boolean;
  created_at?: string;
}

export interface TikTokOverviewResponse {
  connected: boolean;
  accounts: TikTokAccount[];
  total_accounts: number;
  last_synced?: string | null;
}

export interface TikTokConnectPayload {
  label: string;
  advertiser_id: string;
  access_token: string;
  app_id?: string;
  secret?: string;
}

export interface TikTokSyncResponse {
  status: string;
  synced_accounts: number;
  total_accounts: number;
  errors?: string[];
  message: string;
}

export async function fetchTikTokOverview(): Promise<TikTokOverviewResponse> {
  return await apiRequest<TikTokOverviewResponse>("/tiktok/overview");
}

export async function connectTikTokAccount(
  payload: TikTokConnectPayload
): Promise<TikTokAccount> {
  return await apiRequest<TikTokAccount>("/tiktok/connect", {
    method: "POST",
    body: payload,
  });
}

export async function disconnectTikTokAccount(
  accountId: number
): Promise<{ status: string; message: string }> {
  return await apiRequest<{ status: string; message: string }>(`/tiktok/accounts/${accountId}`, {
    method: "DELETE",
  });
}

export async function syncTikTokSpend(): Promise<TikTokSyncResponse> {
  return await apiRequest<TikTokSyncResponse>("/tiktok/sync", {
    method: "POST",
  });
}

export async function fetchTikTokOAuthUrl(appId?: string): Promise<{ oauth_url: string; instructions: string }> {
  const query = appId ? `?app_id=${encodeURIComponent(appId)}` : "";
  return await apiRequest<{ oauth_url: string; instructions: string }>(`/tiktok/oauth-url${query}`);
}

