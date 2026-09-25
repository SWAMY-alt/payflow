import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  ExternalLink,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatPaise } from '../../../shared/types';
import type { Invoice } from '../../../shared/types';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';

interface InvoicesPageProps {
  onNavigate: (path: string) => void;
  initialStatus?: string;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onNavigate, initialStatus = 'All' }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.invoices.list({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
      });
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, searchTerm]);

  const statusTabs = ['All', 'Pending', 'Partially Paid', 'Paid', 'Overdue'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Invoices & Receivables</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-calculated balances, running ledgers, and automated penalty tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/invoices/new')}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice # or client..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center p-6">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">No invoices found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {statusFilter !== 'All'
                ? `No invoices currently have the status "${statusFilter}".`
                : 'Get started by creating your first client invoice.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/invoices/new')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors"
            >
              + Create First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-950/40">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Paid / Balance</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => {
                  const remaining = Math.max(0, inv.totalAmount - inv.amountPaid);
                  const dueDateFormatted = new Date(inv.dueDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => onNavigate(`/invoices/${inv.id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-200">{inv.client?.name}</p>
                        <p className="text-[11px] text-slate-500">{inv.client?.contactPhone}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {dueDateFormatted}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatPaise(inv.totalAmount)}
                        {inv.lateFeeAmount > 0 && (
                          <span className="block text-[10px] font-sans text-rose-400 font-medium">
                            +{formatPaise(inv.lateFeeAmount)} fee
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-emerald-400 font-semibold">
                          {formatPaise(inv.amountPaid)}
                        </span>
                        {remaining > 0 && (
                          <span className="block text-rose-400 font-semibold text-[11px]">
                            {formatPaise(remaining)} due
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <InvoiceStatusBadge
                          status={inv.status}
                          escalationStatus={inv.escalationStatus}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={api.invoices.getPdfUrl(inv.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => onNavigate(`/invoices/${inv.id}`)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors flex items-center gap-1"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
