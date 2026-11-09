import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateJobOrderTotals,
  calculateStockUpdate,
  filterNotificationsForUser,
  getTargetRolesForNotificationType,
  hasAppointmentConflict,
  shouldTriggerLowStockAlert,
} from './shopLogic';
import type { Appointment, ShopNotification } from '../types/shop';

test('getTargetRolesForNotificationType assigns appropriate role visibility', () => {
  assert.deepEqual(getTargetRolesForNotificationType('appointment_confirmed'), [
    'admin',
    'owner',
    'cashier',
    'customer',
  ]);
  assert.deepEqual(getTargetRolesForNotificationType('repair_status_changed'), [
    'admin',
    'owner',
    'cashier',
    'mechanic',
    'customer',
  ]);
  assert.deepEqual(getTargetRolesForNotificationType('low_stock_alert'), [
    'admin',
    'owner',
    'cashier',
  ]);
  assert.deepEqual(getTargetRolesForNotificationType('new_feedback'), ['admin', 'owner']);
});

test('filterNotificationsForUser enforces role and customer isolation', () => {
  const sampleNotifications: ShopNotification[] = [
    {
      id: 'n1',
      type: 'low_stock_alert',
      title: 'Low Stock: Brake Pads',
      message: 'Only 2 sets remaining',
      targetRoles: ['admin', 'owner', 'cashier'],
      severity: 'warning',
      createdAt: '2026-11-09T08:00:00Z',
      readByUserIds: [],
    },
    {
      id: 'n2',
      type: 'repair_status_changed',
      title: 'Repair In Progress',
      message: 'JO-2026-001 is now In Progress',
      targetRoles: ['admin', 'owner', 'cashier', 'mechanic', 'customer'],
      targetCustomerId: 101,
      severity: 'info',
      createdAt: '2026-11-09T08:05:00Z',
      readByUserIds: [],
    },
    {
      id: 'n3',
      type: 'new_feedback',
      title: 'New 5-Star Feedback',
      message: 'Great service!',
      targetRoles: ['admin', 'owner'],
      severity: 'success',
      createdAt: '2026-11-09T08:10:00Z',
      readByUserIds: [],
    },
  ];

  // Mechanic only sees repair_status_changed
  const mechanicList = filterNotificationsForUser(sampleNotifications, 'mechanic');
  assert.equal(mechanicList.length, 1);
  assert.equal(mechanicList[0].id, 'n2');

  // Owner sees all 3
  const ownerList = filterNotificationsForUser(sampleNotifications, 'owner');
  assert.equal(ownerList.length, 3);

  // Customer 101 sees their repair update, Customer 202 does not
  const cust101 = filterNotificationsForUser(sampleNotifications, 'customer', 101);
  assert.equal(cust101.length, 1);
  assert.equal(cust101[0].id, 'n2');

  const cust202 = filterNotificationsForUser(sampleNotifications, 'customer', 202);
  assert.equal(cust202.length, 0);
});

test('shouldTriggerLowStockAlert triggers when quantity is at or below reorderLevel', () => {
  assert.equal(shouldTriggerLowStockAlert({ quantity: 3, reorderLevel: 5 }), true);
  assert.equal(shouldTriggerLowStockAlert({ quantity: 5, reorderLevel: 5 }), true);
  assert.equal(shouldTriggerLowStockAlert({ quantity: 6, reorderLevel: 5 }), false);
});

test('calculateJobOrderTotals computes accurate service, parts, labor, and discount totals', () => {
  const result = calculateJobOrderTotals(
    [
      { serviceId: 1, serviceName: 'Full Periodic Maintenance', price: 1200 },
      { serviceId: 2, serviceName: 'FI Throttle Body Cleaning', price: 650 },
    ],
    [
      { productId: 10, productCode: 'PRD-001', productName: 'Motul 7100 10W-40', quantity: 2, unitPrice: 780 },
    ],
    450,
    100
  );

  assert.equal(result.serviceCharges, 1850);
  assert.equal(result.sparePartsCosts, 1560);
  assert.equal(result.laborCharges, 450);
  assert.equal(result.discountAmount, 100);
  assert.equal(result.totalAmount, 3760);
});

test('hasAppointmentConflict detects duplicate motorcycle and bay capacity conflicts', () => {
  const existing: Appointment[] = [
    {
      id: 1,
      appointmentNumber: 'APT-2026-001',
      customerId: 1,
      customerName: 'Juan Dela Cruz',
      customerPhone: '09171234567',
      motorcycleId: 10,
      motorcycleSummary: 'Yamaha NMAX 155',
      plateNumber: 'CAR-1024',
      serviceId: 1,
      serviceName: 'PMS Tune-Up',
      preferredDate: '2026-11-12',
      preferredTime: '09:00',
      reportedProblem: 'Hard starting in cold Baguio mornings',
      assignedMechanicId: 4,
      assignedMechanicName: 'Rodel Dalisay',
      status: 'Confirmed',
      createdAt: '2026-11-09T01:00:00Z',
    },
  ];

  // Same motorcycle at same date/time conflicts
  const dupMoto = hasAppointmentConflict(existing, '2026-11-12', '09:00', 10);
  assert.equal(dupMoto.conflict, true);

  // Different motorcycle at same date/time with different mechanic is allowed (since < 3 bays)
  const diffMoto = hasAppointmentConflict(existing, '2026-11-12', '09:00', 11, 5);
  assert.equal(diffMoto.conflict, false);
});

test('calculateStockUpdate prevents negative inventory', () => {
  const valid = calculateStockUpdate(10, -4);
  assert.equal(valid.ok, true);
  assert.equal(valid.newStock, 6);

  const invalid = calculateStockUpdate(2, -5);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.newStock, 2);
});
