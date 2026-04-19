"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { createAdminReview } from "@/lib/api";

export default function AdminReviewCreatePage() {
  const params = useParams<{ productId: string }>();
  const productId = Number(params.productId || 0);
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
      const review = await createAdminReview({
        product_id: productId,
        name: String(form.get("name") || "").trim(),
        role: String(form.get("role") || "").trim(),
        rating: Number(form.get("rating") || 0),
        title: String(form.get("title") || "").trim(),
        comment: String(form.get("comment") || "").trim(),
        is_approved: form.get("is_approved") === "on",
      });
      setCreatedId(review.id);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Review" subtitle={`Product ID: ${productId || "-"}`}>
      {error ? <div className="mb-4 rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-4 text-sm text-[#f4c2c2]">{error}</div> : null}
      {createdId ? <div className="mb-4 rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-4 text-sm text-[#c7e5b9]">Review created. <Link href={`/admin/reviews/${createdId}/edit`} className="underline">Edit review</Link></div> : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
        <Field label="Reviewer name" name="name" required />
        <Field label="Role" name="role" />
        <Field label="Rating (1-5)" name="rating" required />
        <Field label="Title" name="title" />
        <div>
          <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor="comment">Comment</label>
          <textarea id="comment" name="comment" rows={4} required className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#d8c19a]"><input type="checkbox" name="is_approved" defaultChecked /> Approved</label>
        <button type="submit" disabled={saving} className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60">{saving ? "Saving..." : "Create Review"}</button>
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
