import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  X,
  User,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatPaise } from '../../../shared/types';
import type { Client } from '../../../shared/types';

interface ClientsPageProps {
  onNavigate: (path: string) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ onNavigate }) => {
  const [clients, setClients] = useState<
    (Client & { invoiceCount: number; totalOutstanding: number })[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadClients = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.clients.list(searchTerm.trim() || undefined);
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [searchTerm]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setPhone(c.contactPhone);
    setEmail(c.contactEmail);
    setNotes(c.notes || '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setModalError('Please fill in Name, Phone, and Email.');
      return;
    }

    try {
      setIsSaving(true);
      setModalError('');
      if (editingClient) {
        await api.clients.update(editingClient.id, {
          name: name.trim(),
          contactPhone: phone.trim(),
          contactEmail: email.trim(),
          notes: notes.trim() || undefined,
        });
      } else {
        await api.clients.create({
          name: name.trim(),
          contactPhone: phone.trim(),
          contactEmail: email.trim(),
          notes: notes.trim() || undefined,
        });
      }
      setIsModalOpen(false);
      loadClients();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete client "${name}"?`)) return;
    try {
      await api.clients.delete(id);
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Cannot delete client with active invoice records.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Clients Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage service clients, contact numbers, and outstanding balance summaries
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by client name, email, or phone..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 shadow-xl"
        />
      </div>

      {/* Client Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 p-6">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">No clients found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Add your clients to generate invoices, send reminders, and track payments.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors"
          >
            + Add First Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {c.invoiceCount} invoice{c.invoiceCount !== 1 ? 's' : ''} on record
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Client"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {c.invoiceCount === 0 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.contactPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{c.contactEmail}</span>
                  </div>
                  {c.notes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 pt-1 border-t border-slate-800/80">
                      {c.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Outstanding balance & quick bill */}
              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-500">
                    Outstanding
                  </p>
                  <p
                    className={`text-xs font-mono font-bold ${
                      c.totalOutstanding > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {formatPaise(c.totalOutstanding)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(`/invoices/new?clientId=${c.id}`)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-400 hover:text-white bg-brand-500/10 hover:bg-brand-500 transition-all flex items-center gap-1"
                >
                  Bill Client <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-brand-400" />
                {editingClient ? 'Edit Client' : 'Add New Client'}
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

            <form onSubmit={handleSaveClient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rohan Mehra"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Phone (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@domain.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly maintenance contract, Net 14 terms"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-md shadow-brand-500/20"
                >
                  {isSaving ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
