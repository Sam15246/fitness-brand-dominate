"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import {
  cancelAdminOrder,
  confirmAdminOrder,
  getAdminOrder,
  updateAdminOrderShipping,
  updateAdminOrderStatus,
  type OrderSummary,
} from "@/lib/api";

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId || 0);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("pending");
  const [shippingStatus, setShippingStatus] = useState("pending");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [cancelReason, setCancelReason] = useState("Admin cancellation");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!orderId || Number.isNaN(orderId)) {
        setError("Invalid order id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const value = await getAdminOrder(orderId);
        if (active) {
          setOrder(value);
          setStatus(value.status || "pending");
          setShippingStatus(value.shipping_status || "pending");
          setTrackingNumber(value.tracking_number || "");
          setCourierName(value.courier_name || "");
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load order");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOrder();
    return () => {
      active = false;
    };
  }, [orderId]);

  async function runOrderAction(action: () => Promise<OrderSummary>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await action();
      setOrder(updated);
      setStatus(updated.status || "pending");
      setShippingStatus(updated.shipping_status || "pending");
      setTrackingNumber(updated.tracking_number || "");
      setCourierName(updated.courier_name || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Order Detail" subtitle={`Order ID: ${orderId || "-"}`}>
      {loading ? <div className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5 text-sm text-[#d8c19a]">Loading order...</div> : null}
      {error ? <div className="rounded-xl border border-[#a94442]/50 bg-[#2b1414]/70 p-5 text-sm text-[#f4c2c2]">{error}</div> : null}

      {order ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h2 className="text-lg font-semibold text-[#f2dfc0]">{order.order_number}</h2>
            <p className="mt-1 text-sm text-[#d8c19a]">{order.guest_name} • {order.guest_email} • {order.guest_phone}</p>
            <p className="mt-1 text-sm text-[#d8c19a]">{order.address}, {order.city}, {order.state} {order.pincode}</p>
            <p className="mt-2 text-sm text-[#cdb793]">Status: {order.status} • Shipping: {order.shipping_status}</p>
            <div className="mt-4 grid gap-3 rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] p-3 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.08em] text-[#b59a73]">
                Order Status
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="flex-1 rounded border border-[#8b6f47]/50 bg-[#1a1510] px-2 py-1 text-xs text-[#f4eee4] outline-none"
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button
                    disabled={saving}
                    onClick={() => void runOrderAction(() => updateAdminOrderStatus(order.id, status))}
                    className="rounded border border-[#8b6f47]/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </label>

              <label className="text-xs uppercase tracking-[0.08em] text-[#b59a73]">
                Shipping Status
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={shippingStatus}
                    onChange={(event) => setShippingStatus(event.target.value)}
                    className="flex-1 rounded border border-[#8b6f47]/50 bg-[#1a1510] px-2 py-1 text-xs text-[#f4eee4] outline-none"
                  >
                    <option value="pending">pending</option>
                    <option value="packed">packed</option>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                    <option value="returned">returned</option>
                  </select>
                </div>
              </label>

              <label className="text-xs uppercase tracking-[0.08em] text-[#b59a73]">
                Tracking Number
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  className="mt-2 w-full rounded border border-[#8b6f47]/50 bg-[#1a1510] px-2 py-1 text-xs text-[#f4eee4] outline-none"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.08em] text-[#b59a73]">
                Courier
                <input
                  value={courierName}
                  onChange={(event) => setCourierName(event.target.value)}
                  className="mt-2 w-full rounded border border-[#8b6f47]/50 bg-[#1a1510] px-2 py-1 text-xs text-[#f4eee4] outline-none"
                />
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-2">
                <button
                  disabled={saving}
                  onClick={() =>
                    void runOrderAction(() =>
                      updateAdminOrderShipping(order.id, {
                        shipping_status: shippingStatus,
                        tracking_number: trackingNumber,
                        courier_name: courierName,
                      }),
                    )
                  }
                  className="rounded border border-[#8b6f47]/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8c19a] disabled:opacity-40"
                >
                  Update Shipping
                </button>
                <button
                  disabled={saving}
                  onClick={() => void runOrderAction(() => confirmAdminOrder(order.id))}
                  className="rounded border border-[#496e3f]/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#bde4b2] disabled:opacity-40"
                >
                  Confirm Order
                </button>
                <input
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  className="min-w-52 flex-1 rounded border border-[#8b6f47]/50 bg-[#1a1510] px-2 py-1 text-xs text-[#f4eee4] outline-none"
                  placeholder="Cancellation reason"
                />
                <button
                  disabled={saving}
                  onClick={() => void runOrderAction(() => cancelAdminOrder(order.id, cancelReason))}
                  className="rounded border border-[#a94442]/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f4c2c2] disabled:opacity-40"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#8b6f47]/30 bg-[#17120f] p-5">
            <h3 className="text-base font-semibold text-[#f2dfc0]">Items</h3>
            <div className="mt-3 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#8b6f47]/20 bg-[#120f0c] px-3 py-2 text-sm text-[#d8c19a]">
                  <p className="font-medium text-[#f2dfc0]">{item.product_name}</p>
                  <p>Qty {item.quantity} x {item.unit_price_display} = {item.subtotal_display}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-[#f2dfc0]">Total: {order.total_price_display}</p>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
