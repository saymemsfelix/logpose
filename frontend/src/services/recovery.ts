import { apiRequest } from "./api";

// ── Types ───────────────────────────────────────────────
export interface RecoveryRow {
  id: string;
  rawId?: number;
  date: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCountry?: string | null;
  product: string;
  type: "abandoned_cart" | "declined_card" | "unpaid_pix" | "trial" | "unidentified";
  amount: number;
  recovered: boolean;
  channel: string;
  recoveredAt: string | null;
  checkoutUrl?: string | null;
  dispatch?: {
    status: "pending" | "sent" | "failed" | "cancelled";
    stepNumber: number;
    strategy: string;
    scheduledAt: string | null;
    sentAt: string | null;
    errorMessage?: string | null;
  };
}

export interface ChannelConfig {
  channel: string;
  keyword: string;
  label?: string | null;
  is_custom?: boolean;
}

export interface CustomChannelPayload {
  name: string;
  keyword: string;
}

// ── Channel Config ──────────────────────────────────────
export async function fetchChannelConfigs(): Promise<ChannelConfig[]> {
  return apiRequest<ChannelConfig[]>("/recovery/config");
}

export async function updateChannelConfigs(
  configs: ChannelConfig[],
): Promise<ChannelConfig[]> {
  return apiRequest<ChannelConfig[]>("/recovery/config", {
    method: "PUT",
    body: { configs },
  });
}

export async function createCustomChannel(
  payload: CustomChannelPayload,
): Promise<ChannelConfig> {
  return apiRequest<ChannelConfig>("/recovery/config/custom", {
    method: "POST",
    body: payload,
  });
}

export async function deleteCustomChannel(channel: string): Promise<void> {
  await apiRequest<void>(`/recovery/config/custom/${channel}`, {
    method: "DELETE",
  });
}

// ── Recoveries ──────────────────────────────────────────
export interface RecoveryListResponse {
  items: RecoveryRow[];
  total: number;
  page: number;
  per_page: number;
}

export interface RecoverySummary {
  total: number;
  recovered: number;
  pending: number;
  recovery_rate: number;
  recovered_amount: number;
  lost_amount: number;
  by_channel: {
    whatsapp: number;
    email: number;
    sms: number;
    back_redirect: number;
    other: number;
    [key: string]: number;
  };
}

export async function fetchRecoveries(params: {
  preset: string;
  dateStart?: string;
  dateEnd?: string;
  typeFilter?: string;
  statusFilter?: string;
  channelFilter?: string;
  productId?: string;
  upsellId?: string;
  search?: string;
  accountSlug?: string;
  page?: number;
  perPage?: number;
}): Promise<RecoveryListResponse> {
  const qs = new URLSearchParams({ preset: params.preset });
  if (params.dateStart) qs.set("date_start", params.dateStart);
  if (params.dateEnd) qs.set("date_end", params.dateEnd);
  if (params.typeFilter) qs.set("type_filter", params.typeFilter);
  if (params.statusFilter) qs.set("status_filter", params.statusFilter);
  if (params.channelFilter) qs.set("channel_filter", params.channelFilter);
  if (params.productId) qs.set("product_id", params.productId);
  if (params.upsellId) qs.set("upsell_id", params.upsellId);
  if (params.search) qs.set("search", params.search);
  if (params.accountSlug) qs.set("account_slug", params.accountSlug);
  qs.set("page", String(params.page ?? 1));
  qs.set("per_page", String(params.perPage ?? 12));
  return apiRequest<RecoveryListResponse>(`/recovery/list?${qs.toString()}`);
}

export async function fetchRecoverySummary(params: {
  preset: string;
  dateStart?: string;
  dateEnd?: string;
  typeFilter?: string;
  statusFilter?: string;
  channelFilter?: string;
  productId?: string;
  upsellId?: string;
  search?: string;
  accountSlug?: string;
}): Promise<RecoverySummary> {
  const qs = new URLSearchParams({ preset: params.preset });
  if (params.dateStart) qs.set("date_start", params.dateStart);
  if (params.dateEnd) qs.set("date_end", params.dateEnd);
  if (params.typeFilter) qs.set("type_filter", params.typeFilter);
  if (params.statusFilter) qs.set("status_filter", params.statusFilter);
  if (params.channelFilter) qs.set("channel_filter", params.channelFilter);
  if (params.productId) qs.set("product_id", params.productId);
  if (params.upsellId) qs.set("upsell_id", params.upsellId);
  if (params.search) qs.set("search", params.search);
  if (params.accountSlug) qs.set("account_slug", params.accountSlug);
  return apiRequest<RecoverySummary>(`/recovery/summary?${qs.toString()}`);
}

