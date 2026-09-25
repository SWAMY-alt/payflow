import React, { useState, useEffect } from 'react';
import { RotateCw, Plus, Calendar, AlertCircle, X, Check, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import type { InvoiceTemplate, Client } from '../../../shared/types';
import { RecurringTemplateList } from '../components/RecurringTemplateList';
import { ClientPicker } from '../components/ClientPicker';
import { rupeeToPaise } from '../../../shared/types';

interface RecurringPageProps {
  onNavigate: (path: string) => void;
}

export const RecurringPage: React.FC<RecurringPageProps> = ({ onNavigate }) => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPriceRupees, setItemPriceRupees] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endCondition, setEndCondition] = useState<'never' | 'afterCount' | 'onDate'>('never');
  const [endValue, setEndValue] = useState('6');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.recurring.list();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load recurring templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setModalError('Please select a client.');
      return;
    }
    if (!itemDescription.trim() || !itemPriceRupees) {
      setModalError('Please enter service description and price.');
      return;
    }

    try {
      setIsSaving(true);
      setModalError('');
      const unitPricePaise = rupeeToPaise(itemPriceRupees);

      await api.recurring.create({
        clientId: selectedClientId,
        frequency,
        startDate: new Date(startDate),
        endCondition,
        endValue: endCondition === 'never' ? undefined : endValue,
        lineItems: [
          {
            description: itemDescription.trim(),
            quantity: Math.max(1, itemQuantity),
            unitPrice: unitPricePaise,
          },
        ],
      });

      setIsModalOpen(false);
      setItemDescription('');
      setItemPriceRupees('');
      setSelectedClientId('');
      loadTemplates();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create recurring template.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <RotateCw className="w-5 h-5 text-purple-400" />
            Recurring Invoicing Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-generate retainer and maintenance invoices on schedule with zero manual re-entry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadTemplates}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Recurring Template
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
          Loading recurring templates...
        </div>
      ) : (
        <RecurringTemplateList
          templates={templates}
          onRefresh={loadTemplates}
          onOpenCreateModal={() => setIsModalOpen(true)}
        />
      )}

      {/* New Recurring Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scroll">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-purple-400" />
                Create Recurring Billing Schedule
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs text-rose-300">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <ClientPicker
                  selectedClientId={selectedClientId}
                  onSelectClient={(c) => setSelectedClientId(c.id)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start / Next Run Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Service Line Item */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Recurring Retainer Service
                </p>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="e.g. Monthly Electrical Inspection & Maintenance"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={itemPriceRupees}
                      onChange={(e) => setItemPriceRupees(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* End Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Condition
                  </label>
                  <select
                    value={endCondition}
                    onChange={(e) => setEndCondition(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="never">Never (Until Cancelled)</option>
                    <option value="afterCount">After N Runs</option>
                    <option value="onDate">On Date</option>
                  </select>
                </div>

                {endCondition === 'afterCount' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Number of Invoices
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={endValue}
                      onChange={(e) => setEndValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {endCondition === 'onDate' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cutoff Date
                    </label>
                    <input
                      type="date"
                      required
                      value={endValue}
                      onChange={(e) => setEndValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-md shadow-purple-600/20"
                >
                  {isSaving ? 'Creating Schedule...' : 'Save Recurring Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
