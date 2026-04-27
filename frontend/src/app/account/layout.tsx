import type { ReactNode } from "react";

import SiteLayout from "@/components/layout/SiteLayout";
import { requireUser } from "@/lib/server-auth";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireUser("/account/orders");
  return <SiteLayout>{children}</SiteLayout>;
}
