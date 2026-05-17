"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { createAdminOrder, getAdminProduct, listAdminVariants, type AdminProduct, type AdminVariant } from "@/lib/api";

type CsvRow = Record<string, string>;

type ImportLine = {
  product_id: number;
  variant_id: number | null;
  quantity: number;
  unit_price: number | null;
};

type ImportOrder = {
  key: string;
  customer_name: string;
  phone_number: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  confirm_now: boolean;
  lines: ImportLine[];
  issues: string[];
};

type ProductCache = Record<string, AdminProduct>;
type VariantCache = Record<string, AdminVariant[]>;

const SAMPLE_CSV = `order_ref,customer_name,phone_number,email,city,state,pincode,address,product_id,variant_id,quantity,unit_price_rupees,confirm_now
MAY-001,Arjun Mehta,9876543210,arjun@example.com,Delhi,Delhi,110001,12 Ring Road,1,,2,999,yes
MAY-001,Arjun Mehta,9876543210,arjun@example.com,Delhi,Delhi,110001,12 Ring Road,2,,1,150,yes
MAY-002,Neha Sharma,9123456780,neha@example.com,Jaipur,Rajasthan,302001,44 C-Scheme,3,,4,,no`;

export default function AdminOrderImportPage() {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ key: string; ok: boolean; message: string; orderId?: number; orderNumber?: string }>>([]);
  const [productCache, setProductCache] = useState<ProductCache>({});
  const [variantCache, setVariantCache] = useState<VariantCache>({});

  const parsed = useMemo(() => parseImportCsv(csvText), [csvText]);

  async function ensureProduct(productId: number) {
    const key = String(productId);
    if (productCache[key]) {
      return productCache[key];
    }

    const product = await getAdminProduct(productId);
    setProductCache((current) => ({ ...current, [key]: product }));
    return product;
  }

  async function ensureVariants(productId: number) {
    const key = String(productId);
    if (variantCache[key]) {
      return variantCache[key];
    }

    const variants = await listAdminVariants(productId);
    setVariantCache((current) => ({ ...current, [key]: variants }));
    return variants;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvText(text);
  }

  async function importOrders() {
    setImporting(true);
    setError(null);
    setSuccess(null);
    setResults([]);

    try {
      const grouped = groupImportRows(parsed.rows);
      if (grouped.length === 0) {
        throw new Error("No valid rows found in the CSV.");
      }

      const nextResults: Array<{ key: string; ok: boolean; message: string; orderId?: number; orderNumber?: string }> = [];

      for (const order of grouped) {
        if (order.issues.length > 0) {
          nextResults.push({ key: order.key, ok: false, message: order.issues.join("; ") });
          continue;
        }

        const items = [] as Array<{ product_id: number; variant_id: number | null; quantity: number; unit_price?: number | null }>;

        for (const line of order.lines) {
          const product = await ensureProduct(line.product_id);
          const variants = await ensureVariants(line.product_id);
          let unitPrice = line.unit_price;

          if (line.variant_id) {
            const variant = variants.find((entry) => entry.id === line.variant_id);
            if (!variant) {
              throw new Error(`Order ${order.key}: variant ${line.variant_id} not found for product ${product.name}`);
            }
            if (unitPrice == null) {
              unitPrice = variant.effective_price / 100;
            }
          } else if (unitPrice == null) {
            unitPrice = product.price / 100;
          }

          items.push({
            product_id: line.product_id,
            variant_id: line.variant_id,
            quantity: line.quantity,
            unit_price: Math.round(unitPrice * 100),
          });
        }

        const orderResult = await createAdminOrder({
          customer_name: order.customer_name,
          phone_number: order.phone_number,
          email: order.email,
          city: order.city,
          state: order.state,
          pincode: order.pincode,
          address: order.address,
          confirm_now: order.confirm_now,
          items,
        });

        nextResults.push({
          key: order.key,
          ok: true,
          message: `Created ${orderResult.order_number}`,
          orderId: orderResult.id,
          orderNumber: orderResult.order_number,
        });
      }

      setResults(nextResults);
      setSuccess(`Imported ${nextResults.filter((entry) => entry.ok).length} order group(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import orders");
    } finally {
      setImporting(false);
    }
  }

  return (
    <AdminShell
      title="Bulk Import Orders"
      subtitle="Paste or upload CSV rows for offline, manual, and bulk order records."
      actions={
        <Link href="/admin/orders" className="rounded-full border border-[#8b6f47]/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8c19a] transition hover:bg-[#8b6f47]/15">
          Back to Orders
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-4 text-sm text-[#f4c2c2]">{error}</div> : null}
          {success ? <div className="rounded-xl border border-[#5b8f45]/50 bg-[#1d2d17] p-4 text-sm text-[#c7e5b9]">{success}</div> : null}

          <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">CSV Input</h2>
                <p className="text-xs text-[#d8c19a]/60">Each row is one order line. Rows with the same <span className="font-mono">order_ref</span> are grouped into one order.</p>
              </div>
              <label className="rounded-lg border border-[#8b6f47]/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8c19a] transition hover:bg-[#8b6f47]/15">
                Upload CSV
                <input type="file" accept=".csv,text/csv" onChange={(event) => void handleFileChange(event)} className="hidden" />
              </label>
            </div>

            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={14}
              className="w-full rounded-xl border border-[#8b6f47]/40 bg-[#120f0c] px-3 py-3 font-mono text-[12px] leading-6 text-[#f4eee4] outline-none focus:border-[#b59a73]"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void importOrders()}
                disabled={importing}
                className="rounded-full bg-[#c89e65] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d0b09] transition hover:bg-[#ddb684] disabled:opacity-60"
              >
                {importing ? "Importing..." : "Import Orders"}
              </button>
              <button
                type="button"
                onClick={() => setCsvText(SAMPLE_CSV)}
                className="rounded-full border border-[#8b6f47]/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d8c19a] transition hover:bg-[#8b6f47]/15"
              >
                Load sample
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">Parse Summary</h2>
            <div className="mt-3 grid gap-3 text-sm text-[#d8c19a]">
              <Summary label="Rows" value={parsed.rows.length} />
              <Summary label="Grouped orders" value={parsed.orders.length} />
              <Summary label="Validation issues" value={parsed.orders.reduce((count, order) => count + order.issues.length, 0)} />
            </div>
          </div>

          <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">Expected Columns</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#d8c19a]/80">
              <li><span className="font-mono">order_ref</span>, <span className="font-mono">customer_name</span>, <span className="font-mono">phone_number</span>, <span className="font-mono">email</span></li>
              <li><span className="font-mono">city</span>, <span className="font-mono">state</span>, <span className="font-mono">pincode</span>, <span className="font-mono">address</span></li>
              <li><span className="font-mono">product_id</span>, <span className="font-mono">variant_id</span>, <span className="font-mono">quantity</span>, <span className="font-mono">unit_price_rupees</span></li>
              <li><span className="font-mono">confirm_now</span> (yes/no)</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">Preview</h2>
            <div className="mt-3 space-y-3">
              {parsed.orders.map((order) => (
                <div key={order.key} className={`rounded-xl border px-4 py-3 ${order.issues.length ? "border-[#a94442]/30 bg-[#2b1414]/40" : "border-[#8b6f47]/20 bg-[#120f0c]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#f2dfc0]">{order.key}</p>
                      <p className="text-xs text-[#d8c19a]/60">{order.customer_name} • {order.lines.length} line(s)</p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${order.issues.length ? "bg-[#a94442]/15 text-[#f4c2c2]" : "bg-[#2b4a2b]/60 text-[#a3d9a5]"}`}>
                      {order.issues.length ? "Needs Fix" : order.confirm_now ? "Confirm" : "Draft"}
                    </span>
                  </div>
                  {order.issues.length ? <p className="mt-2 text-xs text-[#f4c2c2]">{order.issues.join("; ")}</p> : null}
                  <div className="mt-2 space-y-1 text-xs text-[#d8c19a]/75">
                    {order.lines.map((line, lineIndex) => (
                      <p key={`${order.key}-${lineIndex}`}>
                        Product {line.product_id} {line.variant_id ? `• Variant ${line.variant_id}` : ""} • Qty {line.quantity} {line.unit_price != null ? `• ₹${line.unit_price.toFixed(2)}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {results.length > 0 ? (
            <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#c89e65]">Import Results</h2>
              <div className="mt-3 space-y-2 text-sm">
                {results.map((result) => (
                  <div key={result.key} className={`rounded-lg border px-3 py-2 ${result.ok ? "border-[#2b4a2b]/60 bg-[#120f0c] text-[#c7e5b9]" : "border-[#a94442]/40 bg-[#2b1414] text-[#f4c2c2]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{result.key}</span>
                      <span>{result.message}</span>
                    </div>
                    {result.orderNumber ? <p className="mt-1 text-xs text-[#d8c19a]/70">Order {result.orderNumber}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-[#f2dfc0]">{value}</span>
    </div>
  );
}

function parseImportCsv(text: string): { rows: CsvRow[]; orders: ImportOrder[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return { rows: [], orders: [] };
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });
    return row;
  });

  return { rows, orders: groupImportRows(rows) };
}

function groupImportRows(rows: CsvRow[]): ImportOrder[] {
  const grouped = new Map<string, ImportOrder>();

  rows.forEach((row, index) => {
    const key = (row.order_ref || row.order_number || row.reference || `ROW-${index + 1}`).trim();
    const order = grouped.get(key) || {
      key,
      customer_name: row.customer_name || row.name || "",
      phone_number: row.phone_number || row.phone || "",
      email: row.email || "",
      city: row.city || "",
      state: row.state || "",
      pincode: row.pincode || "",
      address: row.address || "",
      confirm_now: parseBoolean(row.confirm_now, true),
      lines: [],
      issues: [],
    };

    const productId = Number(row.product_id || 0);
    const variantIdRaw = row.variant_id || "";
    const quantity = Number(row.quantity || 0);
    const unitPriceRaw = row.unit_price_rupees || row.unit_price || "";
    const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : null;

    if (!key) {
      order.issues.push(`Row ${index + 1}: order_ref is required`);
    }
    if (!order.customer_name) {
      order.customer_name = row.customer_name || "";
    }
    if (!productId) {
      order.issues.push(`Row ${index + 1}: product_id is required`);
    }
    if (quantity <= 0) {
      order.issues.push(`Row ${index + 1}: quantity must be greater than 0`);
    }

    order.lines.push({
      product_id: productId,
      variant_id: variantIdRaw ? Number(variantIdRaw) : null,
      quantity,
      unit_price: Number.isFinite(unitPrice ?? NaN) ? unitPrice : null,
    });

    grouped.set(key, order);
  });

  return Array.from(grouped.values());
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value == null || value.trim() === "") {
    return defaultValue;
  }
  return ["1", "true", "yes", "y", "on"].includes(value.trim().toLowerCase());
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  result.push(current);
  return result;
}