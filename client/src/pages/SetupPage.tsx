import React, { useState } from 'react';
import { Building, ShieldCheck, CreditCard, ArrowRight, Percent, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { BusinessSetupInput } from '../../../shared/types';

interface SetupPageProps {
  onNavigate: (path: string) => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({ onNavigate }) => {
  const { setupBusiness, user } = useAuth();

  const [name, setName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [defaultLateFeePercent, setDefaultLateFeePercent] = useState<number>(2);
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState<number>(3);
  const [notificationChannel, setNotificationChannel] = useState<'whatsapp' | 'email' | 'both'>('both');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !upiId.trim() || !bankDetails.trim()) {
      setError('Please fill in Business Name, UPI ID, and Bank Details.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const data: BusinessSetupInput = {
        name: name.trim(),
        gstNumber: gstNumber.trim() || undefined,
        upiId: upiId.trim(),
        bankDetails: bankDetails.trim(),
        defaultLateFeePercent: Number(defaultLateFeePercent) || 2,
        lateFeeGraceDays: Number(lateFeeGraceDays) || 3,
        notificationChannel,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        address: address.trim() || undefined,
      };

      await setupBusiness(data);
      onNavigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save business profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/30 items-center justify-center mb-1">
            <Building className="w-6 h-6 text-brand-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Setup Your Business Profile</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            PayFlow attaches these payment coordinates and automated penalty rules to every generated invoice.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
          {error && (
            <div className="p-3 mb-6 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Business Identity */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                1. Business Identity
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Business / Professional Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Electricals & Wiring or Mehra Consulting"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Primary Phone (WhatsApp for Invoices)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
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
                    placeholder="e.g. 42, 100ft Road, Indiranagar, Bengaluru 560038"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Payment Coordinates */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                2. Payment Details (Appears on PDF & Messages)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    UPI ID (Virtual Payment Address) *
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourbusiness@okhdfcbank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Clients will see this UPI ID for instant scan/pay on their phone.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bank Account Details (NEFT/RTGS/IMPS) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="Bank: HDFC Bank&#10;Account No: 50200012345678&#10;IFSC: HDFC0001234&#10;Branch: Indiranagar, Bengaluru"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Automated Late-Fee Engine Rule */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                3. Automated Late-Fee & Follow-up Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Default Late Fee (%)</span>
                    <span className="text-brand-400 font-bold">{defaultLateFeePercent}%</span>
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={defaultLateFeePercent}
                      onChange={(e) => setDefaultLateFeePercent(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Calculated strictly on the remaining balance (never on paid portion).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Grace Period (Days)</span>
                    <span className="text-brand-400 font-bold">{lateFeeGraceDays} days</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={lateFeeGraceDays}
                      onChange={(e) => setLateFeeGraceDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Number of days after due date before the late fee attaches.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 group"
            >
              <span>{isLoading ? 'Saving Profile...' : 'Complete Setup & Go to Dashboard'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
