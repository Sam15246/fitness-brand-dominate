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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-[#5b4330]">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-[#d2be9d] bg-[#fffdf8] px-3 py-2 text-sm text-[#3b2513] outline-none placeholder:text-[#9a815f] focus:border-[#b69167]"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-[#5b4330]">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-[#d2be9d] bg-[#fffdf8] px-3 py-2 text-sm text-[#3b2513] outline-none placeholder:text-[#9a815f] focus:border-[#b69167]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-[#6f5640]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 rounded border-[#cdb795] bg-[#fffdf8] text-[#8e653d]"
        />
        Remember me
      </label>

      {error ? (
        <p role="alert" className="rounded-xl border border-[#cc8a7b] bg-[#fff0eb] px-3 py-2 text-sm text-[#8a3f33]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-[#8e653d] px-4 py-2 font-semibold text-[#fff7ea] transition hover:bg-[#a3774b] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#d2be9d]" />
        <span className="text-xs uppercase tracking-[0.14em] text-[#9a7147]">or</span>
        <span className="h-px flex-1 bg-[#d2be9d]" />
      </div>

      <GoogleSignInButton />

      <div className="flex items-center justify-between text-sm">
        <Link href="/auth/forgot-password" className="text-[#7e5f42] hover:text-[#5f4329]">
          Forgot password?
        </Link>
        <Link href="/auth/register" className="text-[#7e5f42] hover:text-[#5f4329]">
          Create account
        </Link>
      </div>
    </form>
  );
}
