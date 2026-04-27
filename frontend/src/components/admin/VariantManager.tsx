"use client";

import { useEffect, useState } from "react";

import {
  listAdminVariants,
  createAdminVariant,
  updateAdminVariant,
  deleteAdminVariant,
  type AdminVariant,
} from "@/lib/api";

type VariantManagerProps = {
  productId: number;
};

type VariantForm = {
  sku: string;
  optionKey: string;
  optionValue: string;
  price_override: string;
  stock_quantity: string;
  is_active: boolean;
};

const EMPTY_FORM: VariantForm = {
  sku: "",
  optionKey: "size",
  optionValue: "",
  price_override: "",
  stock_quantity: "0",
  is_active: true,
};

export default function VariantManager({ productId }: VariantManagerProps) {
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VariantForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadVariants();
  }, [productId]);

  async function loadVariants() {
    setLoading(true);
    try {
      const data = await listAdminVariants(productId);
      setVariants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load variants");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(v: AdminVariant) {
    const entries = Object.entries(v.option_values || {});
    setForm({
      sku: v.sku,
      optionKey: entries[0]?.[0] || "size",
      optionValue: entries[0]?.[1] || "",
      price_override: v.price_override != null ? String(v.price_override) : "",
      stock_quantity: String(v.stock_quantity),
      is_active: v.is_active,
    });
    setEditingId(v.id);
    setShowForm(true);
    setError(null);
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const option_values: Record<string, string> = {};
    if (form.optionKey.trim() && form.optionValue.trim()) {
      option_values[form.optionKey.trim()] = form.optionValue.trim();
    }

    const payload = {
      sku: form.sku.trim(),
      option_values,
      price_override: form.price_override ? Number(form.price_override) : null,
      stock_quantity: Number(form.stock_quantity) || 0,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await updateAdminVariant(productId, editingId, payload);
      } else {
        await createAdminVariant(productId, payload);
      }
      cancelForm();
      await loadVariants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save variant");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(variantId: number) {
    setError(null);
    try {
      await deleteAdminVariant(productId, variantId);
      setDeleteConfirm(null);
      await loadVariants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete variant");
      setDeleteConfirm(null);
    }
  }

  async function toggleActive(v: AdminVariant) {
    setError(null);
    try {
      await updateAdminVariant(productId, v.id, { is_active: !v.is_active });
      await loadVariants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update variant");
    }
  }

  if (loading) {
    return <p className="animate-pulse text-sm text-[#d8c19a]/50">Loading variants...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">
          Variants ({variants.length})
        </h2>
        {!showForm ? (
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-[#c89e65] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0d0b09] transition hover:bg-[#ddb684]"
          >
            + Add Variant
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-[#a94442]/30 bg-[#2b1414]/60 px-3 py-2 text-sm text-[#f4c2c2]">{error}</p>
      ) : null}

      {/* Variant form */}
      {showForm ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#d8c19a]">
            {editingId ? "Edit Variant" : "New Variant"}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="e.g. LC-100GM"
                className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Option Key</label>
                <select
                  value={form.optionKey}
                  onChange={(e) => setForm({ ...form, optionKey: e.target.value })}
                  className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]"
                >
                  <option value="size">Size</option>
                  <option value="color">Color</option>
                  <option value="flavor">Flavor</option>
                  <option value="weight">Weight</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Option Value</label>
                <input
                  type="text"
                  value={form.optionValue}
                  onChange={(e) => setForm({ ...form, optionValue: e.target.value })}
                  placeholder="e.g. 100gm"
                  className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Price (paise)</label>
              <input
                type="number"
                value={form.price_override}
                onChange={(e) => setForm({ ...form, price_override: e.target.value })}
                placeholder="e.g. 15000 = ₹150"
                className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]"
              />
              {form.price_override ? (
                <p className="mt-0.5 text-[10px] text-[#8b6f47]">= ₹{(Number(form.price_override) / 100).toFixed(2)}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8b6f47]">Stock</label>
              <input
                type="number"
                min={0}
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className="w-full rounded-lg border border-[#8b6f47]/30 bg-[#0d0b09] px-3 py-2 text-sm text-[#f2dfc0] outline-none focus:border-[#c89e65]"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-[#d8c19a]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-[#8b6f47] text-[#c89e65]"
                />
                Active
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#c89e65] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#0d0b09] transition hover:bg-[#ddb684] disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-lg border border-[#8b6f47]/30 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#d8c19a] transition hover:bg-[#8b6f47]/15"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Variants list */}
      {variants.length === 0 && !showForm ? (
        <p className="text-sm text-[#d8c19a]/50">No variants yet. Add one to offer size/weight options.</p>
      ) : (
        <div className="space-y-2">
          {variants.map((v) => (
            <div
              key={v.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                v.is_active
                  ? "border-[#8b6f47]/25 bg-[#17120f]"
                  : "border-[#8b6f47]/10 bg-[#17120f]/50 opacity-60"
              }`}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#f2dfc0]">
                    {Object.values(v.option_values).join(" / ") || v.sku}
                  </span>
                  <span className="rounded-md bg-[#8b6f47]/15 px-2 py-0.5 text-[10px] font-mono text-[#8b6f47]">
                    {v.sku}
                  </span>
                  {!v.is_active ? (
                    <span className="rounded-md bg-[#a94442]/15 px-2 py-0.5 text-[10px] text-[#f4c2c2]">Inactive</span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-[#d8c19a]/60">
                  <span>₹{(v.effective_price / 100).toFixed(2)}</span>
                  <span>Stock: {v.stock_quantity}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleActive(v)}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                    v.is_active
                      ? "text-[#f4c2c2] hover:bg-[#a94442]/15"
                      : "text-[#a3d9a5] hover:bg-[#2b4a2b]/30"
                  }`}
                >
                  {v.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(v)}
                  className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#c89e65] transition hover:bg-[#c89e65]/15"
                >
                  Edit
                </button>
                {deleteConfirm === v.id ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="rounded-md bg-[#a94442] px-2 py-1 text-[10px] font-bold text-white"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      className="rounded-md px-2 py-1 text-[10px] text-[#d8c19a]/60"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(v.id)}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a94442] transition hover:bg-[#a94442]/15"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
