import { Suspense } from "react";

import LegacyOrderFormClient from "./LegacyOrderFormClient";

export const dynamic = "force-dynamic";

export default function LegacyOrderFormPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-[#d4c4a7]">Loading order form...</div>}>
      <LegacyOrderFormClient />
    </Suspense>
  );
}
