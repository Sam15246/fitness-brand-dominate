"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  getCheckoutPreview,
  getCurrentUser,
  getUserAddresses,
  placeOrder,
  type CheckoutPreview,
  type UserAddress,
} from "@/lib/api";

type CheckoutFormState = {
  customer_name: string;
  phone_number: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  coupon_code: string;
  email_opt_in: boolean;
};

const initialFormState: CheckoutFormState = {
  customer_name: "",
  phone_number: "",
  email: "",
  city: "",
  state: "",
  pincode: "",
  address: "",
  coupon_code: "",
  email_opt_in: false,
};

const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromQuery = (
    searchParams.get("coupon") || searchParams.get("code") || searchParams.get("ref") || ""
  )
    .trim()
    .toUpperCase();
  const [form, setForm] = useState<CheckoutFormState>(initialFormState);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [setDefaultAddress, setSetDefaultAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");

  async function loadPreview(couponCode?: string) {
    setLoadingPreview(true);
    setError(null);
    try {
      const value = await getCheckoutPreview(couponCode);
      setPreview(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load checkout preview");
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const previewPromise = getCheckoutPreview(couponFromQuery || undefined);
        const userPromise = getCurrentUser();

        const [previewValue, userResult] = await Promise.allSettled([previewPromise, userPromise]);

        if (!active) {
          return;
        }

        if (previewValue.status === "fulfilled") {
          setPreview(previewValue.value);
          if (couponFromQuery) {
            setForm((prev) => ({ ...prev, coupon_code: couponFromQuery }));
          }
        } else {
          setError(previewValue.reason instanceof Error ? previewValue.reason.message : "Unable to load checkout preview");
        }

        if (userResult.status === "fulfilled") {
          setIsAuthenticated(true);
          setForm((prev) => ({
            ...prev,
            customer_name: prev.customer_name || userResult.value.name || "",
            email: prev.email || userResult.value.email || "",
            phone_number: prev.phone_number || userResult.value.phone || "",
          }));

          try {
            const addresses = await getUserAddresses();
            if (active) {
              setSavedAddresses(addresses);
              const defaultAddress = addresses.find((addr) => addr.is_default) || addresses[0];
              if (defaultAddress) {
                setSelectedAddressId(defaultAddress.id);
                const fullAddress = [
                  defaultAddress.street_line1,
                  defaultAddress.street_line2,
                  defaultAddress.landmark,
                ]
                  .filter(Boolean)
                  .join(", ");
                setForm((prev) => ({
                  ...prev,
                  customer_name: defaultAddress.full_name || prev.customer_name,
                  phone_number: defaultAddress.phone || prev.phone_number,
                  city: defaultAddress.city || prev.city,
                  state: defaultAddress.state || prev.state,
                  pincode: defaultAddress.pincode || prev.pincode,
                  address: fullAddress || prev.address,
                }));
              }
            }
          } catch {
            // Address book is optional at checkout.
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load checkout preview");
        }
      } finally {
        if (active) {
          setLoadingPreview(false);
        }
      }
    }

    void initialLoad();

    return () => {
      active = false;
    };
  }, [couponFromQuery]);

  function handleSavedAddressChange(addressIdRaw: string) {
    const addressId = Number(addressIdRaw) || 0;
    if (!addressId) {
      setSelectedAddressId(null);
      return;
    }

    const selected = savedAddresses.find((addr) => addr.id === addressId);
    if (!selected) {
      return;
    }

    setSelectedAddressId(selected.id);
    const fullAddress = [selected.street_line1, selected.street_line2, selected.landmark].filter(Boolean).join(", ");
    setForm((prev) => ({
      ...prev,
      customer_name: selected.full_name,
      phone_number: selected.phone,
      city: selected.city,
      state: selected.state,
      pincode: selected.pincode,
      address: fullAddress,
    }));
  }

  async function handleApplyCoupon() {
    setApplyingCoupon(true);
    await loadPreview(form.coupon_code.trim());
    setApplyingCoupon(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await placeOrder({
        customer_name: form.customer_name,
        phone_number: form.phone_number,
        email: form.email,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        address: form.address,
        coupon_code: form.coupon_code.trim() || undefined,
        address_id: selectedAddressId || undefined,
        save_address: isAuthenticated ? saveAddress : undefined,
        set_default_address: isAuthenticated ? setDefaultAddress : undefined,
        address_label: isAuthenticated && saveAddress ? addressLabel : undefined,
        email_opt_in: form.email_opt_in,
      });

      const confirmationUrl = `/order/confirmation?order=${encodeURIComponent(result.order.order_number)}&wa=${encodeURIComponent(result.whatsapp_url)}&email=${encodeURIComponent(form.email)}`;
      router.push(confirmationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0b09] px-6 py-12 text-[#f4eee4]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.28em] text-[#b59a73]">Storefront</p>
          <h1 className="text-brand-display mt-2 text-5xl uppercase tracking-[0.05em]">Checkout</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-[#a94442]/40 bg-[#2b1414]/70 p-4 text-sm text-[#f6c5c5]">{error}</div>
        ) : null}

        {loadingPreview ? (
          <div className="rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/80 p-6 text-sm text-[#d4c4a7]">Loading checkout...</div>
        ) : null}

        {!loadingPreview && preview ? (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/85 p-5">
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#d8c19a]">Delivery Details</h2>

              {isAuthenticated && savedAddresses.length > 0 ? (
                <div className="mt-4">
                  <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#b59a73]" htmlFor="saved_address_id">
                    Use saved address
                  </label>
                  <select
                    id="saved_address_id"
                    value={selectedAddressId || ""}
                    onChange={(event) => handleSavedAddressChange(event.target.value)}
                    className="w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                  >
                    <option value="">Enter address manually</option>
                    {savedAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} - {addr.city}, {addr.state} {addr.is_default ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  placeholder="Full name"
                  value={form.customer_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                  className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                />
                <input
                  placeholder="Phone number"
                  value={form.phone_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                  className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                />
                <input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                />
                <select
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                  className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                >
                  <option value="">Select state</option>
                  {INDIA_STATES.map((stateValue) => (
                    <option key={stateValue} value={stateValue}>
                      {stateValue}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))}
                  className="rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                />
              </div>

              <textarea
                placeholder="Full delivery address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                rows={4}
                className="mt-3 w-full rounded-lg border border-[#8b6f47]/45 bg-[#1a1510] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
              />

              <label className="mt-3 flex items-center gap-2 text-sm text-[#d7c7ad]">
                <input
                  type="checkbox"
                  checked={form.email_opt_in}
                  onChange={(e) => setForm((prev) => ({ ...prev, email_opt_in: e.target.checked }))}
                />
                Email me product updates and offers
              </label>

              {isAuthenticated ? (
                <div className="mt-4 rounded-lg border border-[#8b6f47]/35 bg-[#1a1510] p-4">
                  <label className="flex items-center gap-2 text-sm text-[#d7c7ad]">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    Save this address to my address book
                  </label>

                  {saveAddress ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <select
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        className="rounded-lg border border-[#8b6f47]/45 bg-[#130f0b] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-[#d7c7ad]">
                        <input
                          type="checkbox"
                          checked={setDefaultAddress}
                          onChange={(e) => setSetDefaultAddress(e.target.checked)}
                        />
                        Set as default address
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-full bg-[#c89e65] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60"
              >
                {submitting ? "Placing Order..." : "Place Order On WhatsApp"}
              </button>
            </form>

            <aside className="h-fit rounded-2xl border border-[#8b6f47]/30 bg-[#15120f]/90 p-5">
              <h2 className="text-sm uppercase tracking-[0.2em] text-[#d8c19a]">Order Summary</h2>

              <div className="mt-4 space-y-3">
                {preview.cart.items.map((item) => (
                  <div key={`${item.product_id}-${item.variant_id ?? "default"}`} className="text-sm text-[#d3c1a5]">
                    <p className="font-medium text-[#eddcc0]">{item.product.name}</p>
                    <p>
                      Qty {item.quantity} x {item.unit_price_display}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-[#8b6f47]/30 bg-[#1a1510] p-3">
                <div className="flex gap-2">
                  <input
                    placeholder="Coupon code"
                    value={form.coupon_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                    className="flex-1 rounded-lg border border-[#8b6f47]/45 bg-[#130f0b] px-3 py-2 text-sm outline-none focus:border-[#b59a73]"
                  />
                  <button
                    type="button"
                    disabled={applyingCoupon}
                    onClick={handleApplyCoupon}
                    className="rounded-lg border border-[#8b6f47]/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#d8c19a] hover:bg-[#8b6f47] hover:text-[#1d150e] disabled:opacity-60"
                  >
                    {applyingCoupon ? "Applying..." : "Apply"}
                  </button>
                </div>
                {preview.coupon ? (
                  <p className="mt-2 text-xs text-[#cde5bf]">
                    Applied: {preview.coupon.code} ({preview.coupon.discount_display})
                  </p>
                ) : null}
              </div>

              <div className="mt-4 space-y-2 text-sm text-[#d3c1a5]">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{preview.cart.total_display}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span>- {preview.discount_display}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-[#f0dfc3]">
                  <span>Payable</span>
                  <span>{preview.payable_total_display}</span>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
