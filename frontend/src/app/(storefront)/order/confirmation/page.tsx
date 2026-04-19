import { Suspense } from "react";

import OrderConfirmationClient from "./OrderConfirmationClient";

export const dynamic = "force-dynamic";

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-[#d4c4a7]">Loading confirmation...</div>}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
