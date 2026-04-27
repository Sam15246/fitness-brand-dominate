import type { ReactNode } from "react";

import SiteLayout from "@/components/layout/SiteLayout";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}
