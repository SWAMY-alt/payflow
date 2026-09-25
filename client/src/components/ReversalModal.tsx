import React, { useState } from 'react';
import { X, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { api } from '../lib/api';
import { formatPaise, rupeeToPaise } from '../../../shared/types';
import type { Invoice } from '../../../shared/types';

interface ReversalModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onReversalRecorded: () => void;
}

export const ReversalModal: React.FC<ReversalModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onReversalRecorded,
}) => {
  const maxReversalRupees = invoice.amountPaid / 100;
  const [amountRupees, setAmountRupees] = useState<string>(maxReversalRupees.toString());
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeeToPaise(amountRupees);

    if (paise <= 0) {
      setError('Reversal amount must be positive.');
      return;
    }

    if (paise > invoice.amountPaid) {
      setError(`Cannot reverse more than total paid of ${formatPaise(invoice.amountPaid)}.`);
      return;
    }

    if (!reason.trim()) {
      setError('Audit reason for reversal is strictly required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await api.invoices.reversePayment(invoice.id, {
        amount: paise,
        reason: reason.trim(),
      });
      onReversalRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record reversal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Reversal / Correction</h3>
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

        <div className="p-3 mb-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Financial integrity rule: In PayFlow, recorded payments are immutable. Any error correction is registered as a counter-entry (reversal) in the audit ledger.
          </span>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reversal Amount (in INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={maxReversalRupees}
                required
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-base font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Max reversible: {formatPaise(invoice.amountPaid)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reason / Explanation for Audit *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Bounced cheque, payment recorded under wrong invoice, bank dispute"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-600/20"
            >
              {isSubmitting ? 'Processing...' : 'Apply Reversal Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
