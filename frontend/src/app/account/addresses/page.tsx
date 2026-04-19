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

  // Load addresses on mount
  useEffect(() => {
    const active = true;

    const loadAddresses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserAddresses();
        if (active) {
          setAddresses(data);
        }
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
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAddresses();

    return () => {
      // cleanup
    };
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      // Validate
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
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-amber-600"></div>
          <p className="mt-4 text-sm text-gray-600">Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/account/profile" className="text-sm font-medium text-amber-600 hover:text-amber-700">
            ← Back to Account
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Saved Addresses</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your delivery addresses for quick checkout</p>
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

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Label */}
                <div className="sm:col-span-2">
                  <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                    Label *
                  </label>
                  <select
                    id="label"
                    name="label"
                    value={formData.label}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option>Home</option>
                    <option>Office</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                    required
                    minLength={2}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Phone */}
                <div className="sm:col-span-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    required
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Street Line 1 */}
                <div className="sm:col-span-2">
                  <label htmlFor="street_line1" className="block text-sm font-medium text-gray-700">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="street_line1"
                    name="street_line1"
                    value={formData.street_line1}
                    onChange={handleInputChange}
                    placeholder="House no., Building name"
                    required
                    minLength={5}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Street Line 2 */}
                <div className="sm:col-span-2">
                  <label htmlFor="street_line2" className="block text-sm font-medium text-gray-700">
                    Street Address (Cont.)
                  </label>
                  <input
                    type="text"
                    id="street_line2"
                    name="street_line2"
                    value={formData.street_line2}
                    onChange={handleInputChange}
                    placeholder="Road name, Area, Colony"
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Landmark */}
                <div className="sm:col-span-2">
                  <label htmlFor="landmark" className="block text-sm font-medium text-gray-700">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder="Near temple, Market, etc."
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    required
                    minLength={2}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    required
                    minLength={2}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label htmlFor="pincode" className="block text-sm font-medium text-gray-700">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    id="pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="6-digit pincode"
                    required
                    pattern="\d{6}"
                    maxLength={6}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Address' : 'Add Address'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <div className="rounded-lg bg-gray-100 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No saved addresses</h3>
            <p className="mt-2 text-sm text-gray-600">Add your first address to speed up checkout</p>
            {!showForm && (
              <button
                onClick={handleAddNew}
                className="mt-4 inline-block bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Add Address
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              {addresses.map((address) => (
                <div key={address.id} className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{address.label}</h3>
                        {address.is_default && (
                          <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-700">{address.full_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(address)}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        disabled={deleting === address.id}
                        className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">{address.phone}</p>
                  <p className="mt-2 text-sm text-gray-700">{address.street_line1}</p>
                  {address.street_line2 && <p className="text-sm text-gray-700">{address.street_line2}</p>}
                  {address.landmark && <p className="text-sm text-gray-700">{address.landmark}</p>}
                  <p className="mt-2 text-sm text-gray-700">
                    {address.city}, {address.state} {address.pincode}
                  </p>

                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="mt-4 text-xs font-medium text-amber-600 hover:text-amber-700"
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
                className="inline-block rounded-lg border border-amber-600 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50"
              >
                + Add Another Address
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
