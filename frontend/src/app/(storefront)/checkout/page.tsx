import { Suspense } from "react";

import CheckoutClient from "./CheckoutClient";
import CheckoutRouteLoading from "./loading";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutRouteLoading />}>
      <CheckoutClient />
    </Suspense>
  );
}
