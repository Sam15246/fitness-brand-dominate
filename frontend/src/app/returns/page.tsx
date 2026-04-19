import { getPolicyPage } from "@/lib/api";
import PolicyPageContent from "@/components/content/PolicyPageContent";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const policy = await getPolicyPage("returns");
  return <PolicyPageContent policy={policy} />;
}
