import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Radio,
  Wrench,
  CalendarCheck,
  AlertTriangle,
  MessageSquareHeart,
  X,
} from 'lucide-react';
import type { NotificationType, ShopNotification, UserAccount } from '../types/shop';
import { filterNotificationsForUser } from '../utils/shopLogic';

interface NotificationCenterProps {
  currentUser: UserAccount;
  notifications: ShopNotification[];
  wsConnected: boolean;
  latestToast: ShopNotification | null;
  onDismissToast: () => void;
  onMarkAllRead: () => Promise<void>;
  onTriggerLiveNotification: (type: NotificationType) => Promise<void>;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentUser,
  notifications,
  wsConnected,
  latestToast,
  onDismissToast,
  onMarkAllRead,
  onTriggerLiveNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all');
  const [sendingType, setSendingType] = useState<NotificationType | null>(null);

  const roleNotifications = filterNotificationsForUser(
    notifications,
    currentUser.role,
    currentUser.customerId
  );

  const unreadCount = roleNotifications.filter(
    (n) => !n.readByUserIds.includes(currentUser.id)
  ).length;

  const filteredNotifications = roleNotifications.filter((n) =>
    typeFilter === 'all' ? true : n.type === typeFilter
  );

  const handleTrigger = async (type: NotificationType) => {
    setSendingType(type);
    try {
      await onTriggerLiveNotification(type);
    } finally {
      setSendingType(null);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment_confirmed':
        return <CalendarCheck className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'repair_status_changed':
        return <Wrench className="w-4 h-4 text-orange-400 shrink-0" />;
      case 'low_stock_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'new_feedback':
        return <MessageSquareHeart className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'appointment_confirmed':
        return 'Appointment Confirmed';
      case 'repair_status_changed':
        return 'Repair Status Update';
      case 'low_stock_alert':
        return 'Low Stock Alert';
      case 'new_feedback':
        return 'Customer Feedback';
    }
  };

  return (
    <div className="relative">
      {/* Real-time Notification Trigger Button */}
      <button
        id="notification-center-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
      >
        <Bell className="w-4 h-4 text-orange-500" />
        <span className="hidden sm:inline">Notifications</span>
        <span className="font-mono tabular-nums text-xs font-semibold text-orange-400">
          ({unreadCount})
        </span>
      </button>

      {/* Live WebSocket Toast Banner */}
      {latestToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2rem)] bg-neutral-900 border border-orange-500/60 rounded-xl p-4 shadow-2xl text-neutral-100"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {getTypeIcon(latestToast.type)}
              <div>
                <div className="text-xs text-orange-400 font-medium">
                  Real-Time WebSocket Event · {getTypeLabel(latestToast.type)}
                </div>
                <p className="text-sm font-semibold text-white mt-0.5">{latestToast.title}</p>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  {latestToast.message}
                </p>
                <div className="text-[11px] text-neutral-400 mt-2 font-mono tabular-nums">
                  <span>{latestToast.createdAt}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Visible to: {latestToast.targetRoles.join(', ')}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissToast}
              aria-label="Dismiss notification toast"
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notification Center Dropdown Drawer */}
      {isOpen && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-12 z-50 w-[calc(100vw-1.5rem)] sm:w-[440px] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
            <div>
              <h3 className="text-sm font-semibold text-white">Real-Time Notification Center</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Role Filter: <span className="text-orange-400 font-medium uppercase">{currentUser.role}</span>
                <span aria-hidden="true"> · </span>
                <span>{wsConnected ? 'WebSocket Connected' : 'Reconnecting...'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMarkAllRead}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 transition-colors whitespace-nowrap shrink-0"
              >
                <CheckCheck className="w-3.5 h-3.5 text-orange-400" />
                <span>Mark all read</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Notification Center"
                className="p-1.5 text-neutral-400 hover:text-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-2 bg-neutral-950/60 border-b border-neutral-800 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'appointment_confirmed', label: 'Appointments' },
                { id: 'repair_status_changed', label: 'Repairs' },
                { id: 'low_stock_alert', label: 'Low Stock' },
                { id: 'new_feedback', label: 'Feedback' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  typeFilter === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Live WebSocket Event Simulator / Dispatcher */}
          <div className="px-4 py-2.5 bg-neutral-950/90 border-b border-neutral-800">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium text-neutral-300">
                <Radio className="w-3.5 h-3.5 text-orange-500" />
                Broadcast Live WebSocket Event:
              </span>
              <span>Instant multi-client push</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={sendingType !== null}
                onClick={() => handleTrigger('appointment_confirmed')}
                className="px-2.5 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-left text-neutral-200 transition-colors truncate"
              >
                + Confirm Appointment
              </button>
              <button
                type="button"
                disabled={sendingType !== null}
                onClick={() => handleTrigger('repair_status_changed')}
                className="px-2.5 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-left text-neutral-200 transition-colors truncate"
              >
                + Update Repair Status
              </button>
              <button
                type="button"
                disabled={sendingType !== null}
                onClick={() => handleTrigger('low_stock_alert')}
                className="px-2.5 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-left text-neutral-200 transition-colors truncate"
              >
                + Low Stock Alert
              </button>
              <button
                type="button"
                disabled={sendingType !== null}
                onClick={() => handleTrigger('new_feedback')}
                className="px-2.5 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-left text-neutral-200 transition-colors truncate"
              >
                + New Customer Feedback
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 px-6 text-center">
                <p className="text-sm font-medium text-neutral-300">
                  No notifications for this filter
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Role-targeted events for {currentUser.role.toUpperCase()} will appear here in real time.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUnread = !item.readByUserIds.includes(currentUser.id);
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors ${
                      isUnread ? 'bg-orange-500/5' : 'bg-neutral-900'
                    } hover:bg-neutral-800/60`}
                  >
                    <div className="flex items-start gap-2.5">
                      {getTypeIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-orange-400">
                            {getTypeLabel(item.type)}
                            {isUnread ? ' · Unread' : ''}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-neutral-400 shrink-0">
                            {item.createdAt}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white mt-0.5">{item.title}</p>
                        <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                          {item.message}
                        </p>
                        <div className="text-[11px] text-neutral-400 mt-1.5">
                          <span>Ref: {item.referenceId || 'SYS'}</span>
                          <span aria-hidden="true"> · </span>
                          <span>Roles: {item.targetRoles.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
