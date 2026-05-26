'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserProfile, updateUserProfile } from '@/lib/api';
import type { UserProfile } from '@/lib/api';
import AccountNavTabs from '@/components/account/AccountNavTabs';

const inputClasses =
  'w-full rounded-xl border border-[#d9c8ad] bg-[#fffefb] px-4 py-3.5 text-[13px] text-[#302115] outline-none transition-all placeholder:text-[#b5a08a] focus:border-[#a67126] focus:shadow-[0_0_0_3px_rgba(166,113,38,0.08)]';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    full_name: '',
    email_marketing_opt_in: false,
  });

  useEffect(() => {
    const active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserProfile();
        if (active) {
          setProfile(data);
          setFormData({
            name: data.name || '',
            phone: data.phone || '',
            full_name: data.full_name || '',
            email_marketing_opt_in: data.email_marketing_opt_in || false,
          });
        }
      } catch (err) {
        if (active) {
          if (err instanceof Error) {
            const message = err.message.toLowerCase();
            if (message.includes('401') || message.includes('unauthorized') || message.includes('authentication required')) {
              router.push('/auth/login?next=/account/profile');
            } else {
              setError(err.message || 'Failed to load profile');
            }
          } else {
            setError('Failed to load profile');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();
    return () => {};
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.name || formData.name.length < 2) {
        setError('Name must be at least 2 characters');
        setSaving(false);
        return;
      }

      if (formData.phone && formData.phone.length < 6) {
        setError('Phone must be at least 6 digits');
        setSaving(false);
        return;
      }

      const updated = await updateUserProfile({
        name: formData.name,
        phone: formData.phone || undefined,
        full_name: formData.full_name || undefined,
        email_marketing_opt_in: formData.email_marketing_opt_in,
      });

      setProfile(updated);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to update profile');
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setSaving(false);
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
          <p className="text-[13px] text-[#6c5641]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8ec]">
      <div className="border-b border-[#d9c8ad]/40">
        <div className="mx-auto max-w-[900px] px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67126]">My Account</p>
          <h1 className="mt-2 font-display text-[clamp(28px,5vw,40px)] uppercase leading-none tracking-[0.04em] text-[#302115]">
            Profile Settings
          </h1>
          <p className="mt-2 text-[13px] text-[#6c5641]">Manage your personal information and preferences</p>

          {/* Navigation tabs */}
          <AccountNavTabs activeTab="profile" />
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

        {/* Profile card */}
        <div className="rounded-2xl border border-[#d9c8ad] bg-[#fffefb] p-5 sm:p-6">
          {/* Avatar + email header */}
          <div className="flex items-center gap-4 border-b border-[#d9c8ad]/50 pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a67126]/10 text-[18px] font-bold text-[#a67126]">
              {(profile?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#302115]">{profile?.name || 'User'}</p>
              <p className="mt-0.5 text-[12px] text-[#9a7147]">{profile?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label htmlFor="name" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
                  Full Name
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    minLength={2}
                    placeholder="Your name"
                    className={`${inputClasses} pl-11`}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-[#b5a08a]">Used for order confirmations and shipping</p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
                  Phone Number
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#b5a08a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    className={`${inputClasses} pl-11`}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-[#b5a08a]">For order updates and customer support</p>
              </div>

              {/* Display Name */}
              <div className="sm:col-span-2">
                <label htmlFor="full_name" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a7147]">
                  Display Name <span className="font-normal normal-case tracking-normal text-[#b5a08a]">(optional)</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="How you want to be addressed"
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Communication preferences */}
            <div className="border-t border-[#d9c8ad]/50 pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a67126]">Communication Preferences</p>
              <label className="mt-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="email_marketing_opt_in"
                  name="email_marketing_opt_in"
                  checked={formData.email_marketing_opt_in}
                  onChange={handleInputChange}
                  className="mt-0.5 h-4 w-4 rounded border-[#d9c8ad] bg-[#fffefb] text-[#a67126] focus:ring-[#a67126]/20"
                />
                <div>
                  <span className="text-[13px] font-medium text-[#302115]">Receive promotions and product updates</span>
                  <p className="mt-0.5 text-[11px] text-[#6c5641]">
                    Get notified about exclusive offers, new products, and fitness tips
                  </p>
                </div>
              </label>
            </div>

            {/* Submit buttons */}
            <div className="flex flex-col gap-3 border-t border-[#d9c8ad]/50 pt-5 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="group relative flex-1 overflow-hidden rounded-full bg-[#a67126] px-6 py-[14px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#f4eee4] transition-all hover:shadow-[0_4px_20px_rgba(166,113,38,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (profile) {
                    setFormData({
                      name: profile.name || '',
                      phone: profile.phone || '',
                      full_name: profile.full_name || '',
                      email_marketing_opt_in: profile.email_marketing_opt_in || false,
                    });
                  }
                }}
                className="flex-1 rounded-full border border-[#d9c8ad] px-6 py-[14px] text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c5641] transition-all hover:border-[#a67126]/40 hover:text-[#302115]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Addresses link */}
        <div className="mt-6">
          <Link
            href="/account/addresses"
            className="group inline-flex items-center gap-2 rounded-full border border-[#d9c8ad] bg-[#fffefb] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6c5641] transition-all hover:border-[#a67126] hover:text-[#302115]"
          >
            <svg className="h-4 w-4 text-[#a67126]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Saved Addresses
            <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
