const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown; isFormData?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (!options.isFormData && options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  walletBalance: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface MediaItem {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  unlockPrice: number;
  createdAt: string;
  locked: boolean;
  previewUrl: string;
}

export interface MediaDetails {
  media: MediaItem;
  originalUrl?: string;
}

export interface Transaction {
  id: string;
  type: "SEED" | "DEBIT" | "CREDIT";
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export const api = {
  baseUrl: API_URL,

  register(input: { email: string; password: string; displayName: string }) {
    return request<AuthResponse>("/auth/register", { method: "POST", body: input });
  },

  login(input: { email: string; password: string }) {
    return request<AuthResponse>("/auth/login", { method: "POST", body: input });
  },

  me(token: string) {
    return request<{ user: UserProfile }>("/me", { token });
  },

  wallet(token: string) {
    return request<{ balance: number }>("/wallet", { token });
  },

  transactions(token: string) {
    return request<{ items: Transaction[]; total: number }>("/wallet/transactions", { token });
  },

  feed(token: string, page = 1) {
    return request<{ items: MediaItem[]; total: number; page: number; pageSize: number }>(
      `/media?page=${page}`,
      { token }
    );
  },

  mediaDetails(token: string, id: string) {
    return request<MediaDetails>(`/media/${id}`, { token });
  },

  unlock(token: string, id: string) {
    return request<{ purchaseId: string; walletBalance: number }>(`/media/${id}/unlock`, {
      method: "POST",
      token,
    });
  },

  async upload(
    token: string,
    input: { uri: string; fileName: string; mimeType: string; title: string; description?: string; unlockPrice: number }
  ) {
    const form = new FormData();
    form.append("image", {
      uri: input.uri,
      name: input.fileName,
      type: input.mimeType,
    } as unknown as Blob);
    form.append("title", input.title);
    if (input.description) form.append("description", input.description);
    form.append("unlockPrice", String(input.unlockPrice));

    return request<{ media: { id: string; title: string; unlockPrice: number } }>("/media", {
      method: "POST",
      token,
      body: form,
      isFormData: true,
    });
  },

};

// preview/original endpoints require the Authorization header; expo-image's
// source prop supports custom headers, so pass this straight to <Image source={...}>.
export function authImageSource(path: string, token: string) {
  return { uri: `${API_URL}${path}`, headers: { Authorization: `Bearer ${token}` } };
}
