import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  activityLogs,
  appointments,
  customers,
  employeeSchedules,
  feedback,
  inventoryMovements,
  invoices,
  jobOrders,
  motorcycles,
  notifications,
  products,
  services,
  suppliers,
  transactions,
  users,
} from './schema.ts';
import { INITIAL_SHOP_DATABASE } from '../data/seedDatabase.ts';
import type { ShopDatabaseState, ShopNotification, UserRole } from '../types/shop.ts';

let seededChecked = false;

export async function ensureSeededInCloudSql(): Promise<void> {
  if (seededChecked) return;
  try {
    const existingCustomers = await db.select().from(customers);
    if (existingCustomers.length > 0) {
      seededChecked = true;
      return;
    }

    // Seed initial users with deterministic Firebase-compatible UIDs
    for (const u of INITIAL_SHOP_DATABASE.users) {
      await db
        .insert(users)
        .values({
          uid: `seed-uid-${u.username}`,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          specialty: u.specialty || null,
          status: u.status,
          customerId: u.customerId || null,
          lastLogin: u.lastLogin,
          twoFactorEnabled: Boolean(u.twoFactorEnabled),
        })
        .onConflictDoNothing();
    }

    for (const c of INITIAL_SHOP_DATABASE.customers) {
      await db
        .insert(customers)
        .values({
          code: c.code,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email,
          address: c.address,
          barangayCity: c.barangayCity,
          dateRegistered: c.dateRegistered,
          status: c.status,
          notes: c.notes || '',
        })
        .onConflictDoNothing();
    }

    for (const m of INITIAL_SHOP_DATABASE.motorcycles) {
      await db
        .insert(motorcycles)
        .values({
          customerId: m.customerId,
          customerName: m.customerName,
          brand: m.brand,
          model: m.model,
          plateNumber: m.plateNumber,
          type: m.type,
          year: m.year,
          engineDisplacement: m.engineDisplacement,
          color: m.color,
          odometerKm: m.odometerKm,
          vinChassis: m.vinChassis,
        })
        .onConflictDoNothing();
    }

    for (const s of INITIAL_SHOP_DATABASE.services) {
      await db
        .insert(services)
        .values({
          code: s.code,
          name: s.name,
          category: s.category,
          description: s.description,
          basePrice: s.basePrice,
          estimatedDurationMins: s.estimatedDurationMins,
          isActive: s.isActive,
        })
        .onConflictDoNothing();
    }

    for (const sup of INITIAL_SHOP_DATABASE.suppliers) {
      await db
        .insert(suppliers)
        .values({
          code: sup.code,
          name: sup.name,
          contactPerson: sup.contactPerson,
          phone: sup.phone,
          email: sup.email,
          address: sup.address,
          categorySupplied: sup.categorySupplied,
          status: sup.status,
        })
        .onConflictDoNothing();
    }

    for (const p of INITIAL_SHOP_DATABASE.products) {
      await db
        .insert(products)
        .values({
          productCode: p.productCode,
          name: p.name,
          category: p.category,
          description: p.description,
          quantity: p.quantity,
          reorderLevel: p.reorderLevel,
          unitPrice: p.unitPrice,
          costPrice: p.costPrice,
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          locationRack: p.locationRack,
          dateAdded: p.dateAdded,
        })
        .onConflictDoNothing();
    }

    for (const a of INITIAL_SHOP_DATABASE.appointments) {
      await db
        .insert(appointments)
        .values({
          appointmentNumber: a.appointmentNumber,
          customerId: a.customerId,
          customerName: a.customerName,
          customerPhone: a.customerPhone,
          motorcycleId: a.motorcycleId,
          motorcycleSummary: a.motorcycleSummary,
          plateNumber: a.plateNumber,
          serviceId: a.serviceId,
          serviceName: a.serviceName,
          preferredDate: a.preferredDate,
          preferredTime: a.preferredTime,
          reportedProblem: a.reportedProblem,
          assignedMechanicId: a.assignedMechanicId || null,
          assignedMechanicName: a.assignedMechanicName || null,
          status: a.status,
          createdAt: a.createdAt,
        })
        .onConflictDoNothing();
    }

    for (const jo of INITIAL_SHOP_DATABASE.jobOrders) {
      await db
        .insert(jobOrders)
        .values({
          jobOrderNumber: jo.jobOrderNumber,
          appointmentId: jo.appointmentId || null,
          customerId: jo.customerId,
          customerName: jo.customerName,
          customerPhone: jo.customerPhone,
          motorcycleId: jo.motorcycleId,
          motorcycleSummary: jo.motorcycleSummary,
          plateNumber: jo.plateNumber,
          odometerKm: jo.odometerKm,
          reportedProblem: jo.reportedProblem,
          inspectionResults: jo.inspectionResults,
          assignedMechanicId: jo.assignedMechanicId,
          assignedMechanicName: jo.assignedMechanicName,
          servicesPerformedJson: JSON.stringify(jo.servicesPerformed),
          partsUsedJson: JSON.stringify(jo.partsUsed),
          laborCharges: jo.laborCharges,
          repairNotes: jo.repairNotes,
          dateReceived: jo.dateReceived,
          completionDate: jo.completionDate || null,
          status: jo.status,
          totalEstimated: jo.totalEstimated,
          invoiceId: jo.invoiceId || null,
        })
        .onConflictDoNothing();
    }

    for (const mov of INITIAL_SHOP_DATABASE.inventoryMovements) {
      await db.insert(inventoryMovements).values({
        productId: mov.productId,
        productCode: mov.productCode,
        productName: mov.productName,
        movementType: mov.movementType,
        quantityChange: mov.quantityChange,
        previousStock: mov.previousStock,
        newStock: mov.newStock,
        referenceCode: mov.referenceCode,
        performedBy: mov.performedBy,
        createdAt: mov.createdAt,
        notes: mov.notes || null,
      });
    }

    for (const inv of INITIAL_SHOP_DATABASE.invoices) {
      await db
        .insert(invoices)
        .values({
          invoiceNumber: inv.invoiceNumber,
          jobOrderId: inv.jobOrderId || null,
          jobOrderNumber: inv.jobOrderNumber || null,
          customerId: inv.customerId,
          customerName: inv.customerName,
          motorcycleSummary: inv.motorcycleSummary || null,
          serviceCharges: inv.serviceCharges,
          laborCharges: inv.laborCharges,
          sparePartsCosts: inv.sparePartsCosts,
          accessoriesCosts: inv.accessoriesCosts,
          discountAmount: inv.discountAmount,
          totalAmount: inv.totalAmount,
          amountPaid: inv.amountPaid,
          balanceDue: inv.balanceDue,
          paymentStatus: inv.paymentStatus,
          paymentMethod: inv.paymentMethod || null,
          issuedBy: inv.issuedBy,
          createdAt: inv.createdAt,
          paidAt: inv.paidAt || null,
        })
        .onConflictDoNothing();
    }

    for (const trx of INITIAL_SHOP_DATABASE.transactions) {
      await db
        .insert(transactions)
        .values({
          transactionNumber: trx.transactionNumber,
          invoiceId: trx.invoiceId || null,
          invoiceNumber: trx.invoiceNumber || null,
          customerId: trx.customerId,
          customerName: trx.customerName,
          servicesPurchased: trx.servicesPurchased,
          productsPurchased: trx.productsPurchased,
          totalAmount: trx.totalAmount,
          paymentReceived: trx.paymentReceived,
          changeGiven: trx.changeGiven,
          paymentMethod: trx.paymentMethod,
          cashierName: trx.cashierName,
          transactionDate: trx.transactionDate,
        })
        .onConflictDoNothing();
    }

    for (const fb of INITIAL_SHOP_DATABASE.feedback) {
      await db.insert(feedback).values({
        customerId: fb.customerId,
        customerName: fb.customerName,
        jobOrderNumber: fb.jobOrderNumber || null,
        serviceName: fb.serviceName,
        rating: fb.rating,
        comment: fb.comment,
        createdAt: fb.createdAt,
        staffResponse: fb.staffResponse || null,
      });
    }

    for (const sch of INITIAL_SHOP_DATABASE.employeeSchedules) {
      await db.insert(employeeSchedules).values({
        userId: sch.userId,
        employeeName: sch.employeeName,
        role: sch.role,
        shiftDays: sch.shiftDays,
        shiftHours: sch.shiftHours,
        bayAssignment: sch.bayAssignment,
        status: sch.status,
      });
    }

    for (const log of INITIAL_SHOP_DATABASE.activityLogs) {
      await db.insert(activityLogs).values({
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        action: log.action,
        module: log.module,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      });
    }

    for (const n of INITIAL_SHOP_DATABASE.notifications) {
      await db
        .insert(notifications)
        .values({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          targetRolesJson: JSON.stringify(n.targetRoles),
          targetCustomerId: n.targetCustomerId ?? null,
          referenceId: n.referenceId || null,
          severity: n.severity,
          createdAt: n.createdAt,
          readByUserIdsJson: JSON.stringify(n.readByUserIds),
        })
        .onConflictDoNothing();
    }

    seededChecked = true;
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function loadFullStateFromCloudSql(): Promise<ShopDatabaseState> {
  try {
    await ensureSeededInCloudSql();

    const [
      userRows,
      customerRows,
      motorcycleRows,
      serviceRows,
      supplierRows,
      productRows,
      appointmentRows,
      jobOrderRows,
      movementRows,
      invoiceRows,
      transactionRows,
      feedbackRows,
      scheduleRows,
      logRows,
      notificationRows,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(customers).orderBy(desc(customers.id)),
      db.select().from(motorcycles).orderBy(desc(motorcycles.id)),
      db.select().from(services),
      db.select().from(suppliers),
      db.select().from(products),
      db.select().from(appointments).orderBy(desc(appointments.id)),
      db.select().from(jobOrders).orderBy(desc(jobOrders.id)),
      db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.id)),
      db.select().from(invoices).orderBy(desc(invoices.id)),
      db.select().from(transactions).orderBy(desc(transactions.id)),
      db.select().from(feedback).orderBy(desc(feedback.id)),
      db.select().from(employeeSchedules),
      db.select().from(activityLogs).orderBy(desc(activityLogs.id)),
      db.select().from(notifications).orderBy(desc(notifications.createdAt)),
    ]);

    return {
      users: userRows.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role as UserRole,
        specialty: u.specialty || undefined,
        status: (u.status as 'Active' | 'Inactive') || 'Active',
        customerId: u.customerId || undefined,
        lastLogin: u.lastLogin,
        twoFactorEnabled: u.twoFactorEnabled,
      })),
      customers: customerRows.map((c) => ({
        id: c.id,
        code: c.code,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        address: c.address,
        barangayCity: c.barangayCity,
        dateRegistered: c.dateRegistered,
        status: (c.status as 'Active' | 'Inactive') || 'Active',
        notes: c.notes || undefined,
      })),
      motorcycles: motorcycleRows.map((m) => ({
        id: m.id,
        customerId: m.customerId,
        customerName: m.customerName,
        brand: m.brand,
        model: m.model,
        plateNumber: m.plateNumber,
        type: m.type as any,
        year: m.year,
        engineDisplacement: m.engineDisplacement,
        color: m.color,
        odometerKm: m.odometerKm,
        vinChassis: m.vinChassis,
      })),
      services: serviceRows.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        category: s.category as any,
        description: s.description,
        basePrice: s.basePrice,
        estimatedDurationMins: s.estimatedDurationMins,
        isActive: s.isActive,
      })),
      suppliers: supplierRows.map((sup) => ({
        id: sup.id,
        code: sup.code,
        name: sup.name,
        contactPerson: sup.contactPerson,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
        categorySupplied: sup.categorySupplied,
        status: (sup.status as 'Active' | 'Inactive') || 'Active',
      })),
      products: productRows.map((p) => ({
        id: p.id,
        productCode: p.productCode,
        name: p.name,
        category: p.category as any,
        description: p.description,
        quantity: p.quantity,
        reorderLevel: p.reorderLevel,
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        locationRack: p.locationRack,
        dateAdded: p.dateAdded,
      })),
      appointments: appointmentRows.map((a) => ({
        id: a.id,
        appointmentNumber: a.appointmentNumber,
        customerId: a.customerId,
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        motorcycleId: a.motorcycleId,
        motorcycleSummary: a.motorcycleSummary,
        plateNumber: a.plateNumber,
        serviceId: a.serviceId,
        serviceName: a.serviceName,
        preferredDate: a.preferredDate,
        preferredTime: a.preferredTime,
        reportedProblem: a.reportedProblem,
        assignedMechanicId: a.assignedMechanicId || undefined,
        assignedMechanicName: a.assignedMechanicName || undefined,
        status: a.status as any,
        createdAt: a.createdAt,
      })),
      jobOrders: jobOrderRows.map((jo) => ({
        id: jo.id,
        jobOrderNumber: jo.jobOrderNumber,
        appointmentId: jo.appointmentId || undefined,
        customerId: jo.customerId,
        customerName: jo.customerName,
        customerPhone: jo.customerPhone,
        motorcycleId: jo.motorcycleId,
        motorcycleSummary: jo.motorcycleSummary,
        plateNumber: jo.plateNumber,
        odometerKm: jo.odometerKm,
        reportedProblem: jo.reportedProblem,
        inspectionResults: jo.inspectionResults,
        assignedMechanicId: jo.assignedMechanicId,
        assignedMechanicName: jo.assignedMechanicName,
        servicesPerformed: JSON.parse(jo.servicesPerformedJson || '[]'),
        partsUsed: JSON.parse(jo.partsUsedJson || '[]'),
        laborCharges: jo.laborCharges,
        repairNotes: jo.repairNotes,
        dateReceived: jo.dateReceived,
        completionDate: jo.completionDate || undefined,
        status: jo.status as any,
        totalEstimated: jo.totalEstimated,
        invoiceId: jo.invoiceId || undefined,
      })),
      inventoryMovements: movementRows.map((mov) => ({
        id: mov.id,
        productId: mov.productId,
        productCode: mov.productCode,
        productName: mov.productName,
        movementType: mov.movementType as any,
        quantityChange: mov.quantityChange,
        previousStock: mov.previousStock,
        newStock: mov.newStock,
        referenceCode: mov.referenceCode,
        performedBy: mov.performedBy,
        createdAt: mov.createdAt,
        notes: mov.notes || undefined,
      })),
      invoices: invoiceRows.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        jobOrderId: inv.jobOrderId || undefined,
        jobOrderNumber: inv.jobOrderNumber || undefined,
        customerId: inv.customerId,
        customerName: inv.customerName,
        motorcycleSummary: inv.motorcycleSummary || undefined,
        serviceCharges: inv.serviceCharges,
        laborCharges: inv.laborCharges,
        sparePartsCosts: inv.sparePartsCosts,
        accessoriesCosts: inv.accessoriesCosts,
        discountAmount: inv.discountAmount,
        totalAmount: inv.totalAmount,
        amountPaid: inv.amountPaid,
        balanceDue: inv.balanceDue,
        paymentStatus: inv.paymentStatus as any,
        paymentMethod: (inv.paymentMethod as any) || undefined,
        issuedBy: inv.issuedBy,
        createdAt: inv.createdAt,
        paidAt: inv.paidAt || undefined,
      })),
      transactions: transactionRows.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        invoiceId: t.invoiceId || undefined,
        invoiceNumber: t.invoiceNumber || undefined,
        customerId: t.customerId,
        customerName: t.customerName,
        servicesPurchased: t.servicesPurchased,
        productsPurchased: t.productsPurchased,
        totalAmount: t.totalAmount,
        paymentReceived: t.paymentReceived,
        changeGiven: t.changeGiven,
        paymentMethod: t.paymentMethod as any,
        cashierName: t.cashierName,
        transactionDate: t.transactionDate,
      })),
      feedback: feedbackRows.map((f) => ({
        id: f.id,
        customerId: f.customerId,
        customerName: f.customerName,
        jobOrderNumber: f.jobOrderNumber || undefined,
        serviceName: f.serviceName,
        rating: f.rating,
        comment: f.comment,
        createdAt: f.createdAt,
        staffResponse: f.staffResponse || undefined,
      })),
      employeeSchedules: scheduleRows.map((s) => ({
        id: s.id,
        userId: s.userId,
        employeeName: s.employeeName,
        role: s.role as UserRole,
        shiftDays: s.shiftDays,
        shiftHours: s.shiftHours,
        bayAssignment: s.bayAssignment,
        status: s.status as any,
      })),
      activityLogs: logRows.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.userName,
        userRole: l.userRole as UserRole,
        action: l.action,
        module: l.module,
        details: l.details,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      notifications: notificationRows.map((n) => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        targetRoles: JSON.parse(n.targetRolesJson || '[]'),
        targetCustomerId: n.targetCustomerId ?? undefined,
        referenceId: n.referenceId || undefined,
        severity: n.severity as any,
        createdAt: n.createdAt,
        readByUserIds: JSON.parse(n.readByUserIdsJson || '[]'),
      })),
    };
  } catch (error) {
    console.error('Database query failed in loadFullStateFromCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertNotificationToCloudSql(n: ShopNotification): Promise<void> {
  try {
    await db
      .insert(notifications)
      .values({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        targetRolesJson: JSON.stringify(n.targetRoles),
        targetCustomerId: n.targetCustomerId ?? null,
        referenceId: n.referenceId || null,
        severity: n.severity,
        createdAt: n.createdAt,
        readByUserIdsJson: JSON.stringify(n.readByUserIds),
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database query failed in insertNotificationToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertActivityLogToCloudSql(log: {
  userId: number;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}): Promise<void> {
  try {
    await db.insert(activityLogs).values(log);
  } catch (error) {
    console.error('Database query failed in insertActivityLogToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateAppointmentStatusInCloudSql(
  id: number,
  status: string,
  assignedMechanicId?: number,
  assignedMechanicName?: string
): Promise<void> {
  try {
    await db
      .update(appointments)
      .set({
        status,
        ...(assignedMechanicId ? { assignedMechanicId, assignedMechanicName } : {}),
      })
      .where(eq(appointments.id, id));
  } catch (error) {
    console.error('Database query failed in updateAppointmentStatusInCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateJobOrderInCloudSql(jo: {
  id: number;
  status: string;
  inspectionResults: string;
  repairNotes: string;
  laborCharges: number;
  servicesPerformedJson: string;
  partsUsedJson: string;
  totalEstimated: number;
  completionDate?: string;
  invoiceId?: number;
}): Promise<void> {
  try {
    await db
      .update(jobOrders)
      .set({
        status: jo.status,
        inspectionResults: jo.inspectionResults,
        repairNotes: jo.repairNotes,
        laborCharges: jo.laborCharges,
        servicesPerformedJson: jo.servicesPerformedJson,
        partsUsedJson: jo.partsUsedJson,
        totalEstimated: jo.totalEstimated,
        completionDate: jo.completionDate || null,
        invoiceId: jo.invoiceId || null,
      })
      .where(eq(jobOrders.id, jo.id));
  } catch (error) {
    console.error('Database query failed in updateJobOrderInCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateProductStockInCloudSql(
  productId: number,
  newQuantity: number
): Promise<void> {
  try {
    await db
      .update(products)
      .set({ quantity: newQuantity })
      .where(eq(products.id, productId));
  } catch (error) {
    console.error('Database query failed in updateProductStockInCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertCustomerToCloudSql(c: {
  code: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  barangayCity: string;
  dateRegistered: string;
  status: string;
  notes?: string;
}): Promise<void> {
  try {
    await db
      .insert(customers)
      .values({
        code: c.code,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        address: c.address,
        barangayCity: c.barangayCity,
        dateRegistered: c.dateRegistered,
        status: c.status,
        notes: c.notes || '',
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database query failed in insertCustomerToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertMotorcycleToCloudSql(m: {
  customerId: number;
  customerName: string;
  brand: string;
  model: string;
  plateNumber: string;
  type: string;
  year: number;
  engineDisplacement: string;
  color: string;
  odometerKm: number;
  vinChassis: string;
}): Promise<void> {
  try {
    await db.insert(motorcycles).values(m).onConflictDoNothing();
  } catch (error) {
    console.error('Database query failed in insertMotorcycleToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertAppointmentToCloudSql(a: {
  appointmentNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  motorcycleId: number;
  motorcycleSummary: string;
  plateNumber: string;
  serviceId: number;
  serviceName: string;
  preferredDate: string;
  preferredTime: string;
  reportedProblem: string;
  assignedMechanicId?: number;
  assignedMechanicName?: string;
  status: string;
  createdAt: string;
}): Promise<void> {
  try {
    await db
      .insert(appointments)
      .values({
        ...a,
        assignedMechanicId: a.assignedMechanicId ?? null,
        assignedMechanicName: a.assignedMechanicName ?? null,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database query failed in insertAppointmentToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertFeedbackToCloudSql(fb: {
  customerId: number;
  customerName: string;
  jobOrderNumber?: string;
  serviceName: string;
  rating: number;
  comment: string;
  createdAt: string;
}): Promise<void> {
  try {
    await db.insert(feedback).values({
      customerId: fb.customerId,
      customerName: fb.customerName,
      jobOrderNumber: fb.jobOrderNumber || null,
      serviceName: fb.serviceName,
      rating: fb.rating,
      comment: fb.comment,
      createdAt: fb.createdAt,
      staffResponse: null,
    });
  } catch (error) {
    console.error('Database query failed in insertFeedbackToCloudSql:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

