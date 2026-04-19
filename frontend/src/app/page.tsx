import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top_right,#3a2b1f_0%,#0d0b09_50%,#080706_100%)] px-6 py-16">
      <main className="w-full max-w-5xl rounded-2xl border border-[#8b6f47]/30 bg-[#13100d]/70 p-10 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.28em] text-[#b59a73]">DOMINATE SPA Migration</p>
        <h1 className="text-brand-display mt-4 text-6xl uppercase tracking-[0.04em] text-[#f2e7d4] md:text-7xl">
          Train Anywhere.
          <br />
          Dominate Everywhere.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#d7c7ad]">
          Next.js frontend foundation is ready. Backend API v1 is now available for integration.
          Build the storefront, checkout, account, admin, and affiliate surfaces incrementally.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#8b6f47]/35 bg-[#1b1612]/80 p-5">
            <h2 className="text-brand-display text-3xl uppercase tracking-[0.05em] text-[#e9d3ae]">Phase 1</h2>
            <p className="mt-2 text-sm text-[#dbcdb8]">API and app shell foundations</p>
            <ul className="mt-3 space-y-2 text-sm text-[#c7b69d]">
              <li>API v1 health endpoint</li>
              <li>API v1 auth me endpoint</li>
              <li>Standardized JSON response envelope</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#8b6f47]/35 bg-[#1b1612]/80 p-5">
            <h2 className="text-brand-display text-3xl uppercase tracking-[0.05em] text-[#e9d3ae]">Next</h2>
            <p className="mt-2 text-sm text-[#dbcdb8]">Immediate implementation queue</p>
            <ul className="mt-3 space-y-2 text-sm text-[#c7b69d]">
              <li>Auth login and logout API routes</li>
              <li>Products list and detail APIs</li>
              <li>React data layer for API calls</li>
            </ul>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link
            className="rounded-full border border-[#9f8157] bg-[#8b6f47] px-5 py-2 font-semibold text-[#17110c] transition hover:bg-[#a1845d]"
            href="/"
          >
            Storefront Module
          </Link>
          <Link
            className="rounded-full border border-[#9f8157] px-5 py-2 font-semibold text-[#f1ddbe] transition hover:bg-[#8b6f47] hover:text-[#17110c]"
            href="/auth/login"
          >
            Sign In
          </Link>
          <Link
            className="rounded-full border border-[#9f8157] px-5 py-2 font-semibold text-[#f1ddbe] transition hover:bg-[#8b6f47] hover:text-[#17110c]"
            href="/auth/register"
          >
            Create Account
          </Link>
          <span className="rounded-full border border-[#7f6847] px-5 py-2 text-[#d9c8ad]">API Base: /api/v1</span>
        </div>
      </main>
    </div>
  );
}
