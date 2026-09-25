import React from 'react';
import { DollarSign, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatPaise } from '../../../shared/types';
import type { DashboardSummary } from '../../../shared/types';

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
}

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Outstanding */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Outstanding
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-white mt-3">
          {formatPaise(summary.totalOutstanding)}
        </p>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
          <span className="text-rose-400 font-semibold">{summary.partialCount + summary.pendingCount}</span> open / partial invoices
        </div>
      </div>

      {/* 2. Collected This Month */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Collected This Month
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-emerald-400 mt-3">
          {formatPaise(summary.collectedThisMonth)}
        </p>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
          <span className="text-emerald-400 font-semibold">{summary.paidCount}</span> fully settled invoices
        </div>
      </div>

      {/* 3. Overdue Invoices Count */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Overdue Invoices
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            summary.overdueCount > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${summary.overdueCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
        </div>
        <p className={`text-2xl font-bold font-mono mt-3 ${summary.overdueCount > 0 ? 'text-amber-400' : 'text-white'}`}>
          {summary.overdueCount}
        </p>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
          {summary.needsAttentionCount > 0 ? (
            <span className="text-rose-400 font-bold animate-pulse">
              {summary.needsAttentionCount} escalated (7+ days)
            </span>
          ) : (
            <span>Auto follow-up running</span>
          )}
        </div>
      </div>

      {/* 4. Late Fees Recovered */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Late Fees Recovered
          </span>
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-brand-400" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-brand-300 mt-3">
          {formatPaise(summary.lateFeesRecovered)}
        </p>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
          From automatic penalty rules
        </div>
      </div>
    </div>
  );
};
