"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { adjustAdminAffiliateWallet, listAdminAffiliates, updateAdminAffiliate, type AdminAffiliate } from "@/lib/api";

export default function AdminAffiliatesPage() {
  const [items, setItems] = useState<AdminAffiliate[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [walletDeltaById, setWalletDeltaById] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await listAdminAffiliates(page, 20, q);
        if (active) {
          setItems(response.items);
          setTotalPages(Math.max(1, response.pagination.total_pages));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load affiliates");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, q]);

  async function handleToggle(item: AdminAffiliate) {
    setSavingId(item.id);
    setError(null);
    try {
      const updated = await updateAdminAffiliate(item.id, { is_active: !item.is_active });
      setItems((prev) => prev.map((value) => (value.id === item.id ? updated : value)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update affiliate");
    } finally {
      setSavingId(null);
    }
  }

  async function handleWalletAdjust(item: AdminAffiliate) {
    const raw = (walletDeltaById[item.id] || "").trim();
    const amountRupees = Number(raw);
    if (!raw || Number.isNaN(amountRupees) || amountRupees === 0) {
      setError("Enter a non-zero wallet adjustment amount in rupees");
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);
    setSavingId(item.id);
    setError(null);
    try {
      const updated = await adjustAdminAffiliateWallet(item.id, {
        amount: amountPaise,
        reason: "Manual admin adjustment",
      });
      setItems((prev) => prev.map((value) => (value.id === item.id ? updated : value)));
      setWalletDeltaById((prev) => ({ ...prev, [item.id]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust wallet");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell title="Affiliates" subtitle="Manage affiliate creators and codes.">
      <div className="mb-4">
        <input
          value={q}
          onChange={(event) => {
            setPage(1);
            setQ(event.target.value);
          }}
          placeholder="Search affiliates"
          className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        />
      </div>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading affiliates...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                <p className="text-sm font-medium text-[#f2dfc0]">{item.user_name || "Unknown"} • {item.affiliate_code}</p>
                <p className="text-xs text-[#cdb793]">{item.user_email || "No email"} • Wallet {item.wallet_balance_display} • Earned {item.total_earned_display}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    disabled={savingId === item.id}
                    onClick={() => void handleToggle(item)}
                    className="rounded border border-[#8b6f47]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
                  >
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <input
                    value={walletDeltaById[item.id] || ""}
                    onChange={(event) =>
                      setWalletDeltaById((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="+/- rupees"
                    className="w-28 rounded border border-[#8b6f47]/50 bg-[#1a1510] px-2 py-1 text-[10px] text-[#f4eee4] outline-none"
                  />
                  <button
                    disabled={savingId === item.id}
                    onClick={() => void handleWalletAdjust(item)}
                    className="rounded border border-[#8b6f47]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
                  >
                    Adjust Wallet
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-[#d8c19a]">No affiliates found.</p> : null}
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
