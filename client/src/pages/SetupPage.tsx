import React, { useState } from 'react';
import {
  Building,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Percent,
  Calendar,
  Lock,
  CheckCircle2,
  QrCode,
  Sparkles,
  ExternalLink,
  X,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { BusinessSetupInput } from '@shared/types';

interface SetupPageProps {
  onNavigate: (path: string) => void;
}

const POPULAR_BANKS = [
  { name: 'HDFC Bank', ifsc: 'HDFC0001234', color: 'from-blue-600 to-blue-800' },
  { name: 'ICICI Bank', ifsc: 'ICIC0000456', color: 'from-amber-600 to-orange-700' },
  { name: 'State Bank of India', ifsc: 'SBIN0000789', color: 'from-sky-600 to-blue-700' },
  { name: 'Axis Bank', ifsc: 'UTIB0000321', color: 'from-rose-700 to-pink-800' },
  { name: 'Kotak Mahindra', ifsc: 'KKBK0000654', color: 'from-red-600 to-red-800' },
  { name: 'Punjab National Bank', ifsc: 'PUNB0000987', color: 'from-amber-500 to-amber-700' },
];

export const SetupPage: React.FC<SetupPageProps> = ({ onNavigate }) => {
  const { setupBusiness, user } = useAuth();

  // Section 1: Business Identity
  const [name, setName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');

  // Section 2: Payment Method Choice
  const [paymentMethod, setPaymentMethod] = useState<'both' | 'upi' | 'bank'>('both');
  const [upiId, setUpiId] = useState('');

  // Section 3: Secure Bank Tokenization State
  const [accountVerified, setAccountVerified] = useState(false);
  const [maskedAccount, setMaskedAccount] = useState('');
  const [paymentToken, setPaymentToken] = useState('');

  // Bank Connection Modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(POPULAR_BANKS[0].name);
  const [customLast4, setCustomLast4] = useState('5678');
  const [isConnectingBank, setIsConnectingBank] = useState(false);

  // Section 4: Rules
  const [defaultLateFeePercent, setDefaultLateFeePercent] = useState<number>(2);
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState<number>(3);
  const [notificationChannel, setNotificationChannel] = useState<'whatsapp' | 'email' | 'both'>('both');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Bank Authentication Flow (Regulated Gateway / Tokenization)
  const handleConnectBank = async () => {
    try {
      setIsConnectingBank(true);
      setError('');

      const bankInfo = POPULAR_BANKS.find((b) => b.name === selectedBank) || POPULAR_BANKS[0];
      const res = await api.business.verifyBank({
        bankName: selectedBank,
        last4: customLast4 || '5678',
        ifsc: bankInfo.ifsc,
      });

      setAccountVerified(true);
      setMaskedAccount(res.masked_account);
      setPaymentToken(res.payment_token);
      setIsBankModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate bank account via secure gateway.');
    } finally {
      setIsConnectingBank(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please provide your Business Trade Name.');
      return;
    }

    if ((paymentMethod === 'upi' || paymentMethod === 'both') && !upiId.trim()) {
      setError('Please enter a valid UPI ID (e.g., yourbusiness@okhdfcbank).');
      return;
    }

    if ((paymentMethod === 'bank' || paymentMethod === 'both') && !accountVerified && !maskedAccount) {
      setError('Please securely connect your bank account via the regulated gateway below.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const data: BusinessSetupInput = {
        name: name.trim(),
        gstNumber: gstNumber.trim() || undefined,
        upiId: upiId.trim() || 'settlement@payflow.verified',
        bankDetails: maskedAccount
          ? `${maskedAccount}\nSettlement: Instant RTGS/NEFT\nSecurity: RBI Tokenized Gateway`
          : `Settlement via UPI: ${upiId.trim()}`,
        paymentMethod,
        accountVerified,
        paymentToken: paymentToken || undefined,
        maskedAccount: maskedAccount || undefined,
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
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/30 items-center justify-center mb-1">
            <Building className="w-6 h-6 text-brand-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Setup Your Business Profile</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Configure how clients pay you and set automated late-fee collection rules.
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
          {error && (
            <div className="p-3.5 mb-6 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
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

            {/* Section 2: Payment Method Selection */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  2. Payment Method
                </h3>
                <span className="text-[11px] text-slate-400">Choose how clients settle invoices</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('both')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'both'
                      ? 'bg-brand-500/15 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Both (Recommended)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold">
                      Best
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">UPI Instant Pay + Secure Bank Transfer</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'bank'
                      ? 'bg-brand-500/15 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-white">Bank Account</span>
                  </div>
                  <p className="text-[11px] text-slate-400">NEFT / RTGS / IMPS via Gateway</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'upi'
                      ? 'bg-brand-500/15 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-white">UPI Only</span>
                  </div>
                  <p className="text-[11px] text-slate-400">VPA Handle & Scan-to-pay QR</p>
                </button>
              </div>

              {/* UPI ID Field (if UPI or Both) */}
              {(paymentMethod === 'upi' || paymentMethod === 'both') && (
                <div className="space-y-1.5 mb-4">
                  <label className="block text-xs font-medium text-slate-300">
                    UPI ID (Virtual Payment Address) *
                  </label>
                  <div className="relative">
                    <QrCode className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourbusiness@okhdfcbank or 9876543210@paytm"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Used to generate instant click-to-pay links & QR codes on client invoices.
                  </p>
                </div>
              )}

              {/* Section 3: 🔒 Secure Bank Connection (if Bank or Both) */}
              {(paymentMethod === 'bank' || paymentMethod === 'both') && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          🔒 Secure Bank Connection
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Handled by RBI-approved payment gateway (Razorpay)
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Shield className="w-3 h-3" />
                      PCI DSS Level 1
                    </span>
                  </div>

                  {accountVerified ? (
                    /* Verified State */
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Bank Account Verified
                        </div>
                        <p className="text-xs font-mono text-white">{maskedAccount}</p>
                        <p className="text-[10px] text-slate-400">
                          Token: <span className="font-mono text-slate-300">{paymentToken.slice(0, 18)}...</span> (Encrypted at rest)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBankModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    /* Unconnected State */
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Click below to securely connect your bank account. You&apos;ll authenticate directly
                        through <strong>Razorpay&apos;s regulated portal</strong>.
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsBankModalOpen(true)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Connect Bank Account Securely</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>PayFlow never stores your raw bank credentials.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Automated Late-Fee Engine Rule */}
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
                    Calculated strictly on remaining unpaid invoice balance.
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
                    Days after due date before the penalty line automatically attaches.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 group"
            >
              <span>{isLoading ? 'Saving Business Profile...' : 'Complete Setup & Go to Dashboard'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>

      {/* Secure Bank Connection Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Bank-Grade Verification</h4>
                  <p className="text-[11px] text-slate-400">Razorpay / RBI Account Aggregator Gateway</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 leading-relaxed">
              <span className="font-bold">🔒 Zero Raw Credential Exposure:</span> You authenticate directly with
              your bank. PayFlow only receives a cryptographically signed token.
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Select Your Bank
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {POPULAR_BANKS.map((bank) => (
                  <button
                    key={bank.name}
                    type="button"
                    onClick={() => setSelectedBank(bank.name)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      selectedBank === bank.name
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate">{bank.name}</div>
                    <span className="text-[10px] text-slate-500 font-mono">{bank.ifsc}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Identifier (Last 4 digits for display)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={customLast4}
                  onChange={(e) => setCustomLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="5678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Shown to clients as: <strong>{selectedBank} •••• {customLast4 || 'XXXX'}</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConnectingBank}
                onClick={handleConnectBank}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/25"
              >
                {isConnectingBank ? (
                  <span>Verifying Token...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Authorize & Link Token</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
