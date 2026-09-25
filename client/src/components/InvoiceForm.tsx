import React, { useState } from 'react';
import { Plus, Trash2, Calendar, RotateCw, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { ClientPicker } from './ClientPicker';
import { formatPaise, rupeeToPaise } from '../../../shared/types';
import type { Client, CreateInvoiceInput } from '../../../shared/types';

interface LineItemRow {
  id: string;
  description: string;
  quantity: number;
  unitPriceRupees: string; // user input in rupees
}

interface InvoiceFormProps {
  initialClientId?: string;
  onSubmit: (data: CreateInvoiceInput) => Promise<void>;
  isSubmitting?: boolean;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialClientId = '',
  onSubmit,
  isSubmitting = false,
}) => {
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Line items state
  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { id: '1', description: '', quantity: 1, unitPriceRupees: '' },
  ]);

  // Due date default: +14 days
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [notes, setNotes] = useState('');

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [endCondition, setEndCondition] = useState<'never' | 'afterCount' | 'onDate'>('never');
  const [endCount, setEndCount] = useState<string>('6');
  const [endDate, setEndDate] = useState<string>('');

  const [formError, setFormError] = useState('');

  // Add line item
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: '',
        quantity: 1,
        unitPriceRupees: '',
      },
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update line item
  const handleUpdateItem = (
    index: number,
    field: keyof LineItemRow,
    value: any
  ) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setFormError('');
  };

  // Calculate live subtotal in paise
  const calculatedSubtotalPaise = lineItems.reduce((acc, item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPaise = rupeeToPaise(item.unitPriceRupees || 0);
    return acc + qty * unitPaise;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setFormError('Please select or add a client.');
      return;
    }

    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.description.trim()) {
        setFormError(`Line item #${i + 1} must have a description.`);
        return;
      }
      const unitPaise = rupeeToPaise(item.unitPriceRupees);
      if (unitPaise < 0) {
        setFormError(`Line item #${i + 1} has an invalid price.`);
        return;
      }
    }

    if (calculatedSubtotalPaise <= 0) {
      setFormError('Total invoice amount must be greater than zero.');
      return;
    }

    try {
      setFormError('');
      const formattedItems = lineItems.map((item) => ({
        description: item.description.trim(),
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        unitPrice: rupeeToPaise(item.unitPriceRupees),
      }));

      const payload: CreateInvoiceInput = {
        clientId: selectedClientId,
        lineItems: formattedItems,
        dueDate: new Date(dueDate),
        notes: notes.trim() || undefined,
        isRecurring,
        recurrence: isRecurring
          ? {
              frequency,
              endCondition,
              endValue:
                endCondition === 'afterCount'
                  ? parseInt(endCount, 10)
                  : endCondition === 'onDate'
                  ? new Date(endDate)
                  : undefined,
            }
          : undefined,
      };

      await onSubmit(payload);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create invoice.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
          {formError}
        </div>
      )}

      {/* Client Picker Box */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <ClientPicker
          selectedClientId={selectedClientId}
          onSelectClient={(client) => {
            setSelectedClientId(client.id);
            setSelectedClient(client);
            setFormError('');
          }}
          error={!selectedClientId && formError ? 'Client selection is required' : undefined}
        />
      </div>

      {/* Line Items Builder */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Line Items & Services
            </h3>
            <p className="text-xs text-slate-500">Add order details and labor/materials costs</p>
          </div>
          <button
            type="button"
            onClick={handleAddLineItem}
            className="px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-brand-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => {
            const qty = Math.max(1, Number(item.quantity) || 1);
            const ratePaise = rupeeToPaise(item.unitPriceRupees || 0);
            const rowTotalPaise = qty * ratePaise;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center group hover:border-slate-700 transition-colors"
              >
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={item.description}
                    onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                    placeholder="e.g. Consultation, Electrical wiring, Monthly Retainer"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Unit Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={item.unitPriceRupees}
                    onChange={(e) => handleUpdateItem(index, 'unitPriceRupees', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-4">
                  <span className="font-mono text-xs font-bold text-slate-200">
                    {formatPaise(rowTotalPaise)}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Due Date & Recurring Toggle Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Payment Due Date *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes / Payment Terms (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Net 14 days, UPI preferred"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Recurring Toggle Switch */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <RotateCw className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Enable Recurring Billing Schedule</p>
                <p className="text-xs text-slate-400">
                  Automatically re-generates this invoice on schedule without manual re-entry
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Expanded Recurring Configuration */}
          {isRecurring && (
            <div className="mt-4 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1">
                  End Condition
                </label>
                <select
                  value={endCondition}
                  onChange={(e) => setEndCondition(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="never">Never (Until Cancelled)</option>
                  <option value="afterCount">After N Occurrences</option>
                  <option value="onDate">On Specific Date</option>
                </select>
              </div>

              {endCondition === 'afterCount' && (
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Total Invoices to Generate
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={endCount}
                    onChange={(e) => setEndCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {endCondition === 'onDate' && (
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    End Cutoff Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary & Submit Bar */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">Total Invoice Amount</p>
          <p className="text-2xl font-mono font-bold text-white mt-0.5">
            {formatPaise(calculatedSubtotalPaise)}
          </p>
          <p className="text-[11px] text-slate-500">
            {lineItems.length} line item{lineItems.length > 1 ? 's' : ''} • Zero rounding error guarantee
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 group"
        >
          <span>{isSubmitting ? 'Creating Invoice...' : 'Generate Invoice & Download PDF'}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </form>
  );
};
