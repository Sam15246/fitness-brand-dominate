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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">{children}</h2>
  );
}

function FieldLabel({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
      {children}
      {optional && <span className="ml-1 font-normal normal-case tracking-normal text-[#b5a08a]">(optional)</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3.5 text-[13px] text-[#302115] outline-none transition-all placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]";

const selectClasses =
  "w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3.5 text-[13px] text-[#302115] outline-none transition-all focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]";

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

        if (!active) return;

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
        if (active) setLoadingPreview(false);
      }
    }

    void initialLoad();
    return () => { active = false; };
  }, [couponFromQuery]);

  function handleSavedAddressChange(addressIdRaw: string) {
    const addressId = Number(addressIdRaw) || 0;
    if (!addressId) {
      setSelectedAddressId(null);
      return;
    }

    const selected = savedAddresses.find((addr) => addr.id === addressId);
    if (!selected) return;

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
        items: preview!.cart.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        total: preview!.cart.total,
        discount: preview!.discount,
        coupon_code: form.coupon_code.trim() || undefined,
      });

      window.open(waUrl, "_blank");
      router.push(`/order/confirmation?wa=${encodeURIComponent(waUrl)}&email=${encodeURIComponent(form.email)}&fallback=true`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* Header */}
      <div className="border-b border-[#d9c8ad]/40">
        <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-[#9a7147]">
            <Link href="/cart" className="transition-colors hover:text-[#6c5641]">Cart</Link>
            <svg className="h-3 w-3 text-[#d9c8ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#302115]">Checkout</span>
          </div>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">Secure Checkout</p>
          <h1 className="mt-2 font-display text-[clamp(28px,5vw,44px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            Checkout
          </h1>

          {/* Trust badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {["Secure checkout", "Dispatch in 24-48h", "Easy returns"].map((badge) => (
              <span key={badge} className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c8ad]/60 bg-[#fffefb] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9a7147]">
                <svg className="h-3 w-3 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 py-6 pb-28 sm:px-8 sm:py-8 sm:pb-8 lg:px-10">
        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[12px] text-[#a94442]">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loadingPreview && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#d9c8ad] bg-[#fffefb] px-6 py-8">
            <svg className="h-5 w-5 animate-spin text-[#a67126]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-[13px] text-[#6c5641]">Loading checkout...</p>
          </div>
        )}

        {!loadingPreview && preview && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
            {/* Delivery form */}
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Saved addresses */}
              {isAuthenticated && savedAddresses.length > 0 && (
                <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                  <SectionLabel>Saved Addresses</SectionLabel>
                  <div className="mt-4">
                    <select
                      id="saved_address_id"
                      value={selectedAddressId || ""}
                      onChange={(event) => handleSavedAddressChange(event.target.value)}
                      className={selectClasses}
                    >
                      <option value="">Enter address manually</option>
                      {savedAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.label} — {addr.city}, {addr.state} {addr.is_default ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <SectionLabel>Contact Information</SectionLabel>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="customer_name">Full Name</FieldLabel>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <input
                        id="customer_name"
                        placeholder="Your full name"
                        autoComplete="name"
                        required
                        value={form.customer_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                        className={`${inputClasses} pl-11`}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="phone_number">Phone Number</FieldLabel>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        id="phone_number"
                        placeholder="10-digit phone number"
                        autoComplete="tel"
                        inputMode="numeric"
                        minLength={10}
                        maxLength={15}
                        required
                        value={form.phone_number}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, phone_number: e.target.value.replace(/\D/g, "").slice(0, 15) }))
                        }
                        className={`${inputClasses} pl-11 ${submitAttempted && phoneError ? "border-[#a94442] focus:border-[#a94442]" : ""}`}
                      />
                    </div>
                    {submitAttempted && phoneError && <p className="mt-1.5 text-[11px] text-[#a94442]">{phoneError}</p>}
                  </div>
                  <div>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        id="email"
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className={`${inputClasses} pl-11 ${submitAttempted && emailError ? "border-[#a94442] focus:border-[#a94442]" : ""}`}
                      />
                    </div>
                    {submitAttempted && emailError && <p className="mt-1.5 text-[11px] text-[#a94442]">{emailError}</p>}
                  </div>
                </div>
              </div>

              {/* Delivery address */}
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <SectionLabel>Delivery Address</SectionLabel>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <input
                      id="city"
                      placeholder="City"
                      autoComplete="address-level2"
                      required
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="state">State</FieldLabel>
                    <select
                      id="state"
                      required
                      value={form.state}
                      onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                      className={selectClasses}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATES.map((stateValue) => (
                        <option key={stateValue} value={stateValue}>
                          {stateValue}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="pincode">Pincode</FieldLabel>
                    <input
                      id="pincode"
                      placeholder="6-digit pincode"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      minLength={5}
                      maxLength={10}
                      required
                      value={form.pincode}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                      }
                      className={`${inputClasses} ${submitAttempted && pincodeError ? "border-[#a94442] focus:border-[#a94442]" : ""}`}
                    />
                    {submitAttempted && pincodeError && <p className="mt-1.5 text-[11px] text-[#a94442]">{pincodeError}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="address">Full Address</FieldLabel>
                    <textarea
                      id="address"
                      placeholder="House/flat number, street, area, landmark..."
                      autoComplete="street-address"
                      required
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      className={`${inputClasses} leading-[1.7]`}
                    />
                  </div>
                </div>

                {/* Email opt-in */}
                <label className="mt-4 flex items-center gap-2.5 text-[12px] text-[#6c5641]">
                  <input
                    type="checkbox"
                    checked={form.email_opt_in}
                    onChange={(e) => setForm((prev) => ({ ...prev, email_opt_in: e.target.checked }))}
                    className="h-4 w-4 rounded border-[#d9c8ad] bg-[#fffefb] text-[#a67126] focus:ring-[#a67126]/20"
                  />
                  Email me product updates and offers
                </label>
              </div>

              {/* Save address (authenticated) */}
              {isAuthenticated && (
                <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                  <SectionLabel>Address Book</SectionLabel>
                  <label className="mt-4 flex items-center gap-2.5 text-[12px] text-[#6c5641]">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="h-4 w-4 rounded border-[#d9c8ad] bg-[#fffefb] text-[#a67126] focus:ring-[#a67126]/20"
                    />
                    Save this address to my address book
                  </label>

                  {saveAddress && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="address_label">Label</FieldLabel>
                        <select
                          id="address_label"
                          value={addressLabel}
                          onChange={(e) => setAddressLabel(e.target.value)}
                          className={selectClasses}
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2.5 pb-3.5 text-[12px] text-[#6c5641]">
                          <input
                            type="checkbox"
                            checked={setDefaultAddress}
                            onChange={(e) => setSetDefaultAddress(e.target.checked)}
                            className="h-4 w-4 rounded border-[#d9c8ad] bg-[#fffefb] text-[#a67126] focus:ring-[#a67126]/20"
                          />
                          Set as default address
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop submit */}
              <div className="hidden lg:block">
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative w-full overflow-hidden rounded-full bg-[#1e1710] px-6 py-[16px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14] hover:shadow-[0_4px_20px_rgba(30,23,16,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Place Order on WhatsApp
                      </>
                    )}
                  </span>
                </button>
                <p className="mt-3 text-center text-[11px] text-[#b5a08a]">
                  By placing an order, you agree to our{" "}
                  <Link href="/shipping" className="text-[#a67126] hover:underline">shipping</Link>,{" "}
                  <Link href="/returns" className="text-[#a67126] hover:underline">returns</Link>, and{" "}
                  <Link href="/terms" className="text-[#a67126] hover:underline">terms</Link> policies.
                </p>
              </div>
            </form>

            {/* Order summary sidebar */}
            <aside className="h-fit space-y-4 lg:sticky lg:top-6">
              {/* Items */}
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <SectionLabel>Order Summary</SectionLabel>
                <div className="mt-4 space-y-3">
                  {preview.cart.items.map((item) => (
                    <div
                      key={`${item.product_id}-${item.variant_id ?? "default"}`}
                      className="flex items-center justify-between gap-3 border-b border-[#d9c8ad]/30 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#302115]">
                          {item.product.name}
                          {item.variant_label && (
                            <span className="ml-1.5 inline-block rounded border border-[#d9c8ad] bg-[#fff8ec] px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.06em] text-[#9a7147]">
                              {item.variant_label}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#9a7147]">
                          Qty {item.quantity} x {item.unit_price_display}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-semibold text-[#302115]">{item.subtotal_display}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon */}
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <SectionLabel>Coupon Code</SectionLabel>
                <div className="mt-4 flex gap-2">
                  <input
                    placeholder="Enter code"
                    value={form.coupon_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                    className={`${inputClasses} flex-1`}
                  />
                  <button
                    type="button"
                    disabled={applyingCoupon}
                    onClick={handleApplyCoupon}
                    className="shrink-0 rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a67126] transition-all hover:border-[#a67126] hover:bg-[#a67126]/5 disabled:opacity-60"
                  >
                    {applyingCoupon ? "..." : "Apply"}
                  </button>
                </div>
                {preview.coupon && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#4a7c3f]/25 bg-[#4a7c3f]/8 px-3 py-2">
                    <svg className="h-4 w-4 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-[11px] text-[#302115]">
                      <span className="font-semibold">{preview.coupon.code}</span> applied ({preview.coupon.discount_display})
                    </p>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[13px] text-[#6c5641]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#302115]">{preview.cart.total_display}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-[#6c5641]">
                    <span>Discount</span>
                    <span className="font-medium text-[#4a7c3f]">- {preview.discount_display}</span>
                  </div>
                  <div className="border-t border-[#d9c8ad]/50 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#302115]">Payable</span>
                      <span className="font-display text-[28px] tracking-[0.02em] text-[#302115]">
                        {preview.payable_total_display}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
                <SectionLabel>Why Order With Confidence</SectionLabel>
                <div className="mt-4 space-y-2.5">
                  {[
                    "Order confirmation and updates sent promptly",
                    "Support available for delivery and return queries",
                    "No hidden fees beyond the payable amount shown",
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-2.5">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-[12px] leading-[1.5] text-[#6c5641]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Mobile sticky CTA */}
        {!loadingPreview && preview && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d9c8ad]/60 bg-[#fffefb]/95 px-5 py-3.5 backdrop-blur-md lg:hidden" style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}>
            <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9a7147]">Payable</p>
                <p className="font-display text-[22px] tracking-[0.02em] text-[#302115]">
                  {preview.payable_total_display}
                </p>
              </div>
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="group relative overflow-hidden rounded-full bg-[#1e1710] px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14] disabled:opacity-60"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative flex items-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Placing...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
