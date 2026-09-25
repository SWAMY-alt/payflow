import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { SetupPage } from './pages/SetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { NewInvoicePage } from './pages/NewInvoicePage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { ClientsPage } from './pages/ClientsPage';
import { RecurringPage } from './pages/RecurringPage';
import { SettingsPage } from './pages/SettingsPage';

function Router() {
  const { user, hasBusiness, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/dashboard');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-500">
            Initializing PayFlow...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (currentPath === '/signup') {
      return <SignupPage onNavigate={navigate} />;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  // Authenticated, but no business profile yet
  if (!hasBusiness && currentPath !== '/setup') {
    return <SetupPage onNavigate={navigate} />;
  }

  if (currentPath === '/setup') {
    return <SetupPage onNavigate={navigate} />;
  }

  // Main Authenticated Application
  const renderCurrentPage = () => {
    // 1. Dashboard
    if (currentPath === '/' || currentPath === '/dashboard') {
      return <DashboardPage onNavigate={navigate} />;
    }

    // 2. New Invoice
    if (currentPath.startsWith('/invoices/new')) {
      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get('clientId') || undefined;
      return <NewInvoicePage onNavigate={navigate} clientId={clientId} />;
    }

    // 3. Invoice Detail
    if (currentPath.startsWith('/invoices/') && currentPath !== '/invoices/new') {
      const invoiceId = currentPath.split('/')[2];
      return <InvoiceDetailPage invoiceId={invoiceId} onNavigate={navigate} />;
    }

    // 4. Invoices List
    if (currentPath === '/invoices' || currentPath.startsWith('/invoices?')) {
      const urlParams = new URLSearchParams(window.location.search);
      const initialStatus = urlParams.get('status') || 'All';
      return <InvoicesPage onNavigate={navigate} initialStatus={initialStatus} />;
    }

    // 5. Clients
    if (currentPath.startsWith('/clients')) {
      return <ClientsPage onNavigate={navigate} />;
    }

    // 6. Recurring
    if (currentPath.startsWith('/recurring')) {
      return <RecurringPage onNavigate={navigate} />;
    }

    // 7. Settings
    if (currentPath.startsWith('/settings')) {
      return <SettingsPage />;
    }

    return <DashboardPage onNavigate={navigate} />;
  };

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigate}>
      {renderCurrentPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
