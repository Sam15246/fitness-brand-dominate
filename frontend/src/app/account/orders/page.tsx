'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getContactInfo, listUserOrders } from '@/lib/api';
import type { OrderSummary } from '@/lib/api';
import AccountNavTabs from '@/components/account/AccountNavTabs';

function getStatusStyle(status: string): string {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'delivered':
      return 'border-[#4a7c3f]/30 bg-[#4a7c3f]/10 text-[#4a7c3f]';
    case 'pending':
      return 'border-[#a67126]/30 bg-[#a67126]/10 text-[#a67126]';
    case 'processing':
    case 'shipped':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    case 'cancelled':
      return 'border-[#a94442]/30 bg-[#a94442]/10 text-[#a94442]';
    default:
      return 'border-[#d9c8ad] bg-[#f5e7d2]/40 text-[#6c5641]';
  }
}

function getShippingStyle(status: string): string {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'border-[#4a7c3f]/30 bg-[#4a7c3f]/10 text-[#4a7c3f]';
    case 'shipped':
    case 'in_transit':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'packed':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    case 'pending':
    case 'not_shipped':
      return 'border-[#a67126]/30 bg-[#a67126]/10 text-[#a67126]';
    default:
      return 'border-[#d9c8ad] bg-[#f5e7d2]/40 text-[#6c5641]';
  }
}

