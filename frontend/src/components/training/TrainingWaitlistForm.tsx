"use client";

import type { FormEvent } from "react";
import { useState } from "react";

export default function TrainingWaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 flex w-full max-w-[560px] flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="training-email">
        Email address
      </label>
      <input
        id="training-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email for launch updates"
        className="h-[52px] w-full rounded-full border border-[#a67126]/18 bg-[#090705]/80 px-5 text-[13px] text-[#f4eee4] outline-none transition-colors placeholder:text-[#f4eee4]/28 focus:border-[#d4943b]/60"
      />
      <button
        type="submit"
        className="group relative inline-flex h-[52px] items-center justify-center overflow-hidden rounded-full border border-[#c89e65]/45 bg-[#a67126] px-7 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(166,113,38,0.3)]"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <span className="relative">Get Launch Updates</span>
      </button>
      {submitted && <p className="mt-1 text-[12px] text-[#d4943b] sm:col-span-2">You’re on the list. We’ll share updates when the facility moves forward.</p>}
    </form>
  );
}