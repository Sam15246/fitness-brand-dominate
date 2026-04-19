import type { ReactNode } from "react";

import { requireUser } from "@/lib/server-auth";

export default async function AffiliateLayout({ children }: { children: ReactNode }) {
  await requireUser("/affiliate/dashboard");
  return <>{children}</>;
}