function formatStatus(status: string) {
  return status ? `${status.charAt(0).toUpperCase()}${status.slice(1).replace(/_/g, ' ')}` : 'Unknown';
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [reviewableOrderItemIds, setReviewableOrderItemIds] = useState<number[]>([]);
  const [reviewedOrderItemIds, setReviewedOrderItemIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_items: 0,
    total_pages: 0,
  });
  const [whatsappNumber, setWhatsappNumber] = useState('917068462273');

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ordersResult, contactResult] = await Promise.allSettled([
          listUserOrders(page, perPage),
          getContactInfo(),
        ]);
        if (active) {
          if (ordersResult.status === 'fulfilled') {
            setOrders(ordersResult.value.orders);
            setReviewableOrderItemIds(ordersResult.value.review_state.reviewable_order_item_ids);
            setReviewedOrderItemIds(ordersResult.value.review_state.reviewed_order_item_ids);
            setPagination(ordersResult.value.pagination);
          } else {
            throw ordersResult.reason;
          }
          if (contactResult.status === 'fulfilled') {
            setWhatsappNumber((contactResult.value.whatsapp_number || '').trim());
          }
        }
      } catch (err) {
        if (active) {
          if (err instanceof Error) {
            const message = err.message.toLowerCase();
            if (message.includes('401') || message.includes('unauthorized') || message.includes('authentication required')) {
              router.push('/auth/login?next=/account/orders');
            } else {
              setError(err.message || 'Failed to load orders');
            }
          } else {
            setError('Failed to load orders');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrders();
    return () => { active = false; };
  }, [page, perPage, router]);

  const reviewedSet = new Set(reviewedOrderItemIds);
  const reviewableSet = new Set(reviewableOrderItemIds);

  function getWhatsappHelpUrl(orderNumber: string) {
    if (!whatsappNumber) return null;
    const text = encodeURIComponent(`Hi DOMINATE team, I need help with my order ${orderNumber}.`);
    return `https://wa.me/${encodeURIComponent(whatsappNumber)}?text=${text}`;
  }

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* Header */}
      <div className="border-b border-[#d9c8ad]/40">
        <div className="mx-auto max-w-[1100px] px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">My Account</p>
          <h1 className="mt-2 font-display text-[clamp(28px,5vw,40px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            My Orders
          </h1>
          <p className="mt-2 text-[13px] text-[#6c5641]">View and track all your orders</p>

          <AccountNavTabs activeTab="orders" />
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-5 py-6 sm:px-8 sm:py-8">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 animate-spin text-[#a67126]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-[13px] text-[#6c5641]">Loading your orders...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[12px] text-[#a94442]">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d9c8ad] bg-[#fffefb] py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f5e7d2]">
              <svg className="h-9 w-9 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="mt-5 font-display text-[24px] uppercase tracking-[0.04em] text-[#302115]">No Orders Yet</p>
            <p className="mt-2 text-[13px] text-[#6c5641]">Start shopping to create your first order.</p>
            <Link
              href="/products"
              className="group relative mt-6 inline-flex overflow-hidden rounded-full bg-[#1e1710] px-7 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Browse Products</span>
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && orders.length > 0 && (
          <>
            <div className="space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(146,104,56,0.08)] sm:p-6">
                  {/* Order header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-display text-[18px] tracking-[0.02em] text-[#302115] sm:text-[20px]">{order.order_number}</p>
                      <p className="mt-1 text-[11px] text-[#9a7147]">
                        {new Date(order.created_at || '').toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${getShippingStyle(order.shipping_status)}`}>
                        {formatStatus(order.shipping_status)}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-4 space-y-3 border-t border-[#d9c8ad]/40 pt-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#302115]">{item.product_name}</p>
                          <p className="text-[11px] text-[#9a7147]">Qty: {item.quantity}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {reviewableSet.has(item.id) && item.product_slug && (
                              <Link
                                href={`/products/${encodeURIComponent(item.product_slug)}#write-review`}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#a67126] transition-colors hover:text-[#8b5d1e]"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Write review
                              </Link>
                            )}
                            {reviewedSet.has(item.id) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4a7c3f]">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Review submitted
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="shrink-0 text-[13px] font-semibold text-[#302115]">{item.subtotal_display}</p>
                      </div>
                    ))}
                  </div>

                  {/* Expanded delivery details */}
                  {expandedOrderId === order.id && order.address && (
                    <div className="mt-4 rounded-xl border border-[#d9c8ad]/60 bg-[#f5e7d2]/20 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">Delivery Details</p>
                      <p className="mt-2 text-[13px] font-medium text-[#302115]">{order.guest_name}</p>
                      <p className="mt-0.5 text-[12px] text-[#6c5641]">{order.guest_phone}</p>
                      <p className="mt-1 text-[12px] text-[#6c5641]">{order.address}</p>
                      <p className="text-[12px] text-[#6c5641]">{order.city}, {order.state} {order.pincode}</p>
                    </div>
                  )}

                  {/* Footer: total + actions */}
                  <div className="mt-4 flex flex-col gap-4 border-t border-[#d9c8ad]/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9a7147]">Total</span>
                      <span className="ml-2 font-display text-[22px] tracking-[0.02em] text-[#302115]">{order.total_price_display}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => router.push(`/order/status?order=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.guest_email)}`)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#a67126] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a67126] transition-all hover:bg-[#a67126]/5"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Track
                      </button>
                      <button
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c8ad] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6c5641] transition-all hover:border-[#a67126]/40 hover:text-[#302115]"
                      >
                        {expandedOrderId === order.id ? 'Hide' : 'Details'}
                      </button>
                      {((order.status || '').toLowerCase() === 'pending' || (order.status || '').toLowerCase() === 'confirmed') && getWhatsappHelpUrl(order.order_number) && (
                        <Link
                          href={getWhatsappHelpUrl(order.order_number) as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#4a7c3f]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#4a7c3f] transition-all hover:bg-[#4a7c3f]/5"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Support
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c8ad] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6c5641] transition-all hover:border-[#a67126]/40 disabled:opacity-40"
                >
                  <svg className="h-3.5 w-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Previous
                </button>
                <p className="text-[11px] text-[#9a7147]">
                  Page {pagination.current_page} of {pagination.total_pages}
                </p>
                <button
                  onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
                  disabled={page === pagination.total_pages}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c8ad] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6c5641] transition-all hover:border-[#a67126]/40 disabled:opacity-40"
                >
                  Next
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {/* Back to shopping */}
        <div className="mt-8">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 text-[12px] font-semibold text-[#a67126] transition-colors hover:text-[#8b5d1e]"
          >
            <svg className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Back to Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
