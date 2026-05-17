"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { createAdminOrder, listAdminProducts, listAdminVariants, type AdminProduct, type AdminVariant } from "@/lib/api";

type OrderLineForm = {
  productId: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
};

const EMPTY_LINE: OrderLineForm = {
  productId: "",
  variantId: "",
  quantity: "1",
  unitPrice: "",
};

type VariantCache = Record<string, AdminVariant[]>;

export default function AdminOrderCreatePage() {
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [confirmNow, setConfirmNow] = useState(true);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [variantCache, setVariantCache] = useState<VariantCache>({});
  const [lines, setLines] = useState<OrderLineForm[]>([EMPTY_LINE]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: number; number: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoadingProducts(true);
        const result = await listAdminProducts(1, 100, "active", "name", productQuery);
        if (active) {
          setProducts(result.items);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load products");
        }
      } finally {
        if (active) {
          setLoadingProducts(false);
        }
      }
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, [productQuery]);

  const productLookup = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);

  async function ensureVariants(productId: string) {
    if (!productId || variantCache[productId]) {
      return;
    }

    const variants = await listAdminVariants(Number(productId));
    setVariantCache((current) => ({ ...current, [productId]: variants }));
  }

  async function updateLine(index: number, patch: Partial<OrderLineForm>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
    if (patch.productId) {
      await ensureVariants(patch.productId);
    }
  }

  function addLine() {
    setLines((current) => [...current, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const items = lines
        .map((line) => {
          const productId = Number(line.productId || 0);
          const variantId = Number(line.variantId || 0);
          const quantity = Number(line.quantity || 0);
          const unitPrice = line.unitPrice.trim() ? Math.round(Number(line.unitPrice) * 100) : null;

          return {
            product_id: productId,
            variant_id: variantId > 0 ? variantId : null,
            quantity,
            unit_price: unitPrice,
          };
        })
        .filter((item) => item.product_id > 0 && item.quantity > 0);

      const order = await createAdminOrder({
        customer_name: customerName.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        address: address.trim(),
        confirm_now: confirmNow,
        items,
      });

      setSuccess({ id: order.id, number: order.order_number });
      setLines([{ ...EMPTY_LINE }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Create Order"
      subtitle="Record manual, offline, or bulk sales with line items and stock control."
      actions={
        <Link href="/admin/orders" className="rounded-full border border-[#8b6f47]/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8c19a] transition hover:bg-[#8b6f47]/15">
          Back to Orders
        </Link>
      }
    >
      {error ? <div className="mb-4 rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-4 text-sm text-[#f4c2c2]">{error}</div> : null}
      {success ? (
        <div className="mb-4 rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-4 text-sm text-[#c7e5b9]">
          Order {success.number} created successfully. <Link href={`/admin/orders/${success.id}`} className="underline">Open it</Link>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Customer name" value={customerName} onChange={setCustomerName} required />
          <Field label="Phone number" value={phoneNumber} onChange={setPhoneNumber} required />
          <Field label="Email" value={email} onChange={setEmail} required />
          <Field label="City" value={city} onChange={setCity} required />
          <Field label="State" value={state} onChange={setState} required />
          <Field label="Pincode" value={pincode} onChange={setPincode} required />
        </div>

        <div>
          <label className="mb-1 block text-sm text-[#d8c19a]">Address</label>
          <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={3} required className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#d8c19a]">
          <input type="checkbox" checked={confirmNow} onChange={(event) => setConfirmNow(event.target.checked)} />
          Confirm immediately and reduce stock
        </label>

        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#120f0c] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">Order Items</h2>
              <p className="text-xs text-[#d8c19a]/60">Add one or more products. Unit price is optional and defaults to the current catalog price.</p>
            </div>
            <button type="button" onClick={addLine} className="rounded-lg bg-[#c89e65] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d0b09] transition hover:bg-[#ddb684]">
              + Add line
            </button>
          </div>

          <div className="mb-4">
            <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Search products" className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#17120f] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const selectedProduct = productLookup.get(String(line.productId));
              const variants = line.productId ? variantCache[line.productId] || [] : [];
              return (
                <div key={`${index}-${line.productId}`} className="grid gap-3 rounded-lg border border-[#8b6f47]/20 bg-[#17120f] p-3 md:grid-cols-[2fr_1.2fr_0.7fr_0.9fr_auto]">
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Product</label>
                    <select value={line.productId} onChange={async (event) => { await updateLine(index, { productId: event.target.value, variantId: "" }); }} className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]">
                      <option value="">Select product</option>
                      {loadingProducts ? <option>Loading...</option> : null}
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name} • {product.price_display}</option>
                      ))}
                    </select>
                    {selectedProduct ? <p className="mt-1 text-[11px] text-[#8b6f47]">Stock: {selectedProduct.available_quantity ?? selectedProduct.stock_quantity}</p> : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Variant</label>
                    <select value={line.variantId} onChange={(event) => void updateLine(index, { variantId: event.target.value })} disabled={!line.productId} className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65] disabled:opacity-50">
                      <option value="">Default / auto</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>{Object.values(variant.option_values || {}).join(" / ") || variant.sku} • ₹{(variant.effective_price / 100).toFixed(2)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Qty</label>
                    <input type="number" min={1} value={line.quantity} onChange={(event) => setLines((current) => current.map((value, lineIndex) => lineIndex === index ? { ...value, quantity: event.target.value } : value))} className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]" />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Unit price (₹)</label>
                    <input type="number" step="0.01" min={0} value={line.unitPrice} onChange={(event) => setLines((current) => current.map((value, lineIndex) => lineIndex === index ? { ...value, unitPrice: event.target.value } : value))} placeholder={selectedProduct ? String((selectedProduct.price / 100).toFixed(2)) : ""} className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]" />
                  </div>

                  <div className="flex items-end">
                    <button type="button" onClick={() => removeLine(index)} className="rounded-lg border border-[#8b6f47]/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8c19a] transition hover:bg-[#8b6f47]/15">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" disabled={saving} className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] transition hover:bg-[#ddb684] disabled:opacity-60">
          {saving ? "Saving..." : "Create Order"}
        </button>
      </form>
    </AdminShell>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-[#d8c19a]">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
    </div>
  );
}