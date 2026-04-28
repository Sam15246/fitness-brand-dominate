import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff8ec] px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#a67126]/10">
          <svg className="h-7 w-7 text-[#a67126]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">404</p>
        <h1 className="mt-2 font-display text-[28px] uppercase tracking-[0.04em] text-[#302115]">
          Page Not Found
        </h1>
        <p className="mt-3 text-[13px] leading-[1.7] text-[#6c5641]">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-[#1e1710] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14]"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
