import React, { useState } from 'react';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { InvoiceForm } from '../components/InvoiceForm';
import type { CreateInvoiceInput } from '../../../shared/types';

interface NewInvoicePageProps {
  onNavigate: (path: string) => void;
  clientId?: string;
}

export const NewInvoicePage: React.FC<NewInvoicePageProps> = ({ onNavigate, clientId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateInvoiceInput) => {
    try {
      setIsSubmitting(true);
      const created = await api.invoices.create(data);
      onNavigate(`/invoices/${created.id}`);
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('/invoices')}
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            Create New Invoice
          </h2>
          <p className="text-xs text-slate-400">
            Auto-calculates totals, creates printable PDF, and configures optional recurring billing
          </p>
        </div>
      </div>

      <InvoiceForm
        initialClientId={clientId}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
