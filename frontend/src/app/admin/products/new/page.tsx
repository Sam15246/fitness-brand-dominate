"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { createAdminProduct } from "@/lib/api";

export default function AdminProductCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    setCreatedId(null);

    try {
      const priceRupees = Number(form.get("price") || 0);
      const stockQuantity = Number(form.get("stock_quantity") || 0);
      const weightGrams = Number(form.get("weight_grams") || 0);
      const product = await createAdminProduct({
        name: String(form.get("name") || "").trim(),
        description: String(form.get("description") || "").trim(),
        price: Math.round(priceRupees * 100),
        stock_quantity: stockQuantity,
        weight_grams: weightGrams,
        dimensions: String(form.get("dimensions") || "").trim(),
        image_url: String(form.get("image_url") || "").trim(),
        is_active: form.get("is_active") === "on",
      });
      setCreatedId(product.id);
      // Redirect immediately to edit page so admin can add variants/images
      router.push(`/admin/products/${product.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Create Product" subtitle="Add new products to the catalog.">
      {error ? <div className="mb-4 rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-4 text-sm text-[#f4c2c2]">{error}</div> : null}
      {createdId ? (
        <div className="mb-4 rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-4 text-sm text-[#c7e5b9]">
          Product created! Redirecting to edit page to add variants & images... <Link href={`/admin/products/${createdId}/edit`} className="underline">Go now</Link>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
        <Field label="Name" name="name" required />
        <div>
          <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={4} required className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Price (₹)" name="price" required />
          <Field label="Stock" name="stock_quantity" required />
          <Field label="Weight (grams)" name="weight_grams" required />
        </div>
        <Field label="Dimensions" name="dimensions" />
        <Field label="Image URL" name="image_url" />
        <label className="flex items-center gap-2 text-sm text-[#d8c19a]"><input type="checkbox" name="is_active" defaultChecked /> Active</label>
        <button type="submit" disabled={saving} className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60">{saving ? "Creating..." : "Create Product"}</button>
      </form>
    </AdminShell>
  );
}

function Field({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor={name}>{label}</label>
      <input id={name} name={name} required={required} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
    </div>
  );
}
