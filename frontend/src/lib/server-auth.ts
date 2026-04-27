import { redirect } from "next/navigation";
import { headers } from "next/headers";

import type { CurrentUser } from "@/lib/api";

type AuthEnvelope = {
  success: boolean;
  data?: {
    user?: CurrentUser;
  };
  error?: {
    message?: string;
    code?: string;
  };
};

function getBackendBaseUrl(): string {
  return (process.env.BACKEND_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
}

async function fetchCurrentUserServer(): Promise<CurrentUser | null> {
  const incomingHeaders = await headers();
  const cookie = incomingHeaders.get("cookie") || "";

  const response = await fetch(`${getBackendBaseUrl()}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as AuthEnvelope;
  if (!payload.success || !payload.data?.user) {
    return null;
  }

  return payload.data.user;
}

export async function requireUser(nextPath: string): Promise<CurrentUser> {
  const user = await fetchCurrentUserServer();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function requireRoles(
  roles: string[],
  nextPath: string,
): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  const normalizedRole = (user.role || "").toLowerCase();
  const allowed = roles.map((value) => value.toLowerCase());

  if (!allowed.includes(normalizedRole)) {
    redirect("/forbidden");
  }

  return user;
}
