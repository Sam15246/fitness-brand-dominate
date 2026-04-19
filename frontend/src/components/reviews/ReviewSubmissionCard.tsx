"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getReviewEligibility, submitProductReview, type ReviewEligibility } from "@/lib/api";

export default function ReviewSubmissionCard({ slug }: { slug: string }) {
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [orderItemId, setOrderItemId] = useState<number | undefined>(undefined);
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEligibility() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const result = await getReviewEligibility(slug);
        if (!active) {
          return;
        }

        setEligibility(result);
        setIsUnauthenticated(false);

        if (result.eligible_order_items.length === 1) {
          setOrderItemId(result.eligible_order_items[0].order_item_id);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unable to load review eligibility";
        if (message.toLowerCase().includes("authentication required")) {
          setIsUnauthenticated(true);
          setEligibility(null);
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEligibility();
    return () => {
      active = false;
    };
  }, [slug]);

  const canSubmit = useMemo(() => Boolean(eligibility?.can_submit_review), [eligibility]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const message = await submitProductReview(slug, {
        order_item_id: orderItemId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });

      setSuccess(message);
      setComment("");
      setTitle("");

      const nextEligibility = await getReviewEligibility(slug);
      setEligibility(nextEligibility);
      if (nextEligibility.eligible_order_items.length === 1) {
        setOrderItemId(nextEligibility.eligible_order_items[0].order_item_id);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-6">
        <h3 className="text-xl font-semibold text-[#f1ddbe]">Leave a Review</h3>
        <p className="mt-2 text-sm text-[#c7b69d]">Checking eligibility...</p>
      </section>
    );
  }

  if (isUnauthenticated) {
    return (
      <section className="mt-8 rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-6">
        <h3 className="text-xl font-semibold text-[#f1ddbe]">Leave a Review</h3>
        <p className="mt-2 text-sm text-[#c7b69d]">
          You must sign in and have a delivered order for this product before submitting a review.
        </p>
        <Link href={`/auth/login?next=${encodeURIComponent(`/products/${slug}`)}`} className="mt-4 inline-block text-sm text-[#f1ddbe] hover:text-[#d8c19a]">
          Sign in to check eligibility
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-6" id="write-review">
      <h3 className="text-xl font-semibold text-[#f1ddbe]">Leave a Review</h3>

      {error ? (
        <p className="mt-3 rounded-lg border border-[#a94442]/50 bg-[#2b1414]/70 px-3 py-2 text-sm text-[#f4c2c2]">{error}</p>
      ) : null}

      {success ? (
        <p className="mt-3 rounded-lg border border-[#416a35]/50 bg-[#1a2b17]/70 px-3 py-2 text-sm text-[#cde5bf]">{success}</p>
      ) : null}

      {!canSubmit && eligibility ? (
        <div className="mt-4 text-sm text-[#c7b69d]">
          {eligibility.has_pending_review ? (
            <p>Your latest review is pending approval.</p>
          ) : eligibility.has_approved_review ? (
            <p>You have already submitted a review for your delivered purchase.</p>
          ) : (
            <p>Reviews unlock only after your order is marked delivered.</p>
          )}
        </div>
      ) : null}

      {canSubmit && eligibility ? (
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          {eligibility.eligible_order_items.length > 1 ? (
            <div>
              <label className="mb-1 block text-sm text-[#e8ddcb]" htmlFor="orderItemId">Delivered purchase</label>
              <select
                id="orderItemId"
                value={orderItemId || ""}
                onChange={(e) => setOrderItemId(Number(e.target.value) || undefined)}
                className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                required
              >
                <option value="">Select order</option>
                {eligibility.eligible_order_items.map((item) => (
                  <option key={item.order_item_id} value={item.order_item_id}>
                    {item.order_number} | {item.product_name} x{item.quantity}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm text-[#e8ddcb]" htmlFor="rating">Rating</label>
            <select
              id="rating"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value) || 5)}
              className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
            >
              <option value={5}>5 - Excellent</option>
              <option value={4}>4 - Very Good</option>
              <option value={3}>3 - Good</option>
              <option value={2}>2 - Fair</option>
              <option value={1}>1 - Poor</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#e8ddcb]" htmlFor="title">Title (optional)</label>
            <input
              id="title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
              placeholder="Short headline"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#e8ddcb]" htmlFor="comment">Review</label>
            <textarea
              id="comment"
              value={comment}
              minLength={10}
              maxLength={1500}
              required
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
              placeholder="Share your experience with this product"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#8b6f47] px-4 py-2 text-sm font-semibold text-[#1a130d] transition hover:bg-[#a1845d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
