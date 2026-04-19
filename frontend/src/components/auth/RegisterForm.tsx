"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { register } from "@/lib/api";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 3) {
      setError("Name must be at least 3 characters long.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please provide a valid email.");
      return;
    }

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
      await register({ name: name.trim(), email: email.trim(), password });
      router.push("/products");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-[#e8ddcb]">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
        />
      </div>

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
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm text-[#e8ddcb]">
          Confirm password
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#8b6f47] px-4 py-2 font-semibold text-[#1a130d] transition hover:bg-[#a1845d] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <p className="text-sm text-[#d7c7ad]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#f1ddbe] hover:text-[#fff2db]">
          Sign in
        </Link>
      </p>
    </form>
  );
}
