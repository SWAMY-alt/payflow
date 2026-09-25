import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare, Mail, FileText, Download, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { formatPaise } from '../../../shared/types';
import type { Invoice, Business, Client } from '../../../shared/types';

interface SendInvoiceModalProps {
  invoice: Invoice;
  business: Business;
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  invoice,
  business,
  client,
  isOpen,
  onClose,
  onSent,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendResult, setSendResult] = useState<{
    whatsAppUrl?: string;
    message?: string;
  } | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const previewMessage = `Hello ${client.name},\n\nHere is invoice #${invoice.invoiceNumber} from ${business.name} for ${formatPaise(invoice.totalAmount)}.\n\nDue Date: ${dueDateStr}\nAmount Due: ${formatPaise(remainingPaise)}\nUPI ID: ${business.upiId}\n\nView invoice & download PDF:\n${window.location.origin}/invoices/${invoice.id}\n\nThank you,\n${business.name}`;

  const cleanPhone = client.contactPhone.replace(/\D/g, '');
  const phoneFormatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const directWhatsAppUrl = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(previewMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = async () => {
    try {
      setIsSending(true);
      setError('');
      const res = await api.invoices.send(invoice.id);
      setSendResult({
        whatsAppUrl: res.whatsAppUrl,
        message: res.message,
      });
      onSent();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch invoice');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(api.invoices.getPdfUrl(invoice.id), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Send Invoice #{invoice.invoiceNumber}</h3>
              <p className="text-xs text-slate-400">Recipient: {client.name}</p>
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

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Channels Info */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <p className="text-[11px] text-slate-400">WhatsApp</p>
              <p className="text-xs font-semibold text-slate-200 truncate">{client.contactPhone}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="truncate">
              <p className="text-[11px] text-slate-400">Email</p>
              <p className="text-xs font-semibold text-slate-200 truncate">{client.contactEmail}</p>
            </div>
          </div>
        </div>

        {/* Message Preview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Deterministic Message Preview
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto custom-scroll">
            {previewMessage}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={sendResult?.whatsAppUrl || directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-center"
            >
              <MessageSquare className="w-4 h-4" />
              1-Click WhatsApp
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-brand-400" />
              Download PDF
            </button>
          </div>

          <button
            type="button"
            disabled={isSending}
            onClick={handleDispatch}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Sending & Logging...' : 'Record Send & Dispatch via Email/API'}
          </button>
        </div>
      </div>
    </div>
  );
};
