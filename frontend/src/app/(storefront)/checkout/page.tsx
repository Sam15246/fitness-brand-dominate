import { Suspense } from "react";

import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-[#6f5640]">Loading checkout...</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
