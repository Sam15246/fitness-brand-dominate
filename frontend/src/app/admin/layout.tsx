import type { ReactNode } from "react";

import { requireRoles } from "@/lib/server-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRoles(["admin", "superadmin"], "/admin/dashboard");
  return <>{children}</>;
}
