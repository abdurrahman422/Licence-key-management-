import React from 'react';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  UserPlus,
  FileDown,
  CreditCard,
  BarChart3,
  ScrollText,
  Settings,
  Shield,
  Sun,
  Moon,
  Sparkles,
  Lock
} from 'lucide-react';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  availableCount?: number;
  isLocked?: boolean;
  onLock?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  companyName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  onNavigate,
  availableCount = 0,
  onLock = () => {},
  theme = 'dark',
  onToggleTheme = () => {},
  companyName = 'License Manager'
}) => {
  const selectedTab = currentTab || activeTab || 'dashboard';

  const handleTabClick = (tabId: string) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tabId);
    } else if (typeof onNavigate === 'function') {
      onNavigate(tabId);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'licenses', label: 'License Inventory', icon: KeyRound, badge: availableCount > 0 ? `${availableCount} avail` : '0 avail' },
    { id: 'assign', label: 'Assign License', icon: UserPlus, highlight: true },
    { id: 'import', label: 'Import Keys', icon: FileDown },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-64 flex-shrink-0 flex flex-col justify-between border-r transition-colors duration-200 select-none bg-slate-900 border-slate-800 text-slate-200"
    >
      {/* Top Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-white">{companyName || 'License Manager'}</h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] text-slate-400 font-medium">Offline SQLite Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : item.highlight
                    ? 'bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 hover:text-white border border-indigo-800/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : availableCount > 0
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls & security */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {/* Quick Inventory Pulse Indicator */}
        <div className="px-3 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="font-medium">Inventory Status</span>
            <span className="font-mono text-emerald-400 font-semibold">{availableCount} available</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(availableCount > 0 ? 10 : 0, (availableCount / 50) * 100))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            id="lock-app-btn"
            onClick={onLock}
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition"
            title="Lock Admin Session"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Screen</span>
          </button>

          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
