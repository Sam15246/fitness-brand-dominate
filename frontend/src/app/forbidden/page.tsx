import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#b59a73]">403</p>
      <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.05em] text-[#f2dfc0]">Access Forbidden</h1>
      <p className="mt-4 text-sm text-[#d8c19a]">You do not have permission to view this page.</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
      >
        Go Home
      </Link>
    </div>
  );
}
