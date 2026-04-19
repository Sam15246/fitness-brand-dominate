import type { ReactNode } from "react";

import { requireUser } from "@/lib/server-auth";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireUser("/account/orders");
  return <>{children}</>;
}
