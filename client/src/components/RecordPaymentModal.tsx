import React, { useState } from 'react';
import { X, CreditCard, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { formatPaise, rupeeToPaise } from '../../../shared/types';
import type { Invoice, PaymentMethod } from '../../../shared/types';

interface RecordPaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPaymentRecorded,
}) => {
  const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  const remainingRupees = remainingPaise / 100;

  const [amountRupees, setAmountRupees] = useState<string>(remainingRupees.toString());
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [referenceNote, setReferenceNote] = useState('');
  const [paidAtDate, setPaidAtDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeeToPaise(amountRupees);

    if (paise <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (paise > remainingPaise) {
      setError(
        `Payment of ${formatPaise(paise)} exceeds remaining balance of ${formatPaise(
          remainingPaise
        )}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const res = await api.invoices.recordPayment(invoice.id, {
        amount: paise,
        method,
        referenceNote: referenceNote.trim() || undefined,
        paidAt: new Date(paidAtDate),
      });

      // Celebrate full settlement
      if (res.invoice.status === 'Paid') {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetQuickAmount = (ratio: number) => {
    const val = Math.round(remainingRupees * ratio);
    setAmountRupees(val.toString());
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Payment</h3>
              <p className="text-xs text-slate-400">Invoice #{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Remaining Banner */}
        <div className="p-3.5 mb-5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Remaining Due</p>
            <p className="text-base font-bold text-rose-400">{formatPaise(remainingPaise)}</p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => handleSetQuickAmount(1)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 border border-brand-500/30 transition-colors"
            >
              Full (100%)
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickAmount(0.5)}
              className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              50%
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Payment Amount (in INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={remainingRupees}
                required
                value={amountRupees}
                onChange={(e) => {
                  setAmountRupees(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-base font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method *</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'upi', label: 'UPI' },
                  { id: 'bank_transfer', label: 'Bank (NEFT)' },
                  { id: 'cash', label: 'Cash' },
                  { id: 'card', label: 'Card' },
                  { id: 'other', label: 'Other' },
                ] as const
              ).map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    method === m.id
                      ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date Paid</label>
              <input
                type="date"
                required
                value={paidAtDate}
                onChange={(e) => setPaidAtDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reference / UTR</label>
              <input
                type="text"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder="e.g. UTR 429188..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
