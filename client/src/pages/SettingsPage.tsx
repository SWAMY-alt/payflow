import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  CreditCard,
  ShieldCheck,
  Bell,
  Check,
  AlertCircle,
  Percent,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { BusinessSetupInput } from '../../../shared/types';

export const SettingsPage: React.FC = () => {
  const { business, updateBusiness } = useAuth();

  const [name, setName] = useState(business?.name || '');
  const [gstNumber, setGstNumber] = useState(business?.gstNumber || '');
  const [upiId, setUpiId] = useState(business?.upiId || '');
  const [bankDetails, setBankDetails] = useState(business?.bankDetails || '');
  const [defaultLateFeePercent, setDefaultLateFeePercent] = useState<number>(
    business?.defaultLateFeePercent ?? 2
  );
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState<number>(
    business?.lateFeeGraceDays ?? 3
  );
  const [notificationChannel, setNotificationChannel] = useState<'whatsapp' | 'email' | 'both'>(
    business?.notificationChannel || 'both'
  );
  const [contactPhone, setContactPhone] = useState(business?.contactPhone || '');
  const [contactEmail, setContactEmail] = useState(business?.contactEmail || '');
  const [address, setAddress] = useState(business?.address || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (business) {
      setName(business.name);
      setGstNumber(business.gstNumber || '');
      setUpiId(business.upiId);
      setBankDetails(business.bankDetails);
      setDefaultLateFeePercent(business.defaultLateFeePercent);
      setLateFeeGraceDays(business.lateFeeGraceDays);
      setNotificationChannel(business.notificationChannel);
      setContactPhone(business.contactPhone || '');
      setContactEmail(business.contactEmail || '');
      setAddress(business.address || '');
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !upiId.trim() || !bankDetails.trim()) {
      setErrorMsg('Business Name, UPI ID, and Bank Details are required.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      const data: BusinessSetupInput = {
        name: name.trim(),
        gstNumber: gstNumber.trim() || undefined,
        upiId: upiId.trim(),
        bankDetails: bankDetails.trim(),
        defaultLateFeePercent: Number(defaultLateFeePercent) || 0,
        lateFeeGraceDays: Number(lateFeeGraceDays) || 0,
        notificationChannel,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        address: address.trim() || undefined,
      };

      await updateBusiness(data);
      setSuccessMsg('Business settings and late-fee policies saved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-400" />
          Business Profile & Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure payment coordinates, late-fee penalty calculations, and communication channels
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Profile Identity */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
            <Building className="w-4 h-4" />
            1. Business Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Business Trade / Legal Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GST Number
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="29ABCDE1234F1Z5"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Office / Workshop Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Payment Coordinates */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            2. Payment Coordinates (UPI & Bank Details)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                UPI ID (VPA) *
              </label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Bank Transfer Details *
              </label>
              <textarea
                required
                rows={3}
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Late Fee Rules */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            3. Automated Late-Fee Engine Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Default Late Fee (%)</span>
                <span className="text-brand-400 font-bold">{defaultLateFeePercent}%</span>
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={defaultLateFeePercent}
                  onChange={(e) => setDefaultLateFeePercent(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Calculated strictly on remaining balance (total - paid).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Grace Period (Days)</span>
                <span className="text-brand-400 font-bold">{lateFeeGraceDays} days</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={lateFeeGraceDays}
                  onChange={(e) => setLateFeeGraceDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Days after due date before the late-fee penalty line attaches.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Notification Channel */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            4. Preferred Communication Channel
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'whatsapp', label: 'WhatsApp Only' },
              { id: 'email', label: 'Email Only' },
              { id: 'both', label: 'WhatsApp + Email' },
            ].map((ch) => (
              <button
                type="button"
                key={ch.id}
                onClick={() => setNotificationChannel(ch.id as any)}
                className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                  notificationChannel === ch.id
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/25 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
