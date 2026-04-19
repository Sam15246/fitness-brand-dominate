"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminCoupon, updateAdminCoupon, type AdminCoupon } from "@/lib/api";

export default function AdminCouponEditPage() {
  const params = useParams<{ couponId: string }>();
  const couponId = Number(params.couponId || 0);
  const [coupon, setCoupon] = useState<AdminCoupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!couponId || Number.isNaN(couponId)) {
        setError("Invalid coupon id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const value = await getAdminCoupon(couponId);
        if (active) {
          setCoupon(value);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load coupon");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [couponId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coupon) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateAdminCoupon(coupon.id, {
        code: String(form.get("code") || "").trim().toUpperCase(),
        coupon_type: String(form.get("coupon_type") || "").trim().toLowerCase(),
        discount_percent: Number(form.get("discount_percent") || 0) || null,
        discount_amount_fixed: Number(form.get("discount_amount_fixed") || 0) || null,
        max_uses: Number(form.get("max_uses") || 0) || null,
        min_order_value: Number(form.get("min_order_value") || 0),
        max_discount: Number(form.get("max_discount") || 0) || null,
        is_active: form.get("is_active") === "on",
      });
      setCoupon(updated);
      setSuccess("Coupon updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coupon");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Edit Coupon" subtitle={`Coupon ID: ${couponId || "-"}`}>
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading coupon...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}
      {success ? <div className="rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-5 text-sm text-[#c7e5b9]">{success}</div> : null}

      {coupon ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#d8c19a]">Coupon Details</h3>
            <Link href={`/admin/coupons/${coupon.id}/stats`} className="text-xs text-[#d8c19a] underline">View Stats</Link>
          </div>
          <Field label="Code" name="code" defaultValue={coupon.code} />
          <Field label="Type" name="coupon_type" defaultValue={coupon.coupon_type} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Discount Percent" name="discount_percent" />
            <Field label="Discount Fixed (paise)" name="discount_amount_fixed" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Max Uses" name="max_uses" defaultValue={String(coupon.max_uses ?? "")} />
            <Field label="Min Order Value" name="min_order_value" defaultValue="0" />
            <Field label="Max Discount" name="max_discount" />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#d8c19a]"><input type="checkbox" name="is_active" defaultChecked={coupon.is_active} /> Active</label>
          <button type="submit" disabled={saving} className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60">{saving ? "Saving..." : "Save Coupon"}</button>
        </form>
      ) : null}
    </AdminShell>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={defaultValue} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
    </div>
  );
}
