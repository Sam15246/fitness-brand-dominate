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
  const [hoverRating, setHoverRating] = useState<number | null>(null);
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
        if (!active) return;

        setEligibility(result);
        setIsUnauthenticated(false);

        if (result.eligible_order_items.length === 1) {
          setOrderItemId(result.eligible_order_items[0].order_item_id);
        }
      } catch (loadError) {
        if (!active) return;

        const message = loadError instanceof Error ? loadError.message : "Unable to load review eligibility";
        if (message.toLowerCase().includes("authentication required")) {
          setIsUnauthenticated(true);
          setEligibility(null);
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEligibility();
    return () => { active = false; };
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

  const displayRating = hoverRating ?? rating;

  if (loading) {
    return (
      <section className="mt-10 rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-6 sm:p-8">
        <h3 className="font-display text-[24px] uppercase tracking-[0.04em] text-[#302115]">Leave a Review</h3>
        <p className="mt-2 text-[13px] text-[#6c5641]">Checking eligibility...</p>
      </section>
    );
  }

  if (isUnauthenticated) {
    return (
      <section className="mt-10 rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-6 sm:p-8">
        <h3 className="font-display text-[24px] uppercase tracking-[0.04em] text-[#302115]">Leave a Review</h3>
        <p className="mt-2 text-[13px] text-[#6c5641]">
          Sign in with a delivered order for this product to submit a review.
        </p>
        <Link
          href={`/auth/login?next=${encodeURIComponent(`/products/${slug}`)}`}
          className="mt-4 inline-flex rounded-full bg-[#1e1710] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f4eee4] transition-colors hover:bg-[#2b1e14]"
        >
          Sign In
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-6 sm:p-8" id="write-review">
      <h3 className="font-display text-[24px] uppercase tracking-[0.04em] text-[#302115]">Leave a Review</h3>

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[12px] text-[#a94442]">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#4a7c3f]/25 bg-[#4a7c3f]/8 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-[12px] text-[#302115]">{success}</p>
        </div>
      )}

      {!canSubmit && eligibility && (
        <div className="mt-4 rounded-xl border border-[#d9c8ad] bg-[#f5e7d2]/40 px-4 py-3 text-[13px] text-[#6c5641]">
          {eligibility.has_pending_review ? (
            <p>Your review is pending approval. Thank you for your feedback!</p>
          ) : eligibility.has_approved_review ? (
            <p>You have already submitted a review for this product. Thanks!</p>
          ) : (
            <p>Reviews unlock after your order is marked as delivered.</p>
          )}
        </div>
      )}

      {canSubmit && eligibility && (
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {/* Order selector */}
          {eligibility.eligible_order_items.length > 1 && (
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]" htmlFor="orderItemId">
                Delivered Purchase
              </label>
              <select
                id="orderItemId"
                value={orderItemId || ""}
                onChange={(e) => setOrderItemId(Number(e.target.value) || undefined)}
                className="w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3 text-[13px] text-[#302115] outline-none focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]"
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
          )}

          {/* Star rating picker */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <svg
                    className={`h-7 w-7 transition-colors ${star <= displayRating ? "text-[#d4943b]" : "text-[#d9c8ad]"}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
              <span className="ml-2 self-center text-[12px] text-[#6c5641]">
                {rating === 5 ? "Excellent" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]" htmlFor="title">
              Title <span className="font-normal normal-case tracking-normal text-[#b5a08a]">(optional)</span>
            </label>
            <input
              id="title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3 text-[13px] text-[#302115] outline-none transition-colors placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]"
              placeholder="Short headline for your review"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]" htmlFor="comment">
              Your Review
            </label>
            <textarea
              id="comment"
              value={comment}
              minLength={10}
              maxLength={1500}
              required
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3 text-[13px] leading-[1.7] text-[#302115] outline-none transition-colors placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]"
              placeholder="Share your experience with this product..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group relative inline-flex min-h-[48px] items-center justify-center overflow-hidden rounded-full bg-[#a67126] px-8 py-[13px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:shadow-[0_4px_20px_rgba(166,113,38,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}
    </section>
  );
}
