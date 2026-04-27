export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="h-4 w-24 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-3 h-12 w-52 animate-pulse rounded bg-[#e4d3b7]" />
          </div>
          <div className="h-10 w-56 animate-pulse rounded-lg bg-[#e4d3b7]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-[#d9c8ad] bg-[#fff8ec] p-4">
              <div className="mb-3 aspect-[4/3] animate-pulse rounded-lg bg-[#e4d3b7]" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-[#e4d3b7]" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-[#e4d3b7]" />
              <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-[#e4d3b7]" />
              <div className="mt-4 h-9 w-28 animate-pulse rounded-full bg-[#e4d3b7]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
