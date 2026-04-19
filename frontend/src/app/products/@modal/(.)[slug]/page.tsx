import { notFound } from "next/navigation";

import { ProductQuickViewModal, fetchProductBySlug } from "@/features/products";

export default async function ProductQuickViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await fetchProductBySlug(slug).catch((error: unknown) => {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound();
    }
    throw error;
  });

  return <ProductQuickViewModal product={product} />;
}
