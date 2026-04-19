"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { resetPassword } from "@/lib/api";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-[#e8ddcb]">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm text-[#e8ddcb]">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-[#a94442]/50 bg-[#2b1414]/70 px-3 py-2 text-sm text-[#f4c2c2]">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p role="status" className="rounded-lg border border-[#2d5016]/50 bg-[#162313]/70 px-3 py-2 text-sm text-[#cde5bf]">
          {successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#8b6f47] px-4 py-2 font-semibold text-[#1a130d] transition hover:bg-[#a1845d] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Updating..." : "Update password"}
      </button>

      <p className="text-sm text-[#d7c7ad]">
        <Link href="/auth/login" className="text-[#f1ddbe] hover:text-[#fff2db]">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
