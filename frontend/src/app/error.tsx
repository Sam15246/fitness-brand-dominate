"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff8ec] px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#a94442]/10">
          <svg className="h-7 w-7 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">500</p>
        <h1 className="mt-2 font-display text-[28px] uppercase tracking-[0.04em] text-[#302115]">
          Something Went Wrong
        </h1>
        <p className="mt-3 text-[13px] leading-[1.7] text-[#6c5641]">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="group relative overflow-hidden rounded-full bg-[#1e1710] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Try Again</span>
          </button>
          <Link
            href="/"
            className="rounded-full border border-[#d9c8ad] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6c5641] transition-all hover:border-[#a67126]/40 hover:text-[#302115]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
