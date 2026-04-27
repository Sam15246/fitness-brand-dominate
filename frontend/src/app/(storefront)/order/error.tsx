"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OrderErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Error</p>
      <h1 className="mt-2 text-3xl font-bold text-[#3b2513]">Something Went Wrong</h1>
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
