import React, { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Bike,
  Calendar,
  Wrench,
  Package,
  CreditCard,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  ScrollText,
  LogOut,
  Globe,
  Star,
  User,
  Menu,
  X,
} from 'lucide-react';
import { INITIAL_SHOP_DATABASE } from './data/seedDatabase';
import type {
  NotificationType,
  ShopDatabaseState,
  ShopNotification,
  UserAccount,
  UserRole,
} from './types/shop';
import { filterNotificationsForUser } from './utils/shopLogic';
import { NotificationCenter } from './components/NotificationCenter';
import { PublicWebsite, type PublicPageTab } from './components/PublicWebsite';
import { DashboardModule } from './components/DashboardModule';
import { OperationsModules } from './components/OperationsModules';
import { InventoryBillingReportsModules } from './components/InventoryBillingReportsModules';
import { CustomerPortal, type CustomerPortalTab } from './components/CustomerPortal';

export default function App() {
  const [dbState, setDbState] = useState<ShopDatabaseState>(INITIAL_SHOP_DATABASE);
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_SHOP_DATABASE.users[0]);
  const [viewMode, setViewMode] = useState<'portal' | 'public'>('portal');
  const [publicPage, setPublicPage] = useState<PublicPageTab>('home');
  const [activeStaffModule, setActiveStaffModule] = useState<string>('dashboard');
  const [activeCustomerTab, setActiveCustomerTab] =
    useState<CustomerPortalTab>('cust_dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real-time WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [latestToast, setLatestToast] = useState<ShopNotification | null>(null);
  const currentUserRef = useRef<UserAccount>(currentUser);
  currentUserRef.current = currentUser;

  // Fetch initial state & connect to WebSocket
  useEffect(() => {
    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.users)) {
          setDbState(data);
        }
      })
      .catch(() => {});

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'init' && Array.isArray(payload.notifications)) {
            setDbState((prev) => ({
              ...prev,
              notifications: payload.notifications,
            }));
          } else if (payload.event === 'notification:created' && payload.notification) {
            const incoming: ShopNotification = payload.notification;
            if (payload.state) {
              setDbState(payload.state);
            } else {
              setDbState((prev) => {
                if (prev.notifications.some((n) => n.id === incoming.id)) return prev;
                return {
                  ...prev,
                  notifications: [incoming, ...prev.notifications],
                };
              });
            }

            // Show real-time toast if visible to current logged-in role
            const activeUser = currentUserRef.current;
            const visible = filterNotificationsForUser(
              [incoming],
              activeUser.role,
              activeUser.customerId
            );
            if (visible.length > 0) {
              setLatestToast(incoming);
            }
          } else if (payload.event === 'state:updated' && payload.state) {
            setDbState(payload.state);
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 2500);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const handleRoleSwitch = async (role: UserRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleSwitch: role }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setDbState(data.state);
        setViewMode('portal');
        if (data.user.role === 'customer') {
          setActiveCustomerTab('cust_dashboard');
        } else if (data.user.role === 'mechanic') {
          setActiveStaffModule('repairs');
        } else {
          setActiveStaffModule('dashboard');
        }
      }
    } catch {
      const fallback = dbState.users.find((u) => u.role === role);
      if (fallback) setCurrentUser(fallback);
    }
  };

  const handleTriggerLiveNotification = async (type: NotificationType) => {
    const res = await fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      setDbState(data.state);
      if (data.notification) {
        const visible = filterNotificationsForUser(
          [data.notification],
          currentUser.role,
          currentUser.customerId
        );
        if (visible.length > 0) {
          setLatestToast(data.notification);
        }
      }
    }
  };

  const handleMarkAllRead = async () => {
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      setDbState(data.state);
    }
  };

  const handleRegisterCustomerFromPublic = async (payload: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    barangayCity: string;
    username: string;
  }) => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, createPortalAccount: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    setDbState(data.state);
    if (data.user) {
      setCurrentUser(data.user);
      setViewMode('portal');
      setActiveCustomerTab('cust_dashboard');
    }
  };

  // Render Public Website if user switched to Public View
  if (viewMode === 'public') {
    return (
      <PublicWebsite
        activePage={publicPage}
        onNavigate={(page) => setPublicPage(page)}
        dbState={dbState}
        onLoginSuccess={(user, updatedState) => {
          setCurrentUser(user);
          setDbState(updatedState);
          setViewMode('portal');
          if (user.role === 'customer') {
            setActiveCustomerTab('cust_dashboard');
          } else {
            setActiveStaffModule('dashboard');
          }
        }}
        onRegisterCustomer={handleRegisterCustomerFromPublic}
      />
    );
  }

  // Define Sidebar Navigation items filtered by Role permissions
  const staffNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
      roles: ['admin', 'owner', 'cashier', 'mechanic'] as UserRole[],
    },
    {
      id: 'customers',
      label: 'Customer Management',
      icon: Users,
      roles: ['admin', 'owner', 'cashier'] as UserRole[],
    },
    {
      id: 'motorcycles',
      label: 'Motorcycle Registry',
      icon: Bike,
      roles: ['admin', 'owner', 'cashier', 'mechanic'] as UserRole[],
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['admin', 'owner', 'cashier', 'mechanic'] as UserRole[],
    },
    {
      id: 'repairs',
      label: 'Repair & Maintenance',
      icon: Wrench,
      roles: ['admin', 'owner', 'cashier', 'mechanic'] as UserRole[],
    },
    {
      id: 'inventory',
      label: 'Spare Parts Inventory',
      icon: Package,
      roles: ['admin', 'owner', 'cashier', 'mechanic'] as UserRole[],
    },
    {
      id: 'billing',
      label: 'Billing & Payments',
      icon: CreditCard,
      roles: ['admin', 'owner', 'cashier'] as UserRole[],
    },
    {
      id: 'sales',
      label: 'Sales & Transactions',
      icon: Receipt,
      roles: ['admin', 'owner', 'cashier'] as UserRole[],
    },
    {
      id: 'reports',
      label: 'Business Reports',
      icon: BarChart3,
      roles: ['admin', 'owner'] as UserRole[],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: UserCog,
      roles: ['admin'] as UserRole[],
    },
    {
      id: 'logs',
      label: 'Activity Audit Logs',
      icon: ScrollText,
      roles: ['admin', 'owner'] as UserRole[],
    },
    {
      id: 'settings',
      label: 'Settings & XAMPP SQL',
      icon: Settings,
      roles: ['admin', 'owner'] as UserRole[],
    },
  ].filter((item) => item.roles.includes(currentUser.role));

  const customerNavItems: Array<{
    id: CustomerPortalTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'cust_dashboard', label: 'Customer Dashboard', icon: LayoutDashboard },
    { id: 'cust_motorcycles', label: 'My Motorcycles', icon: Bike },
    { id: 'cust_book', label: 'Book an Appointment', icon: Calendar },
    { id: 'cust_appointments', label: 'My Appointments', icon: Calendar },
    { id: 'cust_tracking', label: 'Live Repair Tracking', icon: Wrench },
    { id: 'cust_history', label: 'Service History', icon: ScrollText },
    { id: 'cust_receipts', label: 'Digital Receipts', icon: Receipt },
    { id: 'cust_feedback', label: 'Submit Feedback', icon: Star },
    { id: 'cust_account', label: 'My Account', icon: User },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex">
      {/* Sidebar Navigation (260px Desktop + Slide-over Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between transition-transform lg:static lg:translate-x-0 no-print ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white font-display text-sm">
                C&amp;A
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight font-display">
                  C &amp; A MotoShop
                </div>
                <div className="text-[11px] text-neutral-400">Baguio City System</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close sidebar menu"
              className="lg:hidden text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Role Switcher inside Sidebar for testing all 5 roles seamlessly */}
          <div className="p-3.5 border-b border-neutral-800 bg-neutral-950/50">
            <label
              htmlFor="role-switcher-select"
              className="block text-[11px] font-medium text-neutral-400 mb-1.5"
            >
              Active Role Account (Switch to Test):
            </label>
            <select
              id="role-switcher-select"
              value={currentUser.role}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 border border-neutral-700 text-orange-400"
            >
              <option value="admin">A. Administrator (Arturo)</option>
              <option value="owner">B. Management / Owner (Clarissa)</option>
              <option value="cashier">C. Cashier / Front Desk (Maricar)</option>
              <option value="mechanic">D. Mechanic / Tech (Rodel)</option>
              <option value="customer">E. Customer Portal (Juanito)</option>
            </select>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)]">
            {currentUser.role === 'customer'
              ? customerNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeCustomerTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveCustomerTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-orange-600 text-white'
                          : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })
              : staffNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeStaffModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveStaffModule(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-orange-600 text-white'
                          : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
          </nav>
        </div>

        {/* Public Website & Logout Footer */}
        <div className="p-3 border-t border-neutral-800 space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setViewMode('public');
              setPublicPage('home');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Globe className="w-4 h-4 text-orange-500" />
            <span>Public Website &amp; Rate Card</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('public');
              setPublicPage('login');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-red-300 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out ({currentUser.username})</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 px-4 sm:px-6 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open sidebar navigation"
              className="lg:hidden p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="truncate">
              <span className="text-sm font-bold text-white font-display">
                C &amp; A Motorcycle Shop Management System
              </span>
              <span className="hidden md:inline text-xs text-neutral-400 ml-2">
                · Baguio City · {currentUser.fullName} ({currentUser.role.toUpperCase()})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Real-Time WebSocket Notification Center */}
            <NotificationCenter
              currentUser={currentUser}
              notifications={dbState.notifications}
              wsConnected={wsConnected}
              latestToast={latestToast}
              onDismissToast={() => setLatestToast(null)}
              onMarkAllRead={handleMarkAllRead}
              onTriggerLiveNotification={handleTriggerLiveNotification}
            />

            <button
              type="button"
              onClick={() => {
                setViewMode('public');
                setPublicPage('login');
              }}
              className="px-3 py-2 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Switch Account / Logout
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentUser.role === 'customer' ? (
            <CustomerPortal
              activeTab={activeCustomerTab}
              onSelectTab={(t) => setActiveCustomerTab(t)}
              currentUser={currentUser}
              dbState={dbState}
              onStateChange={setDbState}
            />
          ) : activeStaffModule === 'dashboard' ? (
            <DashboardModule
              dbState={dbState}
              currentUser={currentUser}
              onNavigateModule={(mod) => setActiveStaffModule(mod)}
              onTriggerLiveNotification={handleTriggerLiveNotification}
            />
          ) : activeStaffModule === 'customers' ||
            activeStaffModule === 'motorcycles' ||
            activeStaffModule === 'appointments' ||
            activeStaffModule === 'repairs' ? (
            <OperationsModules
              activeModule={activeStaffModule}
              dbState={dbState}
              currentUser={currentUser}
              onStateChange={setDbState}
              onNavigateModule={(mod) => setActiveStaffModule(mod)}
            />
          ) : (
            <InventoryBillingReportsModules
              activeModule={activeStaffModule as any}
              dbState={dbState}
              currentUser={currentUser}
              onStateChange={setDbState}
            />
          )}
        </main>
      </div>
    </div>
  );
}
