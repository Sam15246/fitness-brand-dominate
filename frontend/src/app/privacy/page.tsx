import { getPolicyPage } from "@/lib/api";
import PolicyPageContent from "@/components/content/PolicyPageContent";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const policy = await getPolicyPage("privacy");
  return <PolicyPageContent policy={policy} />;
}
