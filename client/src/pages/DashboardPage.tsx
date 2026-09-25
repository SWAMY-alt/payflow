import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatPaise } from '../../../shared/types';
import type { DashboardSummary } from '../../../shared/types';
import { DashboardSummaryCards } from '../components/DashboardSummaryCards';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.dashboard.summary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Financial Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time collection overview, audit ledgers, and overdue status
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadSummary}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/invoices/new')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary ? (
        <DashboardSummaryCards summary={summary} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
          ))}
        </div>
      )}

      {/* Escalation Alert Banner */}
      {summary && summary.needsAttentionCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-200">
                {summary.needsAttentionCount} Invoice{summary.needsAttentionCount > 1 ? 's' : ''} Escalated to &quot;Needs Attention&quot; (7+ Days Overdue)
              </p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Automated reminders have been halted as per policy. Personal owner intervention required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/invoices?status=Overdue')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-900/60 hover:bg-rose-900 border border-rose-500/40 transition-colors whitespace-nowrap"
          >
            Review Invoices
          </button>
        </div>
      )}

      {/* Main Grid: Recent Invoices & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-white">Recent Invoices</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/invoices')}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
            >
              View All ({summary?.totalInvoicesCount || 0})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!summary || summary.recentInvoices.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No invoices created yet. Click &quot;Create Invoice&quot; to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Paid / Remaining</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {summary.recentInvoices.map((inv) => {
                    const remaining = Math.max(0, inv.totalAmount - inv.amountPaid);
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => onNavigate(`/invoices/${inv.id}`)}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-200">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-medium">
                          {inv.client?.name || '—'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {formatPaise(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          <span className="text-emerald-400">{formatPaise(inv.amountPaid)}</span>
                          {remaining > 0 && (
                            <span className="text-rose-400 ml-1">/ {formatPaise(remaining)}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <InvoiceStatusBadge
                            status={inv.status}
                            escalationStatus={inv.escalationStatus}
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-0.5">
                            Open <ExternalLink className="w-3 h-3 ml-0.5" />
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

        {/* Recent Payment Ledger (1 col) */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Latest Collections</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Ledger
            </span>
          </div>

          {!summary || summary.recentPayments.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No payments recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {summary.recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3"
                >
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-200 truncate">{p.clientName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {p.invoiceNumber} • {p.method.toUpperCase()}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(p.paidAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-mono font-bold ${
                        p.amount < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatPaise(p.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
