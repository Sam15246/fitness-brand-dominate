'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, updateUserProfile } from '@/lib/api';
import type { UserProfile } from '@/lib/api';

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
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      // cleanup
    };
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
      // Validate
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
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-amber-600"></div>
          <p className="mt-4 text-sm text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/account/orders" className="text-sm font-medium text-amber-600 hover:text-amber-700">
            ← Back to My Orders
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your personal information and preferences</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            <p className="font-medium">Success</p>
            <p className="mt-1">{success}</p>
          </div>
        )}

        {/* Main Form */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <p className="mt-1 text-sm text-gray-600">Account email: {profile?.email}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                minLength={2}
                placeholder="Your name"
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="mt-1 text-xs text-gray-500">Used for order confirmations and shipping</p>
            </div>

            {/* Phone */}
            <div className="mb-6">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="10-digit mobile number"
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="mt-1 text-xs text-gray-500">For order updates and customer support</p>
            </div>

            {/* Full Name */}
            <div className="mb-6">
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Display Name (Optional)
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Your display name"
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Email Preferences */}
            <div className="mb-6 border-t border-gray-200 pt-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">Communication Preferences</h3>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email_marketing_opt_in"
                  name="email_marketing_opt_in"
                  checked={formData.email_marketing_opt_in}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                />
                <label htmlFor="email_marketing_opt_in" className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Receive promotions and product updates</span>
                  <p className="text-gray-600 mt-1">
                    Get notified about exclusive offers, new products, and fitness tips
                  </p>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
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
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Addresses Section */}
        <div className="mt-8">
          <Link
            href="/account/addresses"
            className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage Saved Addresses →
          </Link>
        </div>
      </div>
    </div>
  );
}
