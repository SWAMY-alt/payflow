import React from 'react';
import { formatPaise } from '../../../shared/types';
import type { Payment, Invoice } from '../../../shared/types';
import { CreditCard, ArrowDownRight, ArrowUpRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface PaymentLedgerProps {
  invoice: Invoice;
  payments: Payment[];
  onOpenRecordPayment: () => void;
  onOpenReversalModal?: () => void;
}

export const PaymentLedger: React.FC<PaymentLedgerProps> = ({
  invoice,
  payments,
  onOpenRecordPayment,
  onOpenReversalModal,
}) => {
  const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  const percentPaid = invoice.totalAmount > 0
    ? Math.min(100, Math.round((invoice.amountPaid / invoice.totalAmount) * 100))
    : 0;

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'upi':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
            UPI
          </span>
        );
      case 'bank_transfer':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            NEFT/RTGS
          </span>
        );
      case 'cash':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Cash
          </span>
        );
      case 'card':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Card
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/30">
            {method.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
      {/* Header & Ledger Balance Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Payment Ledger & Audit Trail</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable, insert-only transaction history for invoice #{invoice.invoiceNumber}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {invoice.amountPaid > 0 && onOpenReversalModal && (
            <button
              type="button"
              onClick={onOpenReversalModal}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-amber-300 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/30 transition-all"
            >
              Record Correction
            </button>
          )}

          {remainingPaise > 0 && (
            <button
              type="button"
              onClick={onOpenRecordPayment}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Progress & Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <p className="text-xs font-medium text-slate-400">Total Billed</p>
          <p className="text-lg font-bold text-white mt-1">{formatPaise(invoice.totalAmount)}</p>
          {invoice.lateFeeAmount > 0 && (
            <p className="text-[11px] text-rose-400 mt-0.5">
              Includes {formatPaise(invoice.lateFeeAmount)} late fee
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <p className="text-xs font-medium text-slate-400">Total Collected</p>
          <p className="text-lg font-bold text-emerald-400 mt-1">{formatPaise(invoice.amountPaid)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{percentPaid}% settled</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <p className="text-xs font-medium text-slate-400">Outstanding Balance</p>
          <p
            className={`text-lg font-bold mt-1 ${
              remainingPaise > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {formatPaise(remainingPaise)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {remainingPaise === 0 ? 'Zero balance due' : 'Pending payment'}
          </p>
        </div>
      </div>

      {/* Visual progress track */}
      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-6 border border-slate-800/60">
        <div
          className={`h-full transition-all duration-500 ${
            percentPaid === 100
              ? 'bg-emerald-500'
              : percentPaid > 0
              ? 'bg-amber-400'
              : 'bg-slate-700'
          }`}
          style={{ width: `${percentPaid}%` }}
        />
      </div>

      {/* Chronological Table */}
      {payments.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800">
          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No payments recorded yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When the client sends a partial or full payment via UPI or bank transfer, record it here to update the ledger.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Reference / Note</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p) => {
                const isReversal = p.amount < 0;
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      isReversal ? 'bg-rose-950/10 text-rose-200' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3 font-medium text-slate-300 whitespace-nowrap">
                      {new Date(p.paidAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {isReversal ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Reversal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <ArrowDownRight className="w-3.5 h-3.5" /> Payment
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">{getMethodBadge(p.method)}</td>
                    <td className="py-3.5 px-3 text-slate-300 max-w-xs truncate">
                      {p.referenceNote || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">{p.recordedBy}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          isReversal ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-bold'
                        }
                      >
                        {formatPaise(p.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
