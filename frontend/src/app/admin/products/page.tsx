"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { archiveAdminProduct, hardDeleteAdminProduct, listAdminProducts, type AdminProduct } from "@/lib/api";

export default function AdminProductsPage() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);
        const result = await listAdminProducts(page, 20, status, sort, query);
        if (active) {
          setItems(result.items);
          setTotalPages(Math.max(1, result.pagination.total_pages));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load products");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, [page, query, sort, status]);

  async function handleArchive(productId: number) {
    setSavingProductId(productId);
    setError(null);
    try {
      const updated = await archiveAdminProduct(productId);
      setItems((prev) => prev.map((item) => (item.id === productId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive product");
    } finally {
      setSavingProductId(null);
    }
  }

  async function handleHardDelete(productId: number) {
    const confirmed = window.confirm("Permanently delete this product? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setSavingProductId(productId);
    setError(null);
    try {
      await hardDeleteAdminProduct(productId);
      setItems((prev) => prev.filter((item) => item.id !== productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hard-delete product");
    } finally {
      setSavingProductId(null);
    }
  }

  return (
    <AdminShell
      title="Products"
      subtitle="Manage product catalog and stock."
      actions={
        <Link
          href="/admin/products/new"
          className="rounded-full bg-[#c89e65] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d0b09] transition hover:bg-[#ddb684]"
        >
          + New Product
        </Link>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <input
          value={query}
          onChange={(event) => {
            setPage(1);
            setQuery(event.target.value);
          }}
          placeholder="Search products"
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        >
          <option value="all">All products</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={sort}
          onChange={(event) => {
            setPage(1);
            setSort(event.target.value);
          }}
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
          <option value="price_low">Price low-high</option>
          <option value="price_high">Price high-low</option>
        </select>
      </div>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading products...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-[#d8c19a]">No products found.</p>
            ) : (
              items.map((product) => (
                <div
                  key={product.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                    product.is_active
                      ? "border-[#8b6f47]/25 bg-[#120f0c]"
                      : "border-[#8b6f47]/10 bg-[#120f0c]/60 opacity-70"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#f2dfc0]">{product.name}</p>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        product.is_active
                          ? "bg-[#2b4a2b]/60 text-[#a3d9a5]"
                          : "bg-[#a94442]/15 text-[#f4c2c2]"
                      }`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-[#d8c19a]/60">
                      <span>{product.price_display}</span>
                      <span>Stock: {product.stock_quantity}</span>
                      <span>ID: {product.id}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/admin/products/${product.id}/images`}
                      className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#b8d8ec] transition hover:bg-[#4f7d9a]/15"
                    >
                      Images
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#c89e65] transition hover:bg-[#c89e65]/15"
                    >
                      Edit
                    </Link>
                    <button
                      disabled={savingProductId === product.id || !product.is_active}
                      onClick={() => void handleArchive(product.id)}
                      className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#d8c19a]/70 transition hover:bg-[#8b6f47]/15 disabled:opacity-30"
                    >
                      Archive
                    </button>
                    <button
                      disabled={savingProductId === product.id}
                      onClick={() => void handleHardDelete(product.id)}
                      className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#a94442] transition hover:bg-[#a94442]/15 disabled:opacity-30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-md border border-[#8b6f47]/60 px-3 py-1 text-xs text-[#d8c19a] disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs text-[#cdb793]">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-md border border-[#8b6f47]/60 px-3 py-1 text-xs text-[#d8c19a] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
