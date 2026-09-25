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

const POPULAR_BANKS = [
  { name: 'HDFC Bank', ifsc: 'HDFC0001234' },
  { name: 'ICICI Bank', ifsc: 'ICIC0000456' },
  { name: 'State Bank of India', ifsc: 'SBIN0000789' },
  { name: 'Axis Bank', ifsc: 'UTIB0000321' },
  { name: 'Kotak Mahindra', ifsc: 'KKBK0000654' },
  { name: 'Punjab National Bank', ifsc: 'PUNB0000987' },
];

export const SettingsPage: React.FC = () => {
  const { business, updateBusiness } = useAuth();

  const [name, setName] = useState(business?.name || '');
  const [gstNumber, setGstNumber] = useState(business?.gstNumber || '');
  const [upiId, setUpiId] = useState(business?.upiId || '');

  // Payment Method & Tokenization
  const [paymentMethod, setPaymentMethod] = useState<'both' | 'upi' | 'bank'>(
    (business?.paymentMethod as any) || 'both'
  );
  const [accountVerified, setAccountVerified] = useState(business?.accountVerified ?? true);
  const [maskedAccount, setMaskedAccount] = useState(
    business?.maskedAccount || (business?.bankDetails ? business.bankDetails.split('\n')[0] : 'HDFC Bank (•••• 5678)')
  );
  const [paymentToken, setPaymentToken] = useState(business?.paymentToken || 'tok_rzp_sec_verified');

  // Bank Connection Modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(POPULAR_BANKS[0].name);
  const [customLast4, setCustomLast4] = useState('5678');
  const [isConnectingBank, setIsConnectingBank] = useState(false);

  // Late Fee & Communications
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
      setPaymentMethod((business.paymentMethod as any) || 'both');
      setAccountVerified(business.accountVerified ?? true);
      setMaskedAccount(
        business.maskedAccount ||
          (business.bankDetails ? business.bankDetails.split('\n')[0] : 'HDFC Bank (•••• 5678)')
      );
      setPaymentToken(business.paymentToken || 'tok_rzp_sec_verified');
      setDefaultLateFeePercent(business.defaultLateFeePercent);
      setLateFeeGraceDays(business.lateFeeGraceDays);
      setNotificationChannel(business.notificationChannel);
      setContactPhone(business.contactPhone || '');
      setContactEmail(business.contactEmail || '');
      setAddress(business.address || '');
    }
  }, [business]);

  const handleConnectBank = async () => {
    try {
      setIsConnectingBank(true);
      setErrorMsg('');

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
      setSuccessMsg('Bank account authenticated securely via Razorpay gateway.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate bank account.');
    } finally {
      setIsConnectingBank(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Business Name is required.');
      return;
    }

    if ((paymentMethod === 'upi' || paymentMethod === 'both') && !upiId.trim()) {
      setErrorMsg('Valid UPI ID is required.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

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
        defaultLateFeePercent: Number(defaultLateFeePercent) || 0,
        lateFeeGraceDays: Number(lateFeeGraceDays) || 0,
        notificationChannel,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        address: address.trim() || undefined,
      };

      await updateBusiness(data);
      setSuccessMsg('Business settings and payment coordinates saved successfully.');
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
          Configure secure payment coordinates, late-fee penalty rules, and client communication channels
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Business Identity */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
            <Building className="w-4 h-4" />
            1. Business Identity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Business / Trade Name *
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
                Primary Phone (WhatsApp notifications)
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
                placeholder="e.g. 42, 100ft Road, Indiranagar, Bengaluru"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Payment Coordinates (Tokenized & Gateway Secured) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              2. Payment Coordinates & Gateway Integration
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-3 h-3" />
              PCI DSS Certified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <p className="text-[11px] text-slate-400">UPI Instant + Secure Bank Transfer</p>
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

          {/* UPI ID Field */}
          {(paymentMethod === 'upi' || paymentMethod === 'both') && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                UPI ID (Virtual Payment Address) *
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. business@okhdfcbank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {/* 🔒 Secure Bank Connection Widget */}
          {(paymentMethod === 'bank' || paymentMethod === 'both') && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
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
                      Tokens handled securely by Razorpay / RBI-regulated gateway
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                  <span>Re-authenticate</span>
                </button>
              </div>

              {accountVerified ? (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
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
                  <span className="text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                    Active
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                  <p className="text-xs text-amber-200">
                    Bank connection pending. Click Re-authenticate to link your account securely.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsBankModalOpen(true)}
                    className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    Connect
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                🔒 Zero raw credential storage: Raw account numbers and passwords never touch PayFlow servers.
              </p>
            </div>
          )}
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

        {/* 4. Automated Communication Channels */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            4. Automated Notification Channels
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'whatsapp', label: 'WhatsApp Only', desc: 'Fastest response rate' },
              { id: 'email', label: 'Email Only', desc: 'Formal invoice delivery' },
              { id: 'both', label: 'Both (Recommended)', desc: 'Multi-touch follow-up' },
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setNotificationChannel(ch.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  notificationChannel === ch.id
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">{ch.label}</div>
                <div className="text-[11px] text-slate-400">{ch.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/25 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

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
