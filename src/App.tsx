import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PinModal } from './components/PinModal';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { LicensesPage } from './pages/LicensesPage';
import { AssignLicensePage } from './pages/AssignLicensePage';
import { ImportLicensesPage } from './pages/ImportLicensesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { DashboardStats } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // PIN security state
  const [isLocked, setIsLocked] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        setCheckingPin(true);
        const settings = await api.getSettings();
        if (settings.require_pin_on_startup === 'true' && settings.admin_pin_hash) {
          setIsLocked(true);
          setPinRequired(true);
        }
        await fetchDashboardStats();
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingPin(false);
      }
    };
    initApp();
  }, []);

  const handleNavigate = (tab: string, customerId?: number) => {
    if (tab === 'customers' && customerId) {
      setSelectedCustomerId(customerId);
      setActiveTab('customer-detail');
    } else {
      if (tab !== 'customer-detail') {
        setSelectedCustomerId(null);
      }
      setActiveTab(tab);
    }
    fetchDashboardStats();
  };

  const handleGlobalSearch = (query: string) => {
    setGlobalSearch(query);
    if (query.trim() && activeTab !== 'customers' && activeTab !== 'licenses') {
      setActiveTab('customers');
    }
  };

  const handleSelectCustomer = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setActiveTab('customer-detail');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased select-none overflow-hidden">
      {/* Collapsible/Responsive Left Sidebar */}
      <Sidebar
        activeTab={activeTab === 'customer-detail' ? 'customers' : activeTab}
        currentTab={activeTab === 'customer-detail' ? 'customers' : activeTab}
        onNavigate={(tab) => handleNavigate(tab)}
        onSelectTab={(tab) => handleNavigate(tab)}
        availableCount={stats?.availableLicenses ?? 0}
        onLock={() => setIsLocked(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          currentTab={activeTab}
          globalSearch={globalSearch}
          onSearch={handleGlobalSearch}
          onSearchChange={handleGlobalSearch}
          onQuickAssign={() => handleNavigate('assign')}
          onNewAssignment={() => handleNavigate('assign')}
          onImportKeys={() => handleNavigate('import')}
          onRefresh={() => fetchDashboardStats()}
          onLock={() => setIsLocked(true)}
          availableCount={stats?.availableLicenses ?? 0}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={(tab, customerId) => handleNavigate(tab, customerId)}
              onRefreshTrigger={() => fetchDashboardStats()}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersPage
              onSelectCustomer={handleSelectCustomer}
              onNavigate={(tab) => handleNavigate(tab)}
              globalSearchQuery={globalSearch}
            />
          )}

          {activeTab === 'customer-detail' && selectedCustomerId && (
            <CustomerDetailPage
              customerId={selectedCustomerId}
              onBack={() => handleNavigate('customers')}
            />
          )}

          {activeTab === 'licenses' && (
            <LicensesPage
              onNavigate={(tab, customerId) => handleNavigate(tab, customerId)}
              globalSearchQuery={globalSearch}
            />
          )}

          {activeTab === 'assign' && (
            <AssignLicensePage
              onSuccess={() => fetchDashboardStats()}
              onNavigate={(tab, customerId) => handleNavigate(tab, customerId)}
            />
          )}

          {activeTab === 'import' && (
            <ImportLicensesPage
              onSuccess={() => fetchDashboardStats()}
              onNavigate={(tab) => handleNavigate(tab)}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsPage
              onNavigateCustomer={(customerId) => handleNavigate('customers', customerId)}
            />
          )}

          {activeTab === 'reports' && <ReportsPage />}

          {(activeTab === 'audit' || activeTab === 'audit-logs') && <AuditLogsPage />}

          {activeTab === 'settings' && (
            <SettingsPage onSuccess={() => fetchDashboardStats()} />
          )}
        </main>
      </div>

      {/* PIN Lock Security Screen */}
      <PinModal
        isOpen={isLocked}
        title="Admin Security Lock"
        description="Enter your 4+ digit Admin PIN to access the License Manager."
        onSuccess={() => setIsLocked(false)}
      />
    </div>
  );
}
