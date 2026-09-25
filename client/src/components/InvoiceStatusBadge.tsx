import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import type { InvoiceStatus, EscalationStatus } from '../../../shared/types';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  escalationStatus?: EscalationStatus;
  showEscalationOnly?: boolean;
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({
  status,
  escalationStatus,
  showEscalationOnly = false,
}) => {
  if (showEscalationOnly && escalationStatus === 'Needs Attention') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse shadow-sm">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        Needs Attention (7d+)
      </span>
    );
  }

  const renderBadge = () => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Partially Paid
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Overdue
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/30">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {renderBadge()}
      {escalationStatus === 'Needs Attention' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
          Needs Attention
        </span>
      )}
    </div>
  );
};
