"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import VariantManager from "@/components/admin/VariantManager";
import Link from "next/link";
import { getAdminProduct, updateAdminProduct, type AdminProduct } from "@/lib/api";

export default function AdminProductEditPage() {
  const params = useParams<{ productId: string }>();
  const productId = Number(params.productId || 0);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!productId || Number.isNaN(productId)) {
        setError("Invalid product id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const value = await getAdminProduct(productId);
        if (active) {
          setProduct(value);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load product");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProduct();
    return () => {
      active = false;
    };
  }, [productId]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const priceRupees = Number(form.get("price") || 0);
      const priceOriginalRupees = String(form.get("price_original") || "").trim();
      const priceDiscountedRupees = String(form.get("price_discounted") || "").trim();
      const updated = await updateAdminProduct(product.id, {
        name: String(form.get("name") || "").trim(),
        description: String(form.get("description") || "").trim(),
        price: Math.round(priceRupees * 100),
        price_original: priceOriginalRupees ? Math.round(Number(priceOriginalRupees) * 100) : null,
        price_discounted: priceDiscountedRupees ? Math.round(Number(priceDiscountedRupees) * 100) : null,
        dimensions: String(form.get("dimensions") || "").trim(),
        image_url: String(form.get("image_url") || "").trim(),
        is_active: form.get("is_active") === "on",
        is_discount_active: form.get("is_discount_active") === "on",
      });
      setProduct(updated);
      setSuccess("Product updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Edit Product" subtitle={`Product ID: ${productId || "-"}`}>
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading product...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}
      {success ? <div className="rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-5 text-sm text-[#c7e5b9]">{success}</div> : null}

      {product ? (
        <>
          <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <div>
              <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={product.name} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={4} defaultValue={product.description} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Price (₹)" name="price" defaultValue={String(product.price / 100)} />
              <Field label="Stock" name="stock_quantity" defaultValue={String(product.stock_quantity)} />
              <Field label="Weight (grams)" name="weight_grams" defaultValue={String(product.weight_grams)} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Original Price (₹)" name="price_original" defaultValue={product.price_original != null ? String(product.price_original / 100) : ""} />
              <Field label="Discounted Price (₹)" name="price_discounted" defaultValue={product.price_discounted != null ? String(product.price_discounted / 100) : ""} />
            </div>

            <Field label="Dimensions" name="dimensions" defaultValue={product.dimensions || ""} />
            <Field label="Image URL" name="image_url" defaultValue={product.image_url || ""} />

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-[#d8c19a]">
                <input type="checkbox" name="is_active" defaultChecked={product.is_active} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-[#d8c19a]">
                <input type="checkbox" name="is_discount_active" defaultChecked={product.is_discount_active} />
                Discount Active
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Product"}
            </button>
          </form>

          {/* Image Management */}
          <div className="mt-6 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#d8c19a]">Product Images</h3>
            <p className="mb-4 text-xs text-[#9a7147]">Manage images in a dedicated page with variant assignments and reordering.</p>
            <Link
              href={`/admin/products/${productId}/images`}
              className="inline-block rounded-lg border border-[#8b6f47]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#d8c19a] hover:bg-[#1f1814]"
            >
              Manage Images
            </Link>
          </div>

          {/* Variant Management */}
          <div className="mt-6 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <VariantManager productId={productId} />
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={defaultValue} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
    </div>
  );
}
