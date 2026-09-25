import React, { useState, useEffect } from 'react';
import { Plus, User, Search, Check, X, Phone, Mail } from 'lucide-react';
import { api } from '../lib/api';
import type { Client } from '../../../shared/types';

interface ClientPickerProps {
  selectedClientId: string;
  onSelectClient: (client: Client) => void;
  error?: string;
}

export const ClientPicker: React.FC<ClientPickerProps> = ({
  selectedClientId,
  onSelectClient,
  error,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadClients = async () => {
    try {
      const data = await api.clients.list();
      setClients(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPhone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientPhone || !newClientEmail) {
      setModalError('Please fill in name, phone, and email.');
      return;
    }

    try {
      setIsSaving(true);
      setModalError('');
      const created = await api.clients.create({
        name: newClientName,
        contactPhone: newClientPhone,
        contactEmail: newClientEmail,
        notes: newClientNotes,
      });
      setClients((prev) => [created, ...prev]);
      onSelectClient(created);
      setIsModalOpen(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientNotes('');
    } catch (err: any) {
      setModalError(err.message || 'Failed to create client');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Client *
        </label>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Client
        </button>
      </div>

      {/* Select button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 rounded-xl bg-slate-900/80 border text-left cursor-pointer transition-all flex items-center justify-between ${
          error
            ? 'border-rose-500/80 shadow-rose-950/20'
            : isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {selectedClient ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-brand-400" />
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-100 truncate">{selectedClient.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {selectedClient.contactPhone} • {selectedClient.contactEmail}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <User className="w-4 h-4" />
            <span className="text-sm">Select client for invoice...</span>
          </div>
        )}
        <div className="shrink-0 ml-2">
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md">
            {isOpen ? 'Close' : 'Choose'}
          </span>
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-30 mt-2 w-full rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2.5 max-h-72 flex flex-col">
          {/* Search box */}
          <div className="relative mb-2 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients by name, email, or phone..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Client list */}
          <div className="overflow-y-auto space-y-1 pr-1 custom-scroll">
            {filteredClients.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-500 mb-2">No clients found matching search</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-500/20"
                >
                  + Add &quot;{searchTerm || 'New Client'}&quot;
                </button>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === selectedClientId;
                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      onSelectClient(client);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-brand-500/20 border border-brand-500/30 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold">{client.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {client.contactPhone} | {client.contactEmail}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-brand-400 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Inline Create Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-brand-400" />
                Add New Client
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

            <form onSubmit={handleCreateClient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name / Company *
                </label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Rohan Mehra or Studio Alpha"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Phone (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  placeholder="e.g. Preferred contact method, ongoing projects"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-md shadow-brand-500/20"
                >
                  {isSaving ? 'Creating...' : 'Save & Select Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
