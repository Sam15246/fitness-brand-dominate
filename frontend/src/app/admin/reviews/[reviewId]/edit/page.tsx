"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminReview, updateAdminReview, type AdminReview } from "@/lib/api";

export default function AdminReviewEditPage() {
  const params = useParams<{ reviewId: string }>();
  const reviewId = Number(params.reviewId || 0);
  const [review, setReview] = useState<AdminReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!reviewId || Number.isNaN(reviewId)) {
        setError("Invalid review id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const item = await getAdminReview(reviewId);
        if (active) {
          setReview(item);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load review");
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
  }, [reviewId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateAdminReview(review.id, {
        name: String(form.get("name") || "").trim(),
        rating: Number(form.get("rating") || 0),
        title: String(form.get("title") || "").trim(),
        comment: String(form.get("comment") || "").trim(),
        is_approved: form.get("is_approved") === "on",
      });
      setReview(updated);
      setSuccess("Review updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Edit Review" subtitle={`Review ID: ${reviewId || "-"}`}>
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading review...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}
      {success ? <div className="rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-5 text-sm text-[#c7e5b9]">{success}</div> : null}

      {review ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <Field label="Reviewer name" name="name" defaultValue={review.name} />
          <Field label="Rating" name="rating" defaultValue={String(review.rating)} />
          <Field label="Title" name="title" defaultValue={review.title || ""} />
          <div>
            <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor="comment">Comment</label>
            <textarea id="comment" name="comment" rows={4} defaultValue={review.comment} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#d8c19a]"><input type="checkbox" name="is_approved" defaultChecked={review.is_approved} /> Approved</label>
          <button type="submit" disabled={saving} className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60">{saving ? "Saving..." : "Save Review"}</button>
        </form>
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
