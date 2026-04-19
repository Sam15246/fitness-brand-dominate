import { redirect } from "next/navigation";

export default async function LegacyOrderConfirmationAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ email?: string; wa?: string }>;
}) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const email = (query.email || "").trim();
  const wa = (query.wa || "").trim();

  const url = new URLSearchParams({ order: orderNumber });
  if (email) {
    url.set("email", email);
  }
  if (wa) {
    url.set("wa", wa);
  }

  redirect(`/order/confirmation?${url.toString()}`);
}
