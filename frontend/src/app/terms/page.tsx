import { getPolicyPage } from "@/lib/api";
import PolicyPageContent from "@/components/content/PolicyPageContent";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const policy = await getPolicyPage("terms");
  return <PolicyPageContent policy={policy} />;
}
