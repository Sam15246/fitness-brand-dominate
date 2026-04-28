"use client";

import { useEffect, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { createAdminAffiliateProfile, deleteAdminUser, listAdminUsers, updateAdminUser, type AdminUser } from "@/lib/api";

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await listAdminUsers(page, 20, role, q);
        if (active) {
          setItems(response.items);
          setTotalPages(Math.max(1, response.pagination.total_pages));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load users");
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
  }, [page, q, role]);

  async function handleUserUpdate(userId: number, payload: { role?: string; is_active?: boolean }) {
    setSavingUserId(userId);
    setError(null);
    try {
      const updated = await updateAdminUser(userId, payload);
      setItems((prev) => prev.map((item) => (item.id === userId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleCreateAffiliateProfile(userId: number) {
    setSavingUserId(userId);
    setError(null);
    try {
      await createAdminAffiliateProfile(userId, { commission_percent: 10 });
      setItems((prev) =>
        prev.map((item) =>
          item.id === userId
            ? {
                ...item,
                has_affiliate_profile: true,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create affiliate profile");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDeleteUser(user: AdminUser) {
    const typed = window.prompt(`Type DELETE to permanently remove ${user.name} (${user.email}).`);
    if (typed !== "DELETE") {
      return;
    }

    setSavingUserId(user.id);
    setError(null);
    try {
      await deleteAdminUser(user.id);
      setItems((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <AdminShell title="Users" subtitle="Manage user roles and account states.">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <input
          value={q}
          onChange={(event) => {
            setPage(1);
            setQ(event.target.value);
          }}
          placeholder="Search users"
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        />
        <select
          value={role}
          onChange={(event) => {
            setPage(1);
            setRole(event.target.value);
          }}
          className="rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]"
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
          <option value="superadmin">Superadmins</option>
        </select>
      </div>

      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading users...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                  item.is_active
                    ? "border-[#8b6f47]/25 bg-[#120f0c]"
                    : "border-[#8b6f47]/10 bg-[#120f0c]/60 opacity-70"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#f2dfc0]">{item.name}</span>
                    <RoleBadge role={item.role} />
                    {!item.is_active && (
                      <span className="rounded-md bg-[#a94442]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f4c2c2]">
                        Inactive
                      </span>
                    )}
                    {item.has_affiliate_profile && (
                      <span className="rounded-md bg-[#2b4a2b]/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#a3d9a5]">
                        Affiliate
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-[#d8c19a]/60">
                    <span>{item.email}</span>
                    {item.phone ? <span>{item.phone}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={item.role}
                    disabled={savingUserId === item.id}
                    onChange={(event) => void handleUserUpdate(item.id, { role: event.target.value })}
                    className="rounded-md border border-[#8b6f47]/30 bg-[#0d0b09] px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#f4eee4] outline-none focus:border-[#c89e65]"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                  <button
                    disabled={savingUserId === item.id}
                    onClick={() => void handleUserUpdate(item.id, { is_active: !item.is_active })}
                    className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition disabled:opacity-30 ${
                      item.is_active
                        ? "text-[#f4c2c2] hover:bg-[#a94442]/15"
                        : "text-[#a3d9a5] hover:bg-[#2b4a2b]/30"
                    }`}
                  >
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                  {!item.has_affiliate_profile ? (
                    <button
                      disabled={savingUserId === item.id}
                      onClick={() => void handleCreateAffiliateProfile(item.id)}
                      className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#a3d9a5] transition hover:bg-[#2b4a2b]/30 disabled:opacity-30"
                    >
                      Make Affiliate
                    </button>
                  ) : null}
                  <button
                    disabled={savingUserId === item.id}
                    onClick={() => void handleDeleteUser(item)}
                    className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#a94442] transition hover:bg-[#a94442]/15 disabled:opacity-30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-[#d8c19a]">No users found.</p> : null}
          </div>
          <Pager page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      ) : null}
    </AdminShell>
  );
}

const ROLE_STYLES: Record<string, string> = {
  superadmin: "bg-[#6b5bcd]/15 text-[#c4bef0]",
  admin: "bg-[#c89e65]/15 text-[#c89e65]",
  user: "bg-[#8b6f47]/10 text-[#d8c19a]/60",
};

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] || ROLE_STYLES.user;
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style}`}>
      {role}
    </span>
  );
}

function Pager({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (value: number | ((v: number) => number)) => void }) {
  return (
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
  );
}
