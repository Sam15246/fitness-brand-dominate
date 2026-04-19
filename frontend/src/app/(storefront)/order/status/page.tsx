import { Suspense } from "react";

import OrderStatusClient from "./OrderStatusClient";

export const dynamic = "force-dynamic";

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-[#d4c4a7]">Loading order status...</div>}>
      <OrderStatusClient />
    </Suspense>
  );
}
