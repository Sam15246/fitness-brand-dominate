"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminShell from "@/components/admin/AdminShell";
import { listAdminPolicies, type PolicyPageContent } from "@/lib/api";

export default function AdminPoliciesPage() {
  const [items, setItems] = useState<PolicyPageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await listAdminPolicies();
        if (active) {
          setItems(response);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load policies");
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
  }, []);

  return (
    <AdminShell title="Policies" subtitle="Manage shipping, returns, terms, and privacy content.">
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading policies...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[#f2dfc0]">{item.title}</p>
                  <p className="text-xs text-[#cdb793]">/{item.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/policies/${item.slug}/edit`}
                    className="rounded-full border border-[#8b6f47]/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e]"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/policy/${item.slug}`}
                    className="rounded-full border border-[#4f7d9a]/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#b8d8ec] hover:bg-[#4f7d9a] hover:text-[#0f1a22]"
                  >
                    Preview
                  </Link>
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-[#d8c19a]">No policies available.</p> : null}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
