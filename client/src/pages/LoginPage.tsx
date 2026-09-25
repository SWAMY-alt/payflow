import React, { useState } from 'react';
import { CreditCard, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, seedDemoAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      await login(email, password);
      onNavigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    try {
      setIsDemoLoading(true);
      setError('');
      await seedDemoAccount();
      onNavigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize demo account');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-400 items-center justify-center shadow-xl shadow-brand-500/25 mb-1">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Sign in to Pay<span className="text-brand-400">Flow</span>
          </h2>
          <p className="text-xs text-slate-400">
            Smart billing & collections for independent service providers
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
          {error && (
            <div className="p-3 mb-5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@service.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 group mt-2"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* 1-Click Demo Login */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <button
              type="button"
              disabled={isDemoLoading}
              onClick={handleQuickDemo}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-purple-300 bg-purple-950/40 hover:bg-purple-950/70 border border-purple-500/30 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>
                {isDemoLoading ? 'Loading Demo Workspace...' : '1-Click Instant Demo Login'}
              </span>
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Prefills a realistic electrical/design business with overdue invoices and payment ledger
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('/signup')}
            className="text-brand-400 hover:underline font-semibold"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
};
