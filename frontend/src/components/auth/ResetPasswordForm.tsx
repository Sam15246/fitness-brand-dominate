"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { resetPassword } from "@/lib/api";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await resetPassword({
        token,
        password,
        confirm_password: confirmPassword,
      });
      setSuccessMessage(message);
      setTimeout(() => {
        router.push("/auth/login");
      }, 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordStrength =
    password.length === 0
      ? null
      : password.length < 6
        ? "weak"
        : password.length < 10
          ? "fair"
          : "strong";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* New Password */}
      <div>
        <label htmlFor="password" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
          New Password
        </label>
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Min. 6 characters"
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
        {/* Password strength indicator */}
        {passwordStrength && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === "weak" ? "bg-[#a94442]" : "bg-[#a67126]"}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === "fair" ? "bg-[#d4943b]" : passwordStrength === "strong" ? "bg-[#4a7c3f]" : "bg-[#d9c8ad]"}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === "strong" ? "bg-[#4a7c3f]" : "bg-[#d9c8ad]"}`} />
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
              passwordStrength === "weak" ? "text-[#a94442]" : passwordStrength === "fair" ? "text-[#d4943b]" : "text-[#4a7c3f]"
            }`}>
              {passwordStrength}
            </span>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
          Confirm New Password
        </label>
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your new password"
            className={`w-full rounded-xl border bg-[#fffefb] py-3.5 pl-11 pr-4 text-[13px] text-[#302115] outline-none transition-all placeholder:text-[#b5a08a] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)] ${
              confirmPassword && confirmPassword !== password
                ? "border-[#a94442] focus:border-[#a94442]"
                : "border-[#d9c8ad] focus:border-[#a67126]"
            }`}
          />
          {confirmPassword && confirmPassword === password && (
            <svg className="absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
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
          <div>
            <p className="text-[12px] text-[#302115]">{successMessage}</p>
            <p className="mt-1 text-[11px] text-[#6c5641]">Redirecting to sign in...</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="group relative w-full overflow-hidden rounded-full bg-[#a67126] px-6 py-[15px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:shadow-[0_4px_20px_rgba(166,113,38,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <span className="relative flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Updating...
            </>
          ) : (
            "Update Password"
          )}
        </span>
      </button>

      {/* Back to login */}
      <p className="text-center text-[13px] text-[#6c5641]">
        <Link href="/auth/login" className="font-semibold text-[#a67126] transition-colors hover:text-[#8b5d1e]">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
