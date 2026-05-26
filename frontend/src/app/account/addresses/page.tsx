'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
} from '@/lib/api';
import type { UserAddress } from '@/lib/api';
import AccountNavTabs from '@/components/account/AccountNavTabs';

type AddressFormData = {
  label: string;
  full_name: string;
  phone: string;
  street_line1: string;
  street_line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
};


const inputClasses =
  'w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3.5 text-[13px] text-[#302115] outline-none transition-all placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]';

const selectClasses =
  'w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3.5 text-[13px] text-[#302115] outline-none transition-all focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]';

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    label: 'Home',
    full_name: '',
    phone: '',
    street_line1: '',
    street_line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    const active = true;

    const loadAddresses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserAddresses();
        if (active) setAddresses(data);
      } catch (err) {
        if (active) {
          if (err instanceof Error) {
            const message = err.message.toLowerCase();
            if (message.includes('401') || message.includes('unauthorized') || message.includes('authentication required')) {
              router.push('/auth/login?next=/account/addresses');
            } else {
              setError(err.message || 'Failed to load addresses');
            }
          } else {
            setError('Failed to load addresses');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAddresses();
    return () => {};
  }, [router]);

  const resetForm = () => {
    setFormData({
      label: 'Home',
      full_name: '',
      phone: '',
      street_line1: '',
      street_line2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
    });
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (address: UserAddress) => {
    setFormData({
      label: address.label,
      full_name: address.full_name,
      phone: address.phone,
      street_line1: address.street_line1,
      street_line2: address.street_line2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });
    setEditingId(address.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.full_name || formData.full_name.length < 2) {
        setError('Full name must be at least 2 characters');
        setSaving(false);
        return;
      }
      if (!formData.phone || formData.phone.length < 6 || !/^\d+$/.test(formData.phone.replace(/\s/g, ''))) {
        setError('Invalid phone number');
        setSaving(false);
        return;
      }
      if (!formData.street_line1 || formData.street_line1.length < 5) {
        setError('Street address must be at least 5 characters');
        setSaving(false);
        return;
      }
      if (!formData.city || formData.city.length < 2) {
        setError('City must be at least 2 characters');
        setSaving(false);
        return;
      }
      if (!formData.state || formData.state.length < 2) {
        setError('State must be at least 2 characters');
        setSaving(false);
        return;
      }
      if (!formData.pincode || formData.pincode.length !== 6 || !/^\d{6}$/.test(formData.pincode)) {
        setError('Pincode must be exactly 6 digits');
        setSaving(false);
        return;
      }

      let result: UserAddress;
      if (editingId) {
        result = await updateUserAddress(editingId, formData);
        setAddresses((prev) => prev.map((addr) => (addr.id === editingId ? result : addr)));
        setSuccess('Address updated successfully');
      } else {
        result = await createUserAddress(formData);
        setAddresses((prev) => [...prev, result]);
        setSuccess('Address created successfully');
      }

      setShowForm(false);
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to save address');
      } else {
        setError('Failed to save address');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    setDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      await deleteUserAddress(id);
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
      setSuccess('Address deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to delete address');
      } else {
        setError('Failed to delete address');
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: number) => {
    setError(null);
    setSuccess(null);

    try {
      await setDefaultAddress(id);
      setAddresses((prev) => prev.map((addr) => ({ ...addr, is_default: addr.id === id })));
      setSuccess('Default address updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to set default address');
      } else {
        setError('Failed to set default address');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-[#a67126]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[13px] text-[#6c5641]">Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      {/* Header */}
      <div className="border-b border-[#d9c8ad]/40">
        <div className="mx-auto max-w-[900px] px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">My Account</p>
          <h1 className="mt-2 font-display text-[clamp(28px,5vw,40px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            Saved Addresses
          </h1>
          <p className="mt-2 text-[13px] text-[#6c5641]">Manage your delivery addresses for quick checkout</p>

          <AccountNavTabs activeTab="addresses" />
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-5 py-6 sm:px-8 sm:py-8">
        {/* Messages */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#a94442]/25 bg-[#a94442]/8 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-[#a94442]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[12px] text-[#a94442]">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#4a7c3f]/25 bg-[#4a7c3f]/8 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-[#4a7c3f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-[12px] text-[#302115]">{success}</p>
          </div>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Label */}
                <div>
                  <label htmlFor="label" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">Label</label>
                  <select id="label" name="label" value={formData.label} onChange={handleInputChange} className={selectClasses}>
                    <option>Home</option>
                    <option>Office</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">Full Name</label>
                  <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleInputChange} required minLength={2} placeholder="Your full name" className={inputClasses} />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">Phone</label>
                  <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="10-digit number" className={inputClasses} />
                </div>

                {/* Street Line 1 */}
                <div className="sm:col-span-2">
                  <label htmlFor="street_line1" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">Street Address</label>
                  <input type="text" id="street_line1" name="street_line1" value={formData.street_line1} onChange={handleInputChange} required minLength={5} placeholder="House no., Building name" className={inputClasses} />
                </div>

                {/* Street Line 2 */}
                <div className="sm:col-span-2">
                  <label htmlFor="street_line2" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
                    Street Address (cont.) <span className="font-normal normal-case tracking-normal text-[#b5a08a]">(optional)</span>
                  </label>
                  <input type="text" id="street_line2" name="street_line2" value={formData.street_line2} onChange={handleInputChange} placeholder="Road name, Area, Colony" className={inputClasses} />
                </div>

                {/* Landmark */}
                <div className="sm:col-span-2">
                  <label htmlFor="landmark" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
                    Landmark <span className="font-normal normal-case tracking-normal text-[#b5a08a]">(optional)</span>
                  </label>
                  <input type="text" id="landmark" name="landmark" value={formData.landmark} onChange={handleInputChange} placeholder="Near temple, Market, etc." className={inputClasses} />
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">City</label>
                  <input type="text" id="city" name="city" value={formData.city} onChange={handleInputChange} required minLength={2} placeholder="City" className={inputClasses} />
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">State</label>
                  <input type="text" id="state" name="state" value={formData.state} onChange={handleInputChange} required minLength={2} placeholder="State" className={inputClasses} />
                </div>

                {/* Pincode */}
                <div>
                  <label htmlFor="pincode" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">Pincode</label>
                  <input type="text" id="pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} required pattern="\d{6}" maxLength={6} placeholder="6-digit pincode" className={inputClasses} />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="group relative flex-1 overflow-hidden rounded-full bg-[#a67126] px-6 py-[14px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:shadow-[0_4px_20px_rgba(166,113,38,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{saving ? 'Saving...' : editingId ? 'Update Address' : 'Add Address'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 rounded-full border border-[#d9c8ad] px-6 py-[14px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c5641] transition-all hover:border-[#a67126]/40 hover:text-[#302115]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Empty state */}
        {addresses.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d9c8ad] bg-[#fffefb] py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f5e7d2]">
              <svg className="h-9 w-9 text-[#a67126]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="mt-5 font-display text-[24px] uppercase tracking-[0.04em] text-[#302115]">No Saved Addresses</p>
            <p className="mt-2 text-[13px] text-[#6c5641]">Add your first address to speed up checkout</p>
            <button
              onClick={handleAddNew}
              className="group relative mt-6 inline-flex overflow-hidden rounded-full bg-[#1e1710] px-7 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:bg-[#2b1e14]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Add Address</span>
            </button>
          </div>
        )}

        {/* Address cards */}
        {addresses.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`rounded-2xl border bg-[#fffefb] p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(146,104,56,0.08)] ${
                    address.is_default ? 'border-[#a67126]/40' : 'border-[#d9c8ad]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#302115]">
                        <svg className="h-4 w-4 text-[#a67126]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={
                            address.label === 'Home'
                              ? 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                              : address.label === 'Office'
                                ? 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                                : 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                          } />
                        </svg>
                        {address.label}
                      </span>
                      {address.is_default && (
                        <span className="rounded-full border border-[#4a7c3f]/30 bg-[#4a7c3f]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4a7c3f]">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleEdit(address)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d9c8ad] text-[#6c5641] transition-all hover:border-[#a67126] hover:text-[#a67126]"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        disabled={deleting === address.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d9c8ad] text-[#a94442]/60 transition-all hover:border-[#a94442] hover:text-[#a94442] disabled:opacity-50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[13px] font-medium text-[#302115]">{address.full_name}</p>
                    <p className="mt-0.5 text-[12px] text-[#9a7147]">{address.phone}</p>
                  </div>

                  <div className="mt-2 space-y-0.5 text-[12px] leading-[1.6] text-[#6c5641]">
                    <p>{address.street_line1}</p>
                    {address.street_line2 && <p>{address.street_line2}</p>}
                    {address.landmark && <p>{address.landmark}</p>}
                    <p>{address.city}, {address.state} {address.pincode}</p>
                  </div>

                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a67126] transition-colors hover:text-[#8b5d1e]"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!showForm && (
              <button
                onClick={handleAddNew}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#a67126] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a67126] transition-all hover:bg-[#a67126]/5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Another Address
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
