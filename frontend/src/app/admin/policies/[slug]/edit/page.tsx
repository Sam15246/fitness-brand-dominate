"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminPolicy, updateAdminPolicy, type PolicyPageContent } from "@/lib/api";

export default function AdminPolicyEditPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [policy, setPolicy] = useState<PolicyPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!slug) {
        setError("Invalid policy slug");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getAdminPolicy(slug);
        if (active) {
          setPolicy(response);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load policy");
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
  }, [slug]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateAdminPolicy(slug, {
        title: String(form.get("title") || "").trim(),
        content: String(form.get("content") || "").trim(),
      });
      setPolicy(updated);
      setSuccess("Policy updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Edit Policy" subtitle={`Policy: ${slug || "-"}`}>
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading policy...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}
      {success ? <div className="rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-5 text-sm text-[#c7e5b9]">{success}</div> : null}

      {policy ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
          <div>
            <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={policy.title} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#d8c19a]" htmlFor="content">Content (HTML)</label>
            <textarea id="content" name="content" rows={14} defaultValue={policy.content} className="w-full rounded-lg border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-2 text-sm text-[#f4eee4] outline-none focus:border-[#b59a73]" />
          </div>
          <button type="submit" disabled={saving} className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60">{saving ? "Saving..." : "Save Policy"}</button>
        </form>
      ) : null}
    </AdminShell>
  );
}
