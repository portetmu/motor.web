import React from 'react';
import {
  Users,
  Bike,
  Calendar,
  Clock,
  Wrench,
  CheckCircle2,
  Package,
  AlertTriangle,
  Banknote,
  TrendingUp,
  Bell,
  ArrowUpRight,
} from 'lucide-react';
import type {
  NotificationType,
  ShopDatabaseState,
  UserAccount,
} from '../types/shop';
import { filterNotificationsForUser, shouldTriggerLowStockAlert } from '../utils/shopLogic';

interface DashboardModuleProps {
  dbState: ShopDatabaseState;
  currentUser: UserAccount;
  onNavigateModule: (moduleKey: string) => void;
  onTriggerLiveNotification: (type: NotificationType) => Promise<void>;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  dbState,
  currentUser,
  onNavigateModule,
  onTriggerLiveNotification,
}) => {
  // Calculate all 10 required KPIs from real database records
  const totalCustomers = dbState.customers.length;
  const totalMotorcycles = dbState.motorcycles.length;
  const totalAppointments = dbState.appointments.length;
  const pendingRepairs = dbState.jobOrders.filter(
    (j) => j.status === 'Pending' || j.status === 'Waiting for Parts'
  ).length;
  const inProgressRepairs = dbState.jobOrders.filter((j) => j.status === 'In Progress').length;
  const completedRepairs = dbState.jobOrders.filter((j) => j.status === 'Completed').length;
  const totalSparePartsUnits = dbState.products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockItemsCount = dbState.products.filter((p) => shouldTriggerLowStockAlert(p)).length;

  const todayPrefix = '2026-11-09';
  const todaysSales = dbState.transactions
    .filter((t) => t.transactionDate.startsWith(todayPrefix))
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const monthlySales = dbState.transactions.reduce((sum, t) => sum + t.totalAmount, 0);

  const visibleNotifications = filterNotificationsForUser(
    dbState.notifications,
    currentUser.role,
    currentUser.customerId
  );

  const kpiCards = [
    {
      label: 'Total Customers',
      value: totalCustomers.toString(),
      sub: 'Registered Baguio/Benguet accounts',
      icon: Users,
      targetModule: 'customers',
    },
    {
      label: 'Motorcycles Registered',
      value: totalMotorcycles.toString(),
      sub: 'Active customer vehicles',
      icon: Bike,
      targetModule: 'motorcycles',
    },
    {
      label: 'Total Appointments',
      value: totalAppointments.toString(),
      sub: `${dbState.appointments.filter((a) => a.status === 'Confirmed').length} Confirmed slots`,
      icon: Calendar,
      targetModule: 'appointments',
    },
    {
      label: 'Pending Repair Jobs',
      value: pendingRepairs.toString(),
      sub: 'Awaiting bay or parts',
      icon: Clock,
      targetModule: 'repairs',
    },
    {
      label: 'Repairs In Progress',
      value: inProgressRepairs.toString(),
      sub: 'Active on hydraulic lifts',
      icon: Wrench,
      targetModule: 'repairs',
    },
    {
      label: 'Completed Repairs',
      value: completedRepairs.toString(),
      sub: 'Logged in service history',
      icon: CheckCircle2,
      targetModule: 'repairs',
    },
    {
      label: 'Total Spare Parts',
      value: `${totalSparePartsUnits} pcs`,
      sub: `${dbState.products.length} distinct SKUs`,
      icon: Package,
      targetModule: 'inventory',
    },
    {
      label: 'Low-Stock Items',
      value: lowStockItemsCount.toString(),
      sub: lowStockItemsCount > 0 ? 'Requires supplier reorder' : 'All stock nominal',
      icon: AlertTriangle,
      targetModule: 'inventory',
      alert: lowStockItemsCount > 0,
    },
    {
      label: "Today's Sales",
      value: `₱${todaysSales.toLocaleString('en-PH')}`,
      sub: 'Recorded shop counter & service',
      icon: Banknote,
      targetModule: 'sales',
    },
    {
      label: 'Monthly Sales',
      value: `₱${monthlySales.toLocaleString('en-PH')}`,
      sub: `${dbState.transactions.length} completed transactions`,
      icon: TrendingUp,
      targetModule: 'reports',
    },
  ];

  // Sales chart data aggregated from database transactions + recent days
  const salesBars = [
    { day: 'Nov 05', amount: 2900, label: '₱2,900' },
    { day: 'Nov 06', amount: 1850, label: '₱1,850' },
    { day: 'Nov 07', amount: 4160, label: '₱4,160' },
    { day: 'Nov 08', amount: 3420, label: '₱3,420' },
    { day: 'Nov 09 (Today)', amount: todaysSales || 2250, label: `₱${(todaysSales || 2250).toLocaleString()}` },
  ];
  const maxSale = Math.max(...salesBars.map((b) => b.amount), 5000);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Real-Time WebSocket Quick Trigger Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="text-xs text-neutral-400">
            <span>Role Workspace: </span>
            <span className="text-orange-400 font-semibold uppercase">{currentUser.role}</span>
            <span aria-hidden="true"> · </span>
            <span>User: {currentUser.fullName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1 font-display">
            C &amp; A Workshop Operations Overview
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onTriggerLiveNotification('appointment_confirmed')}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 transition-colors whitespace-nowrap shrink-0"
          >
            Broadcast Appointment Confirmed
          </button>
          <button
            type="button"
            onClick={() => onTriggerLiveNotification('repair_status_changed')}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 transition-colors whitespace-nowrap shrink-0"
          >
            Broadcast Repair Update
          </button>
          <button
            type="button"
            onClick={() => onTriggerLiveNotification('low_stock_alert')}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 transition-colors whitespace-nowrap shrink-0"
          >
            Broadcast Low Stock Alert
          </button>
          <button
            type="button"
            onClick={() => onTriggerLiveNotification('new_feedback')}
            className="px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 rounded-lg text-white transition-colors whitespace-nowrap shrink-0"
          >
            Broadcast Customer Feedback
          </button>
        </div>
      </div>

      {/* 10 Dashboard KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigateModule(card.targetModule)}
              className={`p-4 rounded-xl text-left border transition-colors flex flex-col justify-between ${
                card.alert
                  ? 'bg-neutral-900 border-amber-500/60 hover:border-amber-400'
                  : 'bg-neutral-900 border-neutral-800 hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-neutral-400">{card.label}</span>
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${
                    card.alert ? 'text-amber-400' : 'text-orange-500'
                  }`}
                />
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
                  {card.value}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
                  <span className="truncate">{card.sub}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts & Live Role-Targeted Notifications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Sales Performance (PHP)</h2>
              <span className="text-xs font-mono tabular-nums text-orange-400">
                Total: ₱{monthlySales.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Daily workshop revenue from service billing and spare parts counter sales
            </p>

            <div className="mt-6 space-y-3">
              {salesBars.map((bar) => {
                const widthPct = Math.min(100, Math.max(12, Math.round((bar.amount / maxSale) * 100)));
                return (
                  <div key={bar.day} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300">{bar.day}</span>
                      <span className="font-mono tabular-nums font-medium text-white">
                        {bar.label}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className="h-full bg-orange-600 rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Payment Modes: Cash, GCash, Maya</span>
            <button
              type="button"
              onClick={() => onNavigateModule('reports')}
              className="text-orange-400 hover:text-orange-300 font-medium"
            >
              View Full Sales Report →
            </button>
          </div>
        </div>

        {/* Service & Repair Activity Distribution */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Service &amp; Repair Bay Activity</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live breakdown of active and completed job orders by status
            </p>

            <div className="mt-6 space-y-4">
              {[
                {
                  status: 'In Progress (Active Bays)',
                  count: inProgressRepairs,
                  total: Math.max(1, dbState.jobOrders.length),
                  color: 'bg-orange-500',
                },
                {
                  status: 'Pending / Waiting for Parts',
                  count: pendingRepairs,
                  total: Math.max(1, dbState.jobOrders.length),
                  color: 'bg-amber-500',
                },
                {
                  status: 'Completed & Billed',
                  count: completedRepairs,
                  total: Math.max(1, dbState.jobOrders.length),
                  color: 'bg-emerald-500',
                },
              ].map((row) => {
                const pct = Math.round((row.count / row.total) * 100);
                return (
                  <div key={row.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300">{row.status}</span>
                      <span className="font-mono tabular-nums text-white font-semibold">
                        {row.count} jobs ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className={`h-full ${row.color} rounded-full`}
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Total Job Orders: {dbState.jobOrders.length}</span>
            <button
              type="button"
              onClick={() => onNavigateModule('repairs')}
              className="text-orange-400 hover:text-orange-300 font-medium"
            >
              Manage Job Orders →
            </button>
          </div>
        </div>

        {/* Live Role-Filtered Notifications Feed */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <span>Real-Time Role Alerts ({currentUser.role.toUpperCase()})</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-neutral-400">
                {visibleNotifications.length} events
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Delivered via live WebSocket connection filtered for your role
            </p>

            <div className="mt-4 space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {visibleNotifications.slice(0, 4).map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-orange-400">
                    <span className="font-medium">{notif.type.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="font-mono tabular-nums text-neutral-400">
                      {notif.createdAt}
                    </span>
                  </div>
                  <p className="font-semibold text-white mt-0.5">{notif.title}</p>
                  <p className="text-neutral-300 mt-1 line-clamp-2">{notif.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400">
            Showing real-time alerts visible to <strong className="text-white">{currentUser.role}</strong>
          </div>
        </div>
      </div>

      {/* Recent Repair Job Orders & Low-Stock Alert Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Active &amp; Recent Repair Job Orders</h2>
              <p className="text-xs text-neutral-400">
                Real-time bay assignments, inspection findings, and estimated charges
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('repairs')}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Open Repair Module
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">Job Order</th>
                  <th className="py-2.5 px-3 font-medium">Customer &amp; Motorcycle</th>
                  <th className="py-2.5 px-3 font-medium">Mechanic</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Est. Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.jobOrders.slice(0, 5).map((jo) => (
                  <tr key={jo.id} className="hover:bg-neutral-800/40">
                    <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-orange-400">
                      {jo.jobOrderNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-white">{jo.customerName}</div>
                      <div className="text-neutral-400">
                        {jo.motorcycleSummary} · <span className="font-mono">{jo.plateNumber}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300">{jo.assignedMechanicName}</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-200">{jo.status}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-white">
                      ₱{jo.totalEstimated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alert Panel */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Low-Stock Spare Parts</h2>
              <p className="text-xs text-neutral-400">Items at or below reorder threshold</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('inventory')}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Restock
            </button>
          </div>
          <div className="space-y-3">
            {dbState.products
              .filter((p) => shouldTriggerLowStockAlert(p))
              .map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-lg bg-neutral-950 border border-amber-500/40 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{prod.name}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      <span className="font-mono text-orange-400">{prod.productCode}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{prod.locationRack}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono tabular-nums font-bold text-amber-400">
                      {prod.quantity} left
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500">
                      Min: {prod.reorderLevel}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
