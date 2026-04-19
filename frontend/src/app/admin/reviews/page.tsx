"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { deleteAdminReview, listAdminReviews, updateAdminReview, type AdminReview } from "@/lib/api";

export default function AdminReviewsPage() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingReviewId, setSavingReviewId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await listAdminReviews(page, 20, status, q);
        if (active) {
          setItems(response.items);
          setTotalPages(Math.max(1, response.pagination.total_pages));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load reviews");
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
  }, [page, q, status]);

  async function handleModeration(review: AdminReview, isApproved: boolean) {
    setSavingReviewId(review.id);
    setError(null);
    try {
      const updated = await updateAdminReview(review.id, { is_approved: isApproved });
      setItems((prev) => prev.map((item) => (item.id === review.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update review");
    } finally {
      setSavingReviewId(null);
    }
  }

  async function handleDelete(review: AdminReview) {
    const confirmed = window.confirm("Delete this review permanently?");
    if (!confirmed) {
      return;
    }

    setSavingReviewId(review.id);
    setError(null);
    try {
      await deleteAdminReview(review.id);
      setItems((prev) => prev.filter((item) => item.id !== review.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setSavingReviewId(null);
    }
  }

  return (
    <AdminShell title="Reviews" subtitle="Moderate and manage customer reviews.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <input
          value={q}
          onChange={(event) => {
            setPage(1);
            setQ(event.target.value);
          }}
          placeholder="Search reviews"
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        >
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading reviews...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                <p className="text-sm font-medium text-[#f2dfc0]">{item.product_name || "Product"} • {item.rating}/5</p>
                <p className="text-xs text-[#cdb793]">{item.name} • {item.is_approved ? "Approved" : "Pending"}</p>
                <p className="mt-1 text-xs text-[#e7dccd]">{item.comment}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={savingReviewId === item.id}
                    onClick={() => void handleModeration(item, true)}
                    className="rounded border border-[#5b8f45]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c7e5b9] disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    disabled={savingReviewId === item.id}
                    onClick={() => void handleModeration(item, false)}
                    className="rounded border border-[#a94442]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f4c2c2] disabled:opacity-40"
                  >
                    Mark Pending
                  </button>
                  <button
                    disabled={savingReviewId === item.id}
                    onClick={() => void handleDelete(item)}
                    className="rounded border border-[#a94442]/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f4c2c2] disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-[#d8c19a]">No reviews found.</p> : null}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-md border border-[#8b6f47]/60 px-3 py-1 text-xs text-[#d8c19a] disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs text-[#cdb793]">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-md border border-[#8b6f47]/60 px-3 py-1 text-xs text-[#d8c19a] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
