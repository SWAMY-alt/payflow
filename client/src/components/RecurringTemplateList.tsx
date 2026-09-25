import React, { useState } from 'react';
import { RotateCw, Pause, Play, Ban, Calendar, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatPaise } from '../../../shared/types';
import type { InvoiceTemplate } from '../../../shared/types';
import { api } from '../lib/api';

interface RecurringTemplateListProps {
  templates: InvoiceTemplate[];
  onRefresh: () => void;
  onOpenCreateModal?: () => void;
}

export const RecurringTemplateList: React.FC<RecurringTemplateListProps> = ({
  templates,
  onRefresh,
  onOpenCreateModal,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: 'active' | 'paused' | 'cancelled') => {
    try {
      setUpdatingId(id);
      await api.recurring.updateStatus(id, status);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update template status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            Active Schedule
          </span>
        );
      case 'paused':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
            Paused
          </span>
        );
      case 'cancelled':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Cancelled
          </span>
        );
    }
  };

  if (templates.length === 0) {
    return (
      <div className="py-12 text-center rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 p-8">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
          <RotateCw className="w-6 h-6 text-purple-400" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">No Recurring Invoices Configured</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
          Turn on the recurring toggle while creating any invoice, or set up a recurring retainer template to automate monthly billing without zero manual entry.
        </p>
        {onOpenCreateModal && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition-all inline-flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            + New Recurring Template
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {templates.map((tpl) => {
        const totalPaise = (tpl.lineItems as any[]).reduce(
          (acc, item) => acc + (item.quantity || 1) * (item.unitPrice || 0),
          0
        );

        const nextRunFormatted = new Date(tpl.nextRunDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const isUpdating = updatingId === tpl.id;

        return (
          <div
            key={tpl.id}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {tpl.frequency}
                </span>
                {getStatusBadge(tpl.status)}
                <span className="text-xs font-mono font-bold text-slate-300">
                  {formatPaise(totalPaise)}
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-400" />
                  {tpl.client?.name || 'Client'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(tpl.lineItems as any[])
                    .map((item) => `${item.description} (x${item.quantity || 1})`)
                    .join(', ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Next run: <strong className="text-slate-200">{nextRunFormatted}</strong>
                </span>
                <span>
                  Generated:{' '}
                  <strong className="text-slate-200">
                    {tpl.generatedCount} invoice{tpl.generatedCount !== 1 ? 's' : ''}
                  </strong>
                </span>
                {tpl.endCondition !== 'never' && (
                  <span className="text-[11px] text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
                    Ends: {tpl.endCondition === 'afterCount' ? `${tpl.endValue} runs` : tpl.endValue}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
              {tpl.status === 'active' && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(tpl.id, 'paused')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-amber-300 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/30 transition-all flex items-center gap-1.5"
                  title="Pause Schedule"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}

              {tpl.status === 'paused' && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(tpl.id, 'active')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
                  title="Resume Schedule"
                >
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
              )}

              {tpl.status !== 'cancelled' && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    if (confirm('Cancel this recurring billing schedule? No future invoices will be created.')) {
                      handleStatusChange(tpl.id, 'cancelled');
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all flex items-center gap-1"
                  title="Cancel Schedule"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
