import { getPolicyPage } from "@/lib/api";
import PolicyPageContent from "@/components/content/PolicyPageContent";

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const policy = await getPolicyPage("shipping");
  return <PolicyPageContent policy={policy} />;
}
