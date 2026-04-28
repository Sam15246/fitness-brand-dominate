"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { forgotPassword } from "@/lib/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await forgotPassword(email.trim());
      setSuccessMessage(message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <p className="text-[13px] leading-[1.7] text-[#6c5641]">
        Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
      </p>

      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
          Email Address
        </label>
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] py-3.5 pl-11 pr-4 text-[13px] text-[#302115] outline-none transition-all placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[12px] text-[#a94442]">{error}</p>
        </div>
      )}

      {/* Success */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-[#4a7c3f]/25 bg-[#4a7c3f]/8 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-[12px] text-[#302115]">{successMessage}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="group relative w-full overflow-hidden rounded-full bg-[#1e1710] px-6 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14] hover:shadow-[0_4px_20px_rgba(30,23,16,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <span className="relative flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Reset Link
            </>
          )}
        </span>
      </button>

      {/* Back to login */}
      <p className="text-center text-[13px] text-[#6c5641]">
        Remember your password?{" "}
        <Link href="/auth/login" className="font-semibold text-[#a67126] transition-colors hover:text-[#8b5d1e]">
          Sign in
        </Link>
      </p>
    </form>
  );
}
