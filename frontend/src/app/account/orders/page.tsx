'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getContactInfo, listUserOrders } from '@/lib/api';
import type { OrderSummary } from '@/lib/api';

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
  const [whatsappNumber, setWhatsappNumber] = useState('');

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
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [page, perPage, router]);

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getShippingBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'packed':
        return 'bg-indigo-100 text-indigo-800';
      case 'pending':
      case 'not_shipped':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const reviewedSet = new Set(reviewedOrderItemIds);
  const reviewableSet = new Set(reviewableOrderItemIds);

  function formatOrderStatus(status: string) {
    return status ? `${status.charAt(0).toUpperCase()}${status.slice(1).replace(/_/g, ' ')}` : 'Unknown';
  }

  function getWhatsappHelpUrl(orderNumber: string) {
    if (!whatsappNumber) {
      return null;
    }
    const text = encodeURIComponent(`Hi DOMINATE team, I need help with my order ${orderNumber}.`);
    return `https://wa.me/${encodeURIComponent(whatsappNumber)}?text=${text}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="mt-2 text-sm text-gray-600">View and track all your orders</p>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-amber-600"></div>
              <p className="mt-4 text-sm text-gray-600">Loading your orders...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">Error loading orders</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-lg bg-gray-100 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
            <p className="mt-2 text-sm text-gray-600">Start shopping to create your first order.</p>
            <Link href="/products" className="mt-4 inline-block bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
              Continue Shopping
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <>
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{order.order_number}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Placed on {new Date(order.created_at || '').toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                        {formatOrderStatus(order.status)}
                      </span>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getShippingBadgeColor(order.shipping_status)}`}>
                        {formatOrderStatus(order.shipping_status)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 border-t border-gray-200 pt-4">
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-gray-600">Qty: {item.quantity}</p>
                            <div className="mt-1 flex gap-2">
                              {reviewableSet.has(item.id) && item.product_slug ? (
                                <Link
                                  href={`/products/${encodeURIComponent(item.product_slug)}#write-review`}
                                  className="text-xs font-medium text-amber-700 hover:text-amber-800"
                                >
                                  Write review
                                </Link>
                              ) : null}
                              {reviewedSet.has(item.id) ? (
                                <span className="text-xs font-medium text-green-700">Review submitted</span>
                              ) : null}
                            </div>
                          </div>
                          <p className="font-medium text-gray-900">{item.subtotal_display}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {expandedOrderId === order.id ? (
                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                      <p className="font-medium text-gray-900">Delivery Details</p>
                      <p className="mt-1">{order.guest_name} · {order.guest_phone}</p>
                      <p>{order.address}</p>
                      <p>
                        {order.city}, {order.state} {order.pincode}
                      </p>
                    </div>
                  ) : null}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Total:</span>
                      <span className="text-lg font-bold text-gray-900">{order.total_price_display}</span>
                    </div>
                    {order.address && (
                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Shipping to</p>
                        <p className="mt-1 text-sm text-gray-700">{order.guest_name}</p>
                        <p className="text-sm text-gray-700">{order.address}</p>
                        <p className="text-sm text-gray-700">
                          {order.city}, {order.state} {order.pincode}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => router.push(`/order/status?order=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.guest_email)}`)}
                      className="rounded-lg border border-amber-600 px-4 py-2 text-center text-sm font-medium text-amber-600 hover:bg-amber-50"
                    >
                      Track Order
                    </button>
                    <button
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {expandedOrderId === order.id ? 'Hide details' : 'View details'}
                    </button>
                    <Link
                      href={`/products?q=${encodeURIComponent(order.items[0]?.product_name || '')}`}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Reorder
                    </Link>
                    {((order.status || '').toLowerCase() === 'pending' || (order.status || '').toLowerCase() === 'confirmed') && getWhatsappHelpUrl(order.order_number) ? (
                      <Link
                        href={getWhatsappHelpUrl(order.order_number) as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-green-600 px-4 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-50"
                      >
                        WhatsApp Support
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {pagination.total_pages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <p className="text-sm text-gray-600">
                  Page {pagination.current_page} of {pagination.total_pages}
                </p>
                <button
                  onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
                  disabled={page === pagination.total_pages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <Link href="/products" className="text-sm font-medium text-amber-600 hover:text-amber-700">
            ← Back to Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
