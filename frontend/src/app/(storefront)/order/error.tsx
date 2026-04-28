"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OrderErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center bg-[#fff8ec] px-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#a94442]/10">
        <svg className="h-6 w-6 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#9a7147]">Error</p>
      <h1 className="mt-2 font-display text-3xl uppercase tracking-[0.04em] text-[#3b2513]">Something Went Wrong</h1>
      <p className="mt-4 text-sm text-[#6f5640]">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
        >
          Try Again
        </button>
        <Link
          href="/products"
          className="rounded-full border border-[#dcc9ab] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f5640] hover:bg-[#fef5e8]"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
