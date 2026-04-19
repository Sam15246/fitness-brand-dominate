"use client";

import Link from "next/link";
import { useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { createAdminCoupon } from "@/lib/api";

export default function AdminCouponCreatePage() {
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
      const coupon = await createAdminCoupon({
        code: String(form.get("code") || "").trim().toUpperCase(),
        coupon_type: String(form.get("coupon_type") || "promotional").trim().toLowerCase(),
        discount_percent: Number(form.get("discount_percent") || 0) || null,
        discount_amount_fixed: Number(form.get("discount_amount_fixed") || 0) || null,
        max_uses: Number(form.get("max_uses") || 0) || null,
        min_order_value: Number(form.get("min_order_value") || 0),
        max_discount: Number(form.get("max_discount") || 0) || null,
        is_active: form.get("is_active") === "on",
      });
      setCreatedId(coupon.id);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Create Coupon" subtitle="Add new promotional or affiliate coupon codes.">
      {error ? <div className="mb-4 rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-4 text-sm text-[#f4c2c2]">{error}</div> : null}
      {createdId ? <div className="mb-4 rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-4 text-sm text-[#c7e5b9]">Coupon created. <Link href={`/admin/coupons/${createdId}/edit`} className="underline">Edit coupon</Link></div> : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
        <Field label="Code" name="code" required />
        <Field label="Type" name="coupon_type" defaultValue="promotional" />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Discount Percent" name="discount_percent" />
          <Field label="Discount Fixed (paise)" name="discount_amount_fixed" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Max Uses" name="max_uses" />
          <Field label="Min Order Value" name="min_order_value" defaultValue="0" />
          <Field label="Max Discount" name="max_discount" />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#d8c19a]"><input type="checkbox" name="is_active" defaultChecked /> Active</label>
        <button type="submit" disabled={saving} className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60">{saving ? "Creating..." : "Create Coupon"}</button>
      </form>
    </AdminShell>
  );
}

function Field({ label, name, defaultValue, required = false }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={defaultValue} required={required} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
    </div>
  );
}
