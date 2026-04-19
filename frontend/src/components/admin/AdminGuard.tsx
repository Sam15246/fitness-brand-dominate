"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/api";

type AdminGuardProps = {
  children: React.ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function validateAdminAccess() {
      try {
        setLoading(true);
        setError(null);
        const value = await getCurrentUser();
        const role = (value.role || "").toLowerCase();
        if (role !== "admin" && role !== "superadmin") {
          router.replace("/forbidden");
          return;
        }

        if (active) {
          setUser(value);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof Error) {
          const message = err.message.toLowerCase();
          if (
            message.includes("401") ||
            message.includes("unauthorized") ||
            message.includes("authentication required")
          ) {
            router.replace(`/auth/login?next=${encodeURIComponent(pathname || "/admin/dashboard")}`);
            return;
          }
          setError(err.message);
        } else {
          setError("Failed to verify admin access");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void validateAdminAccess();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-6 text-sm text-[#d8c19a]">
          Verifying admin access...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-6 text-sm text-[#f4c2c2]">
          {error}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
