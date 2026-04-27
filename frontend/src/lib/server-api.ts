import { headers } from "next/headers";

import type { ApiEnvelope } from "@/lib/api";

type ServerApiGetOptions = {
  cache?: RequestCache;
  revalidate?: number;
  includeAuthCookie?: boolean;
};

function getBackendBaseUrl(): string {
  return (process.env.BACKEND_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
}

export async function serverApiGet<T>(path: string, options: ServerApiGetOptions = {}): Promise<T> {
  const shouldIncludeCookie = options.includeAuthCookie !== false;
  let cookie = "";

  if (shouldIncludeCookie) {
    const incomingHeaders = await headers();
    cookie = incomingHeaders.get("cookie") || "";
  }

  const response = await fetch(`${getBackendBaseUrl()}/api/v1${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(cookie ? { cookie } : {}),
    },
    cache: options.cache ?? "no-store",
    ...(options.revalidate !== undefined ? { next: { revalidate: options.revalidate } } : {}),
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("API returned a non-JSON response");
  }

  if (!response.ok || !payload.success) {
    const message = payload.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}
