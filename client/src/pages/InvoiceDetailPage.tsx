import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Send,
  CreditCard,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  FileText,
  Clock,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatPaise } from '../../../shared/types';
import type { Invoice, Payment, FollowUpLog } from '../../../shared/types';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { PaymentLedger } from '../components/PaymentLedger';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ReversalModal } from '../components/ReversalModal';
import { SendInvoiceModal } from '../components/SendInvoiceModal';

interface InvoiceDetailPageProps {
  invoiceId: string;
  onNavigate: (path: string) => void;
}

export const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({
  invoiceId,
  onNavigate,
}) => {
  const { business } = useAuth();
  const [invoice, setInvoice] = useState<(Invoice & { payments: Payment[]; followUps: FollowUpLog[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isReversalOpen, setIsReversalOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);

  const loadInvoice = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.invoices.get(invoiceId);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-500 animate-pulse">
        Loading invoice details...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-400">{error || 'Invoice not found.'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/invoices')}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700"
        >
          Return to Invoices
        </button>
      </div>
    );
  }

  const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  const issueDateStr = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/invoices')}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold font-mono tracking-tight text-white">
                {invoice.invoiceNumber}
              </h2>
              <InvoiceStatusBadge
                status={invoice.status}
                escalationStatus={invoice.escalationStatus}
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Issued: {issueDateStr} • Due: {dueDateStr}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {remainingPaise > 0 && (
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSendOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            Send Invoice
          </button>

          <a
            href={api.invoices.getPdfUrl(invoice.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-brand-400" />
            Download PDF
          </a>
        </div>
      </div>

      {/* Escalation Notification Banner */}
      {invoice.escalationStatus === 'Needs Attention' && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-rose-200 uppercase tracking-wide">
              Automated Follow-ups Halted: Needs Attention
            </p>
            <p className="text-xs text-rose-300/80">
              This invoice is 7+ days past due ({formatPaise(remainingPaise)} balance outstanding).
              Automated messages are suppressed to maintain client relationship — please step in personally and contact {invoice.client?.name} directly.
            </p>
          </div>
        </div>
      )}

      {/* Overview 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client & Billing Details (1 col) */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <User className="w-4 h-4 text-brand-400" />
            Billed Client
          </div>

          <div>
            <h3 className="text-base font-bold text-white">{invoice.client?.name}</h3>
            <p className="text-xs text-slate-300 mt-1">{invoice.client?.contactPhone}</p>
            <p className="text-xs text-slate-400">{invoice.client?.contactEmail}</p>
            {invoice.client?.notes && (
              <p className="text-xs text-slate-500 mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                {invoice.client.notes}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Due Date:</span>
              <span className={`font-semibold ${invoice.status === 'Overdue' ? 'text-rose-400' : 'text-slate-200'}`}>
                {dueDateStr}
              </span>
            </div>
            {invoice.templateId && (
              <div className="flex justify-between">
                <span className="text-slate-400">Recurring:</span>
                <span className="text-purple-300 font-semibold flex items-center gap-1">
                  <RotateCw className="w-3 h-3" /> Scheduled Template
                </span>
              </div>
            )}
            {invoice.lastSentAt && (
              <div className="flex justify-between">
                <span className="text-slate-400">Last Dispatched:</span>
                <span className="text-slate-300">
                  {new Date(invoice.lastSentAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items & Total Calculations (2 cols) */}
        <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <FileText className="w-4 h-4 text-brand-400" />
              Line Items & Penalties
            </div>
            <span className="text-xs text-slate-500 font-mono">Paise Precision</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Unit Price</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {invoice.lineItems.map((item, index) => {
                  const isFeeItem = item.id?.startsWith('fee-');
                  const itemAmount = (item.quantity || 1) * (item.unitPrice || 0);

                  return (
                    <tr
                      key={item.id || index}
                      className={isFeeItem ? 'bg-rose-950/20 text-rose-300' : 'text-slate-200'}
                    >
                      <td className="py-2.5 px-2 font-sans font-medium">
                        {item.description}
                        {isFeeItem && (
                          <span className="ml-2 text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-500/30">
                            Penalty
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right">{formatPaise(item.unitPrice)}</td>
                      <td
                        className={`py-2.5 px-2 text-right font-bold ${
                          isFeeItem ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        {formatPaise(itemAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200 font-semibold">
                  {formatPaise(invoice.subtotal)}
                </span>
              </div>

              {invoice.lateFeeAmount > 0 && (
                <div className="flex justify-between text-rose-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Late Fee ({invoice.lateFeePercent}% on overdue balance):
                  </span>
                  <span className="font-mono font-bold">
                    +{formatPaise(invoice.lateFeeAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="font-mono text-brand-400">{formatPaise(invoice.totalAmount)}</span>
              </div>

              <div className="flex justify-between text-xs text-emerald-400 font-medium">
                <span>Amount Paid:</span>
                <span className="font-mono font-bold">-{formatPaise(invoice.amountPaid)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center font-bold">
                <span className="text-slate-300">Remaining Due:</span>
                <span
                  className={`text-sm font-mono ${
                    remainingPaise > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {formatPaise(remainingPaise)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Ledger & Audit Trail */}
      <PaymentLedger
        invoice={invoice}
        payments={invoice.payments || []}
        onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
        onOpenReversalModal={() => setIsReversalOpen(true)}
      />

      {/* Follow-up Communication History */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4 text-brand-400" />
            Communication & Escalation Log
          </div>
          <span className="text-[11px] text-slate-500">
            {invoice.followUps?.length || 0} event{invoice.followUps?.length !== 1 ? 's' : ''} logged
          </span>
        </div>

        {!invoice.followUps || invoice.followUps.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            No reminders or escalation messages have been dispatched for this invoice yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {invoice.followUps.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-slate-800">
                      Stage: {log.stage}
                    </span>
                    <span className="text-slate-400">via {log.channel.toUpperCase()}</span>
                    <span className="text-slate-500">
                      {new Date(log.sentAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1 font-mono text-[11px] line-clamp-2">
                    {log.messageBody}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                    log.status === 'flagged_needs_attention'
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {log.status === 'flagged_needs_attention' ? 'Alert' : 'Sent'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={invoice}
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onPaymentRecorded={loadInvoice}
      />

      {/* Reversal Entry Modal */}
      <ReversalModal
        invoice={invoice}
        isOpen={isReversalOpen}
        onClose={() => setIsReversalOpen(false)}
        onReversalRecorded={loadInvoice}
      />

      {/* Send Invoice Modal */}
      {business && (
        <SendInvoiceModal
          invoice={invoice}
          business={business}
          client={invoice.client!}
          isOpen={isSendOpen}
          onClose={() => setIsSendOpen(false)}
          onSent={loadInvoice}
        />
      )}
    </div>
  );
};
