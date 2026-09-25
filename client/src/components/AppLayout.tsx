import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  RotateCw,
  Settings,
  Plus,
  LogOut,
  Play,
  ShieldAlert,
  Menu,
  X,
  CreditCard,
  Building,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CronRunnerModal } from './CronRunnerModal';

interface AppLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentPath, onNavigate, children }) => {
  const { user, business, logout, seedDemoAccount } = useAuth();
  const [isCronModalOpen, setIsCronModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Recurring Billing', path: '/recurring', icon: RotateCw },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      await seedDemoAccount();
      onNavigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to seed demo data');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900/90 border-r border-slate-800/80 p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Pay<span className="text-brand-400">Flow</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                Billing & Collections
              </p>
            </div>
          </div>

          {/* Quick "+ New Invoice" Button */}
          <button
            type="button"
            onClick={() => onNavigate('/invoices/new')}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Create Invoice
          </button>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPath === item.path ||
                (item.path !== '/dashboard' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Automation Pass Runner Widget */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsCronModalOpen(true)}
              className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-brand-500/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-brand-400 flex items-center gap-1">
                  <Play className="w-3 h-3 text-brand-400" />
                  Scheduled Jobs
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                Automation Runner
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Test late fee & follow-up cron
              </p>
            </button>
          </div>
        </div>

        {/* Bottom Profile & Business Info */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          {/* Active Business Badge */}
          {business && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <p className="text-xs font-bold text-slate-200 truncate">{business.name}</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                UPI: <span className="font-mono text-slate-300">{business.upiId}</span>
              </p>
            </div>
          )}

          {/* Demo Data Reset Button for Quick Testing */}
          <button
            type="button"
            disabled={isSeeding}
            onClick={handleSeedDemo}
            className="w-full py-2 px-3 rounded-xl text-[11px] font-semibold text-purple-300 bg-purple-950/40 hover:bg-purple-950/70 border border-purple-500/30 transition-all flex items-center justify-center gap-1.5"
            title="Seed demo clients, invoices with late fees, and recurring templates"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {isSeeding ? 'Seeding...' : 'Load Demo Data'}
          </button>

          {/* User Details & Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base text-white">PayFlow</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/invoices/new')}
              className="p-2 rounded-lg bg-brand-500 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden p-4 bg-slate-900 border-b border-slate-800 space-y-3">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    onNavigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                    currentPath === item.path ? 'bg-brand-500 text-white' : 'text-slate-300'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">{user?.fullName}</span>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-rose-400 hover:underline"
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Cron / Automation Pass Runner Modal */}
      <CronRunnerModal
        isOpen={isCronModalOpen}
        onClose={() => setIsCronModalOpen(false)}
        onJobExecuted={() => {
          // Trigger refresh event by reloading or dispatching
        }}
      />
    </div>
  );
};
