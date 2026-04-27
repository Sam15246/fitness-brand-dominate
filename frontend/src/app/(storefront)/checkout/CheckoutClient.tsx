"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { buildWhatsAppUrl } from "@/lib/whatsapp";
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

export default function CheckoutClient() {
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
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const phoneDigits = form.phone_number.replace(/\D/g, "");
  const pincodeDigits = form.pincode.replace(/\D/g, "");
  const emailValue = form.email.trim();

  const phoneError = phoneDigits.length > 0 && phoneDigits.length < 10 ? "Enter at least 10 digits." : null;
  const pincodeError = pincodeDigits.length > 0 && pincodeDigits.length < 5 ? "Enter at least 5 digits." : null;
  const emailError = emailValue.length > 0 && !/^\S+@\S+\.\S+$/.test(emailValue) ? "Enter a valid email address." : null;
  const hasFieldErrors = Boolean(phoneError || pincodeError || emailError);

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
    setSubmitAttempted(true);
    setError(null);

    if (hasFieldErrors) {
      setError("Please correct highlighted fields before placing your order.");
      return;
    }

    if (!preview || preview.cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);

    try {
      // Try backend-first
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
    } catch {
      // Backend failed — fallback to direct WhatsApp
      const waUrl = buildWhatsAppUrl({
        customer: {
          name: form.customer_name,
          phone: form.phone_number,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        items: preview.cart.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        total: preview.cart.total,
        discount: preview.discount,
        coupon_code: form.coupon_code.trim() || undefined,
      });

      window.open(waUrl, "_blank");
      router.push(`/order/confirmation?wa=${encodeURIComponent(waUrl)}&email=${encodeURIComponent(form.email)}&fallback=true`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6e8_0%,#f7efdf_40%,#efe4cf_100%)] px-4 py-6 pb-24 text-[#302115] sm:px-6 sm:py-8 sm:pb-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.22em] text-[#9a7147]">Storefront</p>
          <h1 className="text-brand-display mt-2 text-4xl uppercase tracking-[0.05em] text-[#3b2513] sm:text-5xl">Checkout</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-xs">
            <span className="rounded-full border border-[#dcc9ab] bg-[#fef5e8] px-3 py-1 text-[#6b4a2e]">Secure checkout</span>
            <span className="rounded-full border border-[#dcc9ab] bg-[#fef5e8] px-3 py-1 text-[#6b4a2e]">Dispatch in 24-48h</span>
            <span className="rounded-full border border-[#dcc9ab] bg-[#fef5e8] px-3 py-1 text-[#6b4a2e]">Easy return support</span>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-[#a94442]/40 bg-[#2b1414]/70 p-4 text-sm text-[#f6c5c5]">{error}</div>
        ) : null}

        {loadingPreview ? (
          <div className="rounded-2xl border border-[#dcc9ab] bg-[#fff8ec] p-6 text-sm text-[#6f5640]">Loading checkout...</div>
        ) : null}

        {!loadingPreview && preview ? (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <form id="checkout-form" onSubmit={handleSubmit} className="rounded-2xl border border-[#dcc9ab] bg-[#fff8ec] p-5">
              <h2 className="text-sm uppercase tracking-[0.16em] text-[#8f673f]">Delivery Details</h2>

              {isAuthenticated && savedAddresses.length > 0 ? (
                <div className="mt-4">
                  <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#b59a73]" htmlFor="saved_address_id">
                    Use saved address
                  </label>
                  <select
                    id="saved_address_id"
                    value={selectedAddressId || ""}
                    onChange={(event) => handleSavedAddressChange(event.target.value)}
                    className="w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
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
                  autoComplete="name"
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                  className="rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                />
                <div>
                  <input
                    placeholder="Phone number"
                    autoComplete="tel"
                    inputMode="numeric"
                    minLength={10}
                    maxLength={15}
                    required
                    value={form.phone_number}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone_number: e.target.value.replace(/\D/g, "").slice(0, 15) }))
                    }
                    className="w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                  />
                  {submitAttempted && phoneError ? <p className="mt-1 text-xs text-[#a94442]">{phoneError}</p> : null}
                </div>
                <div>
                  <input
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                  />
                  {submitAttempted && emailError ? <p className="mt-1 text-xs text-[#a94442]">{emailError}</p> : null}
                </div>
                <input
                  placeholder="City"
                  autoComplete="address-level2"
                  required
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                />
                <select
                  required
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                  className="rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                >
                  <option value="">Select state</option>
                  {INDIA_STATES.map((stateValue) => (
                    <option key={stateValue} value={stateValue}>
                      {stateValue}
                    </option>
                  ))}
                </select>
                <div>
                  <input
                    placeholder="Pincode"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    minLength={5}
                    maxLength={10}
                    required
                    value={form.pincode}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                    }
                    className="w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                  />
                  {submitAttempted && pincodeError ? <p className="mt-1 text-xs text-[#a94442]">{pincodeError}</p> : null}
                </div>
              </div>

              <textarea
                placeholder="Full delivery address"
                autoComplete="street-address"
                required
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                rows={4}
                className="mt-3 w-full rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
              />

              <label className="mt-3 flex items-center gap-2 text-sm text-[#6f5640]">
                <input
                  type="checkbox"
                  checked={form.email_opt_in}
                  onChange={(e) => setForm((prev) => ({ ...prev, email_opt_in: e.target.checked }))}
                />
                Email me product updates and offers
              </label>

              {isAuthenticated ? (
                <div className="mt-4 rounded-lg border border-[#dcc9ab] bg-[#fffefb] p-4">
                  <label className="flex items-center gap-2 text-sm text-[#6f5640]">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    Save this address to my address book
                  </label>

                  {saveAddress ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <select
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        className="rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-[#6f5640]">
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
                className="mt-6 hidden w-full rounded-full bg-[#c89e65] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60 lg:block"
              >
                {submitting ? "Placing Order..." : "Place Order On WhatsApp"}
              </button>

              <p className="mt-3 text-xs text-[#7a6048]">
                By placing an order, you agree to our shipping, returns, and support policy terms.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7e5935]">
                <Link href="/shipping" className="hover:text-[#5f3f24]">
                  Shipping Policy
                </Link>
                <Link href="/returns" className="hover:text-[#5f3f24]">
                  Returns Policy
                </Link>
                <Link href="/terms" className="hover:text-[#5f3f24]">
                  Terms
                </Link>
              </div>
            </form>

            <aside className="h-fit rounded-2xl border border-[#dcc9ab] bg-[#fff8ec] p-5">
              <h2 className="text-sm uppercase tracking-[0.16em] text-[#8f673f]">Order Summary</h2>

              <div className="mt-4 space-y-3">
                {preview.cart.items.map((item) => (
                  <div key={`${item.product_id}-${item.variant_id ?? "default"}`} className="text-sm text-[#6f5640]">
                    <p className="font-medium text-[#4f341f]">{item.product.name}</p>
                    <p>
                      Qty {item.quantity} x {item.unit_price_display}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-[#dcc9ab] bg-[#fffefb] p-3">
                <div className="flex gap-2">
                  <input
                    placeholder="Coupon code"
                    value={form.coupon_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                    className="flex-1 rounded-lg border border-[#c7ac84] bg-[#fffefb] px-3 py-2 text-sm text-[#302115] outline-none focus:border-[#8f673f]"
                  />
                  <button
                    type="button"
                    disabled={applyingCoupon}
                    onClick={handleApplyCoupon}
                    className="rounded-lg border border-[#c7ac84] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7e5935] hover:bg-[#f7e6c8] disabled:opacity-60"
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

              <div className="mt-4 space-y-2 text-sm text-[#6f5640]">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{preview.cart.total_display}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span>- {preview.discount_display}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-[#4f341f]">
                  <span>Payable</span>
                  <span>{preview.payable_total_display}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-3 text-xs text-[#6f5640]">
                <p className="font-semibold uppercase tracking-[0.08em] text-[#8f673f]">Why Order With Confidence</p>
                <p className="mt-1">Order confirmation and updates sent promptly.</p>
                <p className="mt-1">Support available for delivery and return queries.</p>
                <p className="mt-1">No hidden fees beyond the payable amount shown.</p>
              </div>
            </aside>
          </div>
        ) : null}

        {!loadingPreview && preview ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dcc9ab] bg-[#fff8ec]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8f673f]">Payable</p>
                <p className="text-base font-bold text-[#4f341f]">{preview.payable_total_display}</p>
              </div>
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="rounded-full bg-[#c89e65] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684] disabled:opacity-60"
              >
                {submitting ? "Placing..." : "Place Order"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
