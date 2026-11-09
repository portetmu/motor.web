import type {
  Appointment,
  JobOrderPartLine,
  JobOrderServiceLine,
  NotificationType,
  Product,
  ShopNotification,
  UserRole,
} from '../types/shop';

/**
 * Determines which user roles should receive a specific real-time notification type.
 */
export function getTargetRolesForNotificationType(type: NotificationType): UserRole[] {
  switch (type) {
    case 'appointment_confirmed':
      return ['admin', 'owner', 'cashier', 'customer'];
    case 'repair_status_changed':
      return ['admin', 'owner', 'cashier', 'mechanic', 'customer'];
    case 'low_stock_alert':
      return ['admin', 'owner', 'cashier'];
    case 'new_feedback':
      return ['admin', 'owner'];
  }
}

/**
 * Filters notifications visible to a given user based on role and optional customer ownership.
 */
export function filterNotificationsForUser(
  notifications: ShopNotification[],
  role: UserRole,
  customerId?: number
): ShopNotification[] {
  return notifications.filter((notif) => {
    if (!notif.targetRoles.includes(role)) {
      return false;
    }
    if (role === 'customer' && notif.targetCustomerId !== undefined && customerId !== undefined) {
      return notif.targetCustomerId === customerId;
    }
    return true;
  });
}

/**
 * Checks whether a product's new stock level triggers a low-stock alert.
 */
export function shouldTriggerLowStockAlert(product: Pick<Product, 'quantity' | 'reorderLevel'>): boolean {
  return product.quantity <= product.reorderLevel;
}

/**
 * Calculates job order service, parts, labor, and grand total amounts.
 */
export function calculateJobOrderTotals(
  services: JobOrderServiceLine[],
  parts: JobOrderPartLine[],
  laborCharges: number,
  discountAmount = 0
): {
  serviceCharges: number;
  sparePartsCosts: number;
  laborCharges: number;
  discountAmount: number;
  totalAmount: number;
} {
  const serviceCharges = services.reduce((sum, s) => sum + Math.max(0, Number(s.price) || 0), 0);
  const sparePartsCosts = parts.reduce(
    (sum, p) => sum + Math.max(0, Number(p.quantity) || 0) * Math.max(0, Number(p.unitPrice) || 0),
    0
  );
  const cleanLabor = Math.max(0, Number(laborCharges) || 0);
  const cleanDiscount = Math.max(0, Number(discountAmount) || 0);
  const gross = serviceCharges + sparePartsCosts + cleanLabor;
  const totalAmount = Math.max(0, gross - cleanDiscount);

  return {
    serviceCharges,
    sparePartsCosts,
    laborCharges: cleanLabor,
    discountAmount: cleanDiscount,
    totalAmount,
  };
}

/**
 * Checks if a new appointment conflicts with existing active appointments on the same date, time, and mechanic/bay.
 */
export function hasAppointmentConflict(
  existingAppointments: Appointment[],
  preferredDate: string,
  preferredTime: string,
  motorcycleId?: number,
  assignedMechanicId?: number,
  excludeAppointmentId?: number
): { conflict: boolean; reason?: string } {
  const activeSameSlot = existingAppointments.filter(
    (apt) =>
      apt.id !== excludeAppointmentId &&
      apt.status !== 'Cancelled' &&
      apt.preferredDate === preferredDate &&
      apt.preferredTime === preferredTime
  );

  if (motorcycleId !== undefined && activeSameSlot.some((apt) => apt.motorcycleId === motorcycleId)) {
    return {
      conflict: true,
      reason: 'This motorcycle already has an active appointment at the selected date and time.',
    };
  }

  if (
    assignedMechanicId !== undefined &&
    activeSameSlot.some((apt) => apt.assignedMechanicId === assignedMechanicId)
  ) {
    return {
      conflict: true,
      reason: 'The assigned mechanic is already booked for another appointment at this time slot.',
    };
  }

  // Shop has 3 active service bays per time slot
  if (activeSameSlot.length >= 3) {
    return {
      conflict: true,
      reason: 'All 3 shop service bays are already booked for this date and time slot.',
    };
  }

  return { conflict: false };
}

/**
 * Applies a stock change and validates against negative inventory.
 */
export function calculateStockUpdate(
  currentStock: number,
  quantityDelta: number
): { ok: boolean; newStock: number; error?: string } {
  const next = currentStock + quantityDelta;
  if (next < 0) {
    return {
      ok: false,
      newStock: currentStock,
      error: `Insufficient stock available (current: ${currentStock}, requested deduction: ${Math.abs(quantityDelta)}).`,
    };
  }
  return { ok: true, newStock: next };
}