export async function updateRecoveryStatus(
  recoveryId: string,
  payload: { recovered: boolean; channel?: string },
): Promise<{ success: boolean; id: string; recovered: boolean }> {
  return apiRequest<{ success: boolean; id: string; recovered: boolean }>(
    `/recovery/${recoveryId}/status`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

// ── WhatsApp Evolution API Integration ────────────────────
export interface WhatsAppConfig {
  base_url: string;
  api_key: string;
  instance_name: string;
  is_active: boolean;
  auto_dispatch_enabled: boolean;
  cadence_delays_minutes: string;
}

export interface WhatsAppConnectionTestResult {
  success: boolean;
  connected?: boolean;
  state?: string;
  instanceName?: string;
  message?: string;
  error?: string;
}

export interface RecoveryDispatchItem {
  id: number;
  recoveryId?: string;
  customerName?: string;
  customerPhone: string;
  customerEmail?: string;
  productName?: string;
  stepNumber: number;
  strategy: string;
  messageText: string;
  scheduledAt?: string;
  sentAt?: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  errorMessage?: string;
  evolutionMessageId?: string;
  createdAt?: string;
}

export async function fetchWhatsAppConfig(): Promise<WhatsAppConfig> {
  return apiRequest<WhatsAppConfig>("/recovery/whatsapp/config");
}

export async function saveWhatsAppConfig(
  payload: WhatsAppConfig,
): Promise<WhatsAppConfig> {
  return apiRequest<WhatsAppConfig>("/recovery/whatsapp/config", {
    method: "POST",
    body: payload,
  });
}

export async function testWhatsAppConnection(
  payload?: Partial<WhatsAppConfig>,
): Promise<WhatsAppConnectionTestResult> {
  return apiRequest<WhatsAppConnectionTestResult>("/recovery/whatsapp/test", {
    method: "POST",
    body: payload || {},
  });
}

export async function fetchWhatsAppInstances(): Promise<{
  success: boolean;
  instances?: Array<{ instanceName: string; status: string; connectionStatus?: string }>;
  error?: string;
}> {
  return apiRequest<{
    success: boolean;
    instances?: Array<{ instanceName: string; status: string; connectionStatus?: string }>;
    error?: string;
  }>("/recovery/whatsapp/instances");
}

export async function fetchWhatsAppQrCode(): Promise<{
  success: boolean;
  base64?: string;
  code?: string;
  pairingCode?: string;
  error?: string;
}> {
  return apiRequest<{
    success: boolean;
    base64?: string;
    code?: string;
    pairingCode?: string;
    error?: string;
  }>("/recovery/whatsapp/qrcode");
}

export async function sendRecoveryWhatsApp(
  recoveryId: string,
  payload: {
    phone?: string;
    text: string;
    strategy?: string;
    media_url?: string;
    media_type?: string;
  },
): Promise<{ success: boolean; message: string; messageId?: string; error?: string }> {
  return apiRequest<{ success: boolean; message: string; messageId?: string; error?: string }>(
    `/recovery/whatsapp/${recoveryId}/send`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function directSendWhatsApp(payload: {
  phone: string;
  text: string;
  customer_name?: string;
  customer_email?: string;
  product_name?: string;
  strategy?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return apiRequest<{ success: boolean; messageId?: string; error?: string }>(
    "/recovery/whatsapp/direct-send",
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function scheduleRecoveryCadence(
  recoveryId: string,
  payload: {
    phone: string;
    customer_name?: string;
    product_name?: string;
    checkout_link?: string;
    lang?: string;
  },
): Promise<{ success: boolean; message: string; steps: any[] }> {
  return apiRequest<{ success: boolean; message: string; steps: any[] }>(
    `/recovery/whatsapp/${recoveryId}/schedule-cadence`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function fetchRecoveryDispatches(
  recoveryId?: string,
  status?: string,
): Promise<RecoveryDispatchItem[]> {
  const qs = new URLSearchParams();
  if (recoveryId) qs.set("recovery_id", recoveryId);
  if (status) qs.set("status", status);
  return apiRequest<RecoveryDispatchItem[]>(`/recovery/whatsapp/dispatches?${qs.toString()}`);
}

export async function cancelRecoveryDispatch(
  dispatchId: number,
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(
    `/recovery/whatsapp/dispatches/${dispatchId}`,
    {
      method: "DELETE",
    },
  );
}

