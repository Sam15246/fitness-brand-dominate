export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 text-[#302115] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-[#e4d3b7]" />

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-[4/3] animate-pulse rounded-2xl border border-[#d9c8ad] bg-[#e4d3b7]" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="aspect-square animate-pulse rounded-lg border border-[#d9c8ad] bg-[#e4d3b7]" />
              ))}
            </div>
          </div>

          <div>
            <div className="h-4 w-36 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-3 h-12 w-3/4 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-5 h-4 w-full animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-6 h-10 w-48 animate-pulse rounded bg-[#e4d3b7]" />
            <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-[#e4d3b7]" />
          </div>
        </section>
      </div>
    </div>
  );
}
