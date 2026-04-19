import { notFound } from "next/navigation";

import PolicyPageContent from "@/components/content/PolicyPageContent";
import { getPolicyPage } from "@/lib/api";

export default async function GenericPolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  let policy;

  if (!["shipping", "returns", "terms", "privacy"].includes(normalized)) {
    notFound();
  }

  try {
    policy = await getPolicyPage(normalized as "shipping" | "returns" | "terms" | "privacy");
  } catch {
    notFound();
  }

  return <PolicyPageContent policy={policy} />;
}
