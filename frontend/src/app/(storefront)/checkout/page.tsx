import { Suspense } from "react";

import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-[#d4c4a7]">Loading checkout...</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
