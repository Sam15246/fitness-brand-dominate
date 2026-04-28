"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { login } from "@/lib/api";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({ email, password, remember });
      const defaultPath = ["admin", "superadmin"].includes((user.role || "").toLowerCase())
        ? "/admin/dashboard"
        : "/products";
      const nextPath = searchParams.get("next") || defaultPath;
      router.push(nextPath.startsWith("/") ? nextPath : "/products");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

      {/* Password */}
      <div>
        <label htmlFor="password" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
          Password
        </label>
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] py-3.5 pl-11 pr-11 text-[13px] text-[#302115] outline-none transition-all placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b5a08a] transition-colors hover:text-[#6c5641]"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Remember + Forgot */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2.5 text-[12px] text-[#6c5641]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-[#d9c8ad] bg-[#fffefb] text-[#a67126] focus:ring-[#a67126]/20"
          />
          Remember me
        </label>
        <Link
          href="/auth/forgot-password"
          className="text-[12px] font-medium text-[#a67126] transition-colors hover:text-[#8b5d1e]"
        >
          Forgot password?
        </Link>
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
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </span>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-[#d9c8ad]/60" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b5a08a]">or continue with</span>
        <span className="h-px flex-1 bg-[#d9c8ad]/60" />
      </div>

      {/* Google */}
      <GoogleSignInButton />

      {/* Register link */}
      <p className="text-center text-[13px] text-[#6c5641]">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-semibold text-[#a67126] transition-colors hover:text-[#8b5d1e]">
          Create one
        </Link>
      </p>
    </form>
  );
}
