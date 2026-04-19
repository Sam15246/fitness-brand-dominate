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
        <label htmlFor="email" className="mb-1 block text-sm text-[#e8ddcb]">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-[#e8ddcb]">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-[#d7c7ad]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 rounded border-[#8b6f47]/60 bg-[#1a1510]"
        />
        Remember me
      </label>

      {error ? (
        <p role="alert" className="rounded-lg border border-[#a94442]/50 bg-[#2b1414]/70 px-3 py-2 text-sm text-[#f4c2c2]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#8b6f47] px-4 py-2 font-semibold text-[#1a130d] transition hover:bg-[#a1845d] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#8b6f47]/40" />
        <span className="text-xs uppercase tracking-[0.14em] text-[#b59a73]">or</span>
        <span className="h-px flex-1 bg-[#8b6f47]/40" />
      </div>

      <GoogleSignInButton />

      <div className="flex items-center justify-between text-sm">
        <Link href="/auth/forgot-password" className="text-[#d7c7ad] hover:text-[#f1ddbe]">
          Forgot password?
        </Link>
        <Link href="/auth/register" className="text-[#d7c7ad] hover:text-[#f1ddbe]">
          Create account
        </Link>
      </div>
    </form>
  );
}
