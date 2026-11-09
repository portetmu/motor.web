import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import { INITIAL_SHOP_DATABASE } from './src/data/seedDatabase.ts';
import type {
  AppointmentStatus,
  NotificationType,
  RepairStatus,
  ShopDatabaseState,
  ShopNotification,
  UserRole,
} from './src/types/shop.ts';
import {
  calculateJobOrderTotals,
  calculateStockUpdate,
  getTargetRolesForNotificationType,
  hasAppointmentConflict,
  shouldTriggerLowStockAlert,
} from './src/utils/shopLogic.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUsers } from './src/db/users.ts';
import {
  insertActivityLogToCloudSql,
  insertAppointmentToCloudSql,
  insertCustomerToCloudSql,
  insertFeedbackToCloudSql,
  insertMotorcycleToCloudSql,
  insertNotificationToCloudSql,
  loadFullStateFromCloudSql,
  updateAppointmentStatusInCloudSql,
  updateJobOrderInCloudSql,
  updateProductStockInCloudSql,
} from './src/db/shopRepository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'ca_motorcycle_shop_db.json');

function loadDatabase(): ShopDatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as ShopDatabaseState;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.notifications)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading persisted DB, using seed database:', err);
  }
  const initial = structuredClone(INITIAL_SHOP_DATABASE);
  saveDatabase(initial);
  return initial;
}

function saveDatabase(state: ShopDatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist database state:', err);
  }
}

function nowTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  let dbState: ShopDatabaseState = loadDatabase();

  function broadcastWs(payload: Record<string, unknown>) {
    const serialized = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  }

  function logActivity(
    userId: number,
    userName: string,
    userRole: UserRole,
    action: string,
    moduleName: string,
    details: string
  ) {
    const nextId = dbState.activityLogs.reduce((m, l) => Math.max(m, l.id), 0) + 1;
    const entry = {
      id: nextId,
      userId,
      userName,
      userRole,
      action,
      module: moduleName,
      details,
      ipAddress: '127.0.0.1',
      createdAt: nowTimestamp(),
    };
    dbState.activityLogs.unshift(entry);
    insertActivityLogToCloudSql(entry).catch((err) => {
      console.error('Failed to sync activity log to Cloud SQL:', err);
    });
  }

  function createAndBroadcastNotification(params: {
    type: NotificationType;
    title: string;
    message: string;
    targetCustomerId?: number;
    referenceId?: string;
    severity?: 'info' | 'success' | 'warning' | 'urgent';
  }): ShopNotification {
    const notification: ShopNotification = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: params.type,
      title: params.title,
      message: params.message,
      targetRoles: getTargetRolesForNotificationType(params.type),
      targetCustomerId: params.targetCustomerId,
      referenceId: params.referenceId,
      severity:
        params.severity ||
        (params.type === 'low_stock_alert'
          ? 'urgent'
          : params.type === 'appointment_confirmed' || params.type === 'new_feedback'
          ? 'success'
          : 'info'),
      createdAt: nowTimestamp(),
      readByUserIds: [],
    };

    // Idempotency guard
    if (!dbState.notifications.some((n) => n.id === notification.id)) {
      dbState.notifications.unshift(notification);
    }
    saveDatabase(dbState);
    insertNotificationToCloudSql(notification).catch((err) => {
      console.error('Failed to sync notification to Cloud SQL:', err);
    });

    broadcastWs({
      event: 'notification:created',
      notification,
      state: dbState,
    });

    return notification;
  }

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        event: 'init',
        notifications: dbState.notifications,
        connectedClients: wss.clients.size,
      })
    );
  });

  // --- API ROUTES ---

  // Get full application & database state (lazily seeded & loaded from Cloud SQL PostgreSQL)
  app.get('/api/state', async (_req, res) => {
    try {
      const cloudSqlState = await loadFullStateFromCloudSql();
      if (cloudSqlState && cloudSqlState.users.length > 0) {
        dbState = cloudSqlState;
        saveDatabase(dbState);
      }
      res.json(dbState);
    } catch (error) {
      console.error('Error in GET /api/state (Cloud SQL fallback to local state):', error);
      res.json(dbState);
    }
  });

  // Protected Firebase Auth User Synchronization with Cloud SQL PostgreSQL
  app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      await getOrCreateUser(req.user!.uid, req.user!.email || '', req.user!.name);
      const allUsers = await getUsers();
      res.json(allUsers);
    } catch (error) {
      console.error('Error in GET /api/users:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  app.post('/api/auth/google', requireAuth, async (req: AuthRequest, res) => {
    try {
      const syncedUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || '',
        req.user!.name
      );

      if (syncedUser && !dbState.users.some((u) => u.id === syncedUser.id)) {
        dbState.users.push({
          id: syncedUser.id,
          username: syncedUser.username,
          fullName: syncedUser.fullName,
          email: syncedUser.email,
          phone: syncedUser.phone,
          role: (syncedUser.role as UserRole) || 'customer',
          status: (syncedUser.status as 'Active' | 'Inactive') || 'Active',
          customerId: syncedUser.customerId || 1,
          lastLogin: nowTimestamp(),
        });
      }
      const appUser =
        dbState.users.find((u) => u.email.toLowerCase() === (req.user!.email || '').toLowerCase()) ||
        dbState.users[0];
      logActivity(
        appUser.id,
        appUser.fullName,
        appUser.role,
        'Firebase Google Sign-In',
        'Authentication',
        `Authenticated via Firebase Auth (${req.user!.email || req.user!.uid})`
      );
      saveDatabase(dbState);
      res.json({ user: appUser, state: dbState });
    } catch (error) {
      console.error('Error in POST /api/auth/google:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  // Authenticate user or switch demo role
  app.post('/api/auth/login', (req, res) => {
    const { username, password, roleSwitch } = req.body as {
      username?: string;
      password?: string;
      roleSwitch?: UserRole;
    };

    let user = dbState.users.find(
      (u) =>
        (username && u.username.toLowerCase() === username.toLowerCase()) ||
        (roleSwitch && u.role === roleSwitch)
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'This user account has been deactivated by the Administrator.' });
    }

    // Validate password if explicitly logging in with password
    if (password !== undefined && !roleSwitch) {
      const validDemoPasswords: Record<string, string> = {
        admin: 'Admin@CA2026',
        owner: 'Owner@CA2026',
        cashier: 'Cashier@CA2026',
        mechanic: 'Mechanic@CA2026',
        mechanic2: 'Mechanic2@CA2026',
        customer: 'Customer@CA2026',
      };
      const expected = validDemoPasswords[user.username.toLowerCase()];
      if (expected && password !== expected && password !== 'demo123') {
        return res.status(401).json({ error: 'Incorrect password for account ' + user.username });
      }
    }

    user.lastLogin = nowTimestamp();
    logActivity(user.id, user.fullName, user.role, 'User Login', 'Authentication', `Logged in as ${user.role.toUpperCase()}`);
    saveDatabase(dbState);

    res.json({ user, state: dbState });
  });

  // Customer Registration / Creation
  app.post('/api/customers', async (req, res) => {
    const { fullName, phone, email, address, barangayCity, notes, createPortalAccount, username } = req.body;
    if (!fullName || !phone || !address) {
      return res.status(400).json({ error: 'Full name, contact number, and address are required.' });
    }

    const nextId = dbState.customers.reduce((m, c) => Math.max(m, c.id), 0) + 1;
    const code = `CUST-2026-${String(nextId).padStart(3, '0')}`;
    const newCustomer = {
      id: nextId,
      code,
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      email: String(email || '').trim(),
      address: String(address).trim(),
      barangayCity: String(barangayCity || 'Baguio City').trim(),
      dateRegistered: nowTimestamp().split(' ')[0],
      status: 'Active' as const,
      notes: String(notes || '').trim(),
    };

    dbState.customers.unshift(newCustomer);
    try {
      await insertCustomerToCloudSql(newCustomer);
    } catch (error) {
      console.error('Error syncing customer to Cloud SQL:', error);
    }

    let createdUser = undefined;
    if (createPortalAccount) {
      const nextUserId = dbState.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
      const cleanUsername =
        String(username || fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)) + nextId;
      createdUser = {
        id: nextUserId,
        username: cleanUsername,
        fullName: newCustomer.fullName,
        email: newCustomer.email || `${cleanUsername}@customer.ca.ph`,
        phone: newCustomer.phone,
        role: 'customer' as const,
        customerId: newCustomer.id,
        status: 'Active' as const,
        lastLogin: nowTimestamp(),
      };
      dbState.users.push(createdUser);
    }

    logActivity(3, 'Maricar P. Balitaan', 'cashier', 'Registered Customer', 'Customers', `Registered ${newCustomer.fullName} (${newCustomer.code})`);
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });

    res.json({ customer: newCustomer, user: createdUser, state: dbState });
  });

  // Update Customer
  app.put('/api/customers/:id', (req, res) => {
    const id = Number(req.params.id);
    const customer = dbState.customers.find((c) => c.id === id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    const { fullName, phone, email, address, barangayCity, status, notes } = req.body;
    if (fullName) customer.fullName = String(fullName).trim();
    if (phone) customer.phone = String(phone).trim();
    if (email !== undefined) customer.email = String(email).trim();
    if (address) customer.address = String(address).trim();
    if (barangayCity) customer.barangayCity = String(barangayCity).trim();
    if (status === 'Active' || status === 'Inactive') customer.status = status;
    if (notes !== undefined) customer.notes = String(notes).trim();

    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });
    res.json({ customer, state: dbState });
  });

  // Add Motorcycle
  app.post('/api/motorcycles', async (req, res) => {
    const { customerId, brand, model, plateNumber, type, year, engineDisplacement, color, odometerKm, vinChassis } = req.body;
    if (!customerId || !brand || !model || !plateNumber) {
      return res.status(400).json({ error: 'Customer, brand, model, and plate number are required.' });
    }

    const cleanPlate = String(plateNumber).trim().toUpperCase();
    if (dbState.motorcycles.some((m) => m.plateNumber.toUpperCase() === cleanPlate)) {
      return res.status(400).json({ error: `A motorcycle with plate number ${cleanPlate} is already registered.` });
    }

    const customer = dbState.customers.find((c) => c.id === Number(customerId));
    if (!customer) {
      return res.status(400).json({ error: 'Selected customer does not exist.' });
    }

    const nextId = dbState.motorcycles.reduce((m, mc) => Math.max(m, mc.id), 0) + 1;
    const motorcycle = {
      id: nextId,
      customerId: customer.id,
      customerName: customer.fullName,
      brand: String(brand).trim(),
      model: String(model).trim(),
      plateNumber: cleanPlate,
      type: type || 'Scooter',
      year: Number(year) || 2024,
      engineDisplacement: String(engineDisplacement || '150cc').trim(),
      color: String(color || 'Black').trim(),
      odometerKm: Number(odometerKm) || 0,
      vinChassis: String(vinChassis || `VIN-${Date.now()}`).trim().toUpperCase(),
    };

    dbState.motorcycles.unshift(motorcycle);
    try {
      await insertMotorcycleToCloudSql(motorcycle);
    } catch (error) {
      console.error('Error syncing motorcycle to Cloud SQL:', error);
    }
    logActivity(3, customer.fullName, 'cashier', 'Registered Motorcycle', 'Motorcycles', `Added ${motorcycle.brand} ${motorcycle.model} (${motorcycle.plateNumber})`);
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });
    res.json({ motorcycle, state: dbState });
  });

  // Book Appointment (with conflict prevention)
  app.post('/api/appointments', async (req, res) => {
    const { customerId, motorcycleId, serviceId, preferredDate, preferredTime, reportedProblem, assignedMechanicId } = req.body;
    if (!customerId || !motorcycleId || !serviceId || !preferredDate || !preferredTime || !reportedProblem) {
      return res.status(400).json({ error: 'Please complete all required appointment fields.' });
    }

    const conflictCheck = hasAppointmentConflict(
      dbState.appointments,
      String(preferredDate),
      String(preferredTime),
      Number(motorcycleId),
      assignedMechanicId ? Number(assignedMechanicId) : undefined
    );

    if (conflictCheck.conflict) {
      return res.status(409).json({ error: conflictCheck.reason });
    }

    const customer = dbState.customers.find((c) => c.id === Number(customerId));
    const motorcycle = dbState.motorcycles.find((m) => m.id === Number(motorcycleId));
    const service = dbState.services.find((s) => s.id === Number(serviceId));
    const mechanic = assignedMechanicId
      ? dbState.users.find((u) => u.id === Number(assignedMechanicId))
      : dbState.users.find((u) => u.role === 'mechanic');

    if (!customer || !motorcycle || !service) {
      return res.status(400).json({ error: 'Invalid customer, motorcycle, or service selection.' });
    }

    const nextId = dbState.appointments.reduce((m, a) => Math.max(m, a.id), 0) + 1;
    const appointmentNumber = `APT-2026-${100 + nextId}`;
    const newAppointment = {
      id: nextId,
      appointmentNumber,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      motorcycleId: motorcycle.id,
      motorcycleSummary: `${motorcycle.brand} ${motorcycle.model}`,
      plateNumber: motorcycle.plateNumber,
      serviceId: service.id,
      serviceName: service.name,
      preferredDate: String(preferredDate),
      preferredTime: String(preferredTime),
      reportedProblem: String(reportedProblem).trim(),
      assignedMechanicId: mechanic?.id,
      assignedMechanicName: mechanic?.fullName,
      status: 'Pending' as AppointmentStatus,
      createdAt: nowTimestamp(),
    };

    dbState.appointments.unshift(newAppointment);
    try {
      await insertAppointmentToCloudSql(newAppointment);
    } catch (error) {
      console.error('Error syncing appointment to Cloud SQL:', error);
    }
    logActivity(customer.id, customer.fullName, 'customer', 'Booked Appointment', 'Appointments', `Booked ${appointmentNumber} for ${motorcycle.plateNumber}`);
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });

    res.json({ appointment: newAppointment, state: dbState });
  });

  // Update Appointment Status -> triggers real-time WebSocket notification when Confirmed!
  app.patch('/api/appointments/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { status, assignedMechanicId } = req.body as {
      status: AppointmentStatus;
      assignedMechanicId?: number;
    };

    const appointment = dbState.appointments.find((a) => a.id === id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    appointment.status = status;
    if (assignedMechanicId) {
      const mech = dbState.users.find((u) => u.id === Number(assignedMechanicId));
      if (mech) {
        appointment.assignedMechanicId = mech.id;
        appointment.assignedMechanicName = mech.fullName;
      }
    }

    try {
      await updateAppointmentStatusInCloudSql(
        appointment.id,
        appointment.status,
        appointment.assignedMechanicId,
        appointment.assignedMechanicName
      );
    } catch (error) {
      console.error('Error updating appointment status in Cloud SQL:', error);
    }

    logActivity(3, 'Maricar P. Balitaan', 'cashier', `Appointment ${status}`, 'Appointments', `Updated ${appointment.appointmentNumber} status to ${status}`);

    let notification: ShopNotification | undefined;
    if (status === 'Confirmed') {
      notification = createAndBroadcastNotification({
        type: 'appointment_confirmed',
        title: `Appointment Confirmed: ${appointment.appointmentNumber}`,
        message: `${appointment.serviceName} for ${appointment.customerName} (${appointment.motorcycleSummary} · ${appointment.plateNumber}) is confirmed for ${appointment.preferredDate} at ${appointment.preferredTime}.`,
        targetCustomerId: appointment.customerId,
        referenceId: appointment.appointmentNumber,
        severity: 'success',
      });
    } else {
      saveDatabase(dbState);
      broadcastWs({ event: 'state:updated', state: dbState });
    }

    res.json({ appointment, notification, state: dbState });
  });

  // Create Repair Job Order
  app.post('/api/job-orders', (req, res) => {
    const {
      appointmentId,
      customerId,
      motorcycleId,
      odometerKm,
      reportedProblem,
      inspectionResults,
      assignedMechanicId,
      serviceIds,
      partsUsed,
      laborCharges,
      repairNotes,
    } = req.body;

    const customer = dbState.customers.find((c) => c.id === Number(customerId));
    const motorcycle = dbState.motorcycles.find((m) => m.id === Number(motorcycleId));
    const mechanic =
      dbState.users.find((u) => u.id === Number(assignedMechanicId)) ||
      dbState.users.find((u) => u.role === 'mechanic');

    if (!customer || !motorcycle || !mechanic || !reportedProblem) {
      return res.status(400).json({ error: 'Customer, motorcycle, assigned mechanic, and reported problem are required.' });
    }

    const selectedServices = Array.isArray(serviceIds)
      ? dbState.services
          .filter((s) => serviceIds.map(Number).includes(s.id))
          .map((s) => ({ serviceId: s.id, serviceName: s.name, price: s.basePrice }))
      : [];

    const validParts: Array<{
      productId: number;
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    const nextJoId = dbState.jobOrders.reduce((m, j) => Math.max(m, j.id), 0) + 1;
    const jobOrderNumber = `JO-2026-${String(nextJoId).padStart(3, '0')}`;

    // Deduct stock if initial parts are specified
    const lowStockTriggeredProducts: Array<{ code: string; name: string; qty: number; reorder: number }> = [];
    if (Array.isArray(partsUsed)) {
      for (const item of partsUsed) {
        const prod = dbState.products.find((p) => p.id === Number(item.productId));
        const qty = Math.max(1, Number(item.quantity) || 1);
        if (prod) {
          const stockCheck = calculateStockUpdate(prod.quantity, -qty);
          if (!stockCheck.ok) {
            return res.status(400).json({ error: `${prod.name}: ${stockCheck.error}` });
          }
          const prev = prod.quantity;
          prod.quantity = stockCheck.newStock;
          validParts.push({
            productId: prod.id,
            productCode: prod.productCode,
            productName: prod.name,
            quantity: qty,
            unitPrice: prod.unitPrice,
          });
          dbState.inventoryMovements.unshift({
            id: dbState.inventoryMovements.reduce((m, im) => Math.max(m, im.id), 0) + 1,
            productId: prod.id,
            productCode: prod.productCode,
            productName: prod.name,
            movementType: 'Job Order Deduction',
            quantityChange: -qty,
            previousStock: prev,
            newStock: prod.quantity,
            referenceCode: jobOrderNumber,
            performedBy: mechanic.fullName,
            createdAt: nowTimestamp(),
            notes: `Deducted for ${motorcycle.plateNumber}`,
          });
          if (shouldTriggerLowStockAlert(prod)) {
            lowStockTriggeredProducts.push({
              code: prod.productCode,
              name: prod.name,
              qty: prod.quantity,
              reorder: prod.reorderLevel,
            });
          }
        }
      }
    }

    const totals = calculateJobOrderTotals(selectedServices, validParts, Number(laborCharges) || 300);

    const newJobOrder = {
      id: nextJoId,
      jobOrderNumber,
      appointmentId: appointmentId ? Number(appointmentId) : undefined,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      motorcycleId: motorcycle.id,
      motorcycleSummary: `${motorcycle.brand} ${motorcycle.model}`,
      plateNumber: motorcycle.plateNumber,
      odometerKm: Number(odometerKm) || motorcycle.odometerKm,
      reportedProblem: String(reportedProblem).trim(),
      inspectionResults: String(inspectionResults || 'Initial bay inspection pending.').trim(),
      assignedMechanicId: mechanic.id,
      assignedMechanicName: mechanic.fullName,
      servicesPerformed: selectedServices,
      partsUsed: validParts,
      laborCharges: totals.laborCharges,
      repairNotes: String(repairNotes || '').trim(),
      dateReceived: nowTimestamp(),
      status: 'Pending' as RepairStatus,
      totalEstimated: totals.totalAmount,
    };

    dbState.jobOrders.unshift(newJobOrder);
    logActivity(3, 'Maricar P. Balitaan', 'cashier', 'Created Job Order', 'Repair & Maintenance', `Created ${jobOrderNumber} for ${motorcycle.plateNumber}`);

    createAndBroadcastNotification({
      type: 'repair_status_changed',
      title: `New Job Order Assigned: ${jobOrderNumber}`,
      message: `${newJobOrder.motorcycleSummary} (${newJobOrder.plateNumber}) assigned to ${mechanic.fullName}. Status: Pending.`,
      targetCustomerId: customer.id,
      referenceId: jobOrderNumber,
      severity: 'info',
    });

    for (const lp of lowStockTriggeredProducts) {
      createAndBroadcastNotification({
        type: 'low_stock_alert',
        title: `Low Stock Alert: ${lp.name}`,
        message: `Remaining stock is ${lp.qty} units (Reorder threshold: ${lp.reorder} units) after deduction on ${jobOrderNumber}.`,
        referenceId: lp.code,
        severity: 'urgent',
      });
    }

    res.json({ jobOrder: newJobOrder, state: dbState });
  });

  // Update Job Order (status change, inspection results, add spare part, labor charges)
  app.patch('/api/job-orders/:id', async (req, res) => {
    const id = Number(req.params.id);
    const jobOrder = dbState.jobOrders.find((j) => j.id === id);
    if (!jobOrder) {
      return res.status(404).json({ error: 'Job order not found.' });
    }

    const {
      status,
      inspectionResults,
      repairNotes,
      laborCharges,
      addPartProductId,
      addPartQuantity,
      addServiceId,
    } = req.body;

    const previousStatus = jobOrder.status;

    if (inspectionResults !== undefined) jobOrder.inspectionResults = String(inspectionResults).trim();
    if (repairNotes !== undefined) jobOrder.repairNotes = String(repairNotes).trim();
    if (laborCharges !== undefined) jobOrder.laborCharges = Math.max(0, Number(laborCharges) || 0);

    // Optional: Add service line
    if (addServiceId) {
      const srv = dbState.services.find((s) => s.id === Number(addServiceId));
      if (srv && !jobOrder.servicesPerformed.some((s) => s.serviceId === srv.id)) {
        jobOrder.servicesPerformed.push({
          serviceId: srv.id,
          serviceName: srv.name,
          price: srv.basePrice,
        });
      }
    }

    // Optional: Add spare part & automatically deduct inventory
    let triggeredLowStock: ShopNotification | undefined;
    if (addPartProductId) {
      const prod = dbState.products.find((p) => p.id === Number(addPartProductId));
      const qty = Math.max(1, Number(addPartQuantity) || 1);
      if (!prod) {
        return res.status(404).json({ error: 'Selected spare part not found.' });
      }
      const stockUpdate = calculateStockUpdate(prod.quantity, -qty);
      if (!stockUpdate.ok) {
        return res.status(400).json({ error: stockUpdate.error });
      }
      const prevStock = prod.quantity;
      prod.quantity = stockUpdate.newStock;

      try {
        await updateProductStockInCloudSql(prod.id, prod.quantity);
      } catch (error) {
        console.error('Error syncing product stock to Cloud SQL:', error);
      }

      const existingPart = jobOrder.partsUsed.find((p) => p.productId === prod.id);
      if (existingPart) {
        existingPart.quantity += qty;
      } else {
        jobOrder.partsUsed.push({
          productId: prod.id,
          productCode: prod.productCode,
          productName: prod.name,
          quantity: qty,
          unitPrice: prod.unitPrice,
        });
      }

      dbState.inventoryMovements.unshift({
        id: dbState.inventoryMovements.reduce((m, im) => Math.max(m, im.id), 0) + 1,
        productId: prod.id,
        productCode: prod.productCode,
        productName: prod.name,
        movementType: 'Job Order Deduction',
        quantityChange: -qty,
        previousStock: prevStock,
        newStock: prod.quantity,
        referenceCode: jobOrder.jobOrderNumber,
        performedBy: jobOrder.assignedMechanicName,
        createdAt: nowTimestamp(),
        notes: `Used on ${jobOrder.motorcycleSummary} (${jobOrder.plateNumber})`,
      });

      if (shouldTriggerLowStockAlert(prod)) {
        triggeredLowStock = createAndBroadcastNotification({
          type: 'low_stock_alert',
          title: `Low Stock Alert: ${prod.name}`,
          message: `Stock dropped to ${prod.quantity} units (Reorder level: ${prod.reorderLevel}) after part usage on ${jobOrder.jobOrderNumber}.`,
          referenceId: prod.productCode,
          severity: 'urgent',
        });
      }
    }

    if (status && status !== previousStatus) {
      jobOrder.status = status as RepairStatus;
      if (status === 'Completed') {
        jobOrder.completionDate = nowTimestamp();
        if (jobOrder.appointmentId) {
          const apt = dbState.appointments.find((a) => a.id === jobOrder.appointmentId);
          if (apt) apt.status = 'Completed';
        }
      }
    }

    const totals = calculateJobOrderTotals(
      jobOrder.servicesPerformed,
      jobOrder.partsUsed,
      jobOrder.laborCharges
    );
    jobOrder.totalEstimated = totals.totalAmount;

    try {
      await updateJobOrderInCloudSql({
        id: jobOrder.id,
        status: jobOrder.status,
        inspectionResults: jobOrder.inspectionResults,
        repairNotes: jobOrder.repairNotes,
        laborCharges: jobOrder.laborCharges,
        servicesPerformedJson: JSON.stringify(jobOrder.servicesPerformed),
        partsUsedJson: JSON.stringify(jobOrder.partsUsed),
        totalEstimated: jobOrder.totalEstimated,
        completionDate: jobOrder.completionDate,
        invoiceId: jobOrder.invoiceId,
      });
    } catch (error) {
      console.error('Error syncing job order update to Cloud SQL:', error);
    }

    logActivity(
      jobOrder.assignedMechanicId,
      jobOrder.assignedMechanicName,
      'mechanic',
      'Updated Job Order',
      'Repair & Maintenance',
      `Updated ${jobOrder.jobOrderNumber} (Status: ${jobOrder.status}, Total: ₱${jobOrder.totalEstimated.toLocaleString()})`
    );

    let statusNotification: ShopNotification | undefined;
    if (status && status !== previousStatus) {
      statusNotification = createAndBroadcastNotification({
        type: 'repair_status_changed',
        title: `Repair Status: ${jobOrder.status} (${jobOrder.jobOrderNumber})`,
        message: `${jobOrder.motorcycleSummary} (${jobOrder.plateNumber}) for ${jobOrder.customerName} is now marked as '${jobOrder.status}' by ${jobOrder.assignedMechanicName}.`,
        targetCustomerId: jobOrder.customerId,
        referenceId: jobOrder.jobOrderNumber,
        severity: jobOrder.status === 'Completed' ? 'success' : 'info',
      });
    } else {
      saveDatabase(dbState);
      broadcastWs({ event: 'state:updated', state: dbState });
    }

    res.json({
      jobOrder,
      notification: statusNotification || triggeredLowStock,
      state: dbState,
    });
  });

  // Add New Inventory Product
  app.post('/api/products', (req, res) => {
    const { name, category, description, quantity, reorderLevel, unitPrice, costPrice, supplierId, locationRack } = req.body;
    if (!name || !category || unitPrice === undefined) {
      return res.status(400).json({ error: 'Product name, category, and unit price are required.' });
    }

    const supplier = dbState.suppliers.find((s) => s.id === Number(supplierId)) || dbState.suppliers[0];
    const nextId = dbState.products.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    const productCode = `PRD-${String(nextId).padStart(3, '0')}`;
    const newProduct = {
      id: nextId,
      productCode,
      name: String(name).trim(),
      category: category || 'Filters & Maintenance',
      description: String(description || '').trim(),
      quantity: Math.max(0, Number(quantity) || 0),
      reorderLevel: Math.max(1, Number(reorderLevel) || 5),
      unitPrice: Math.max(0, Number(unitPrice) || 0),
      costPrice: Math.max(0, Number(costPrice) || Number(unitPrice) * 0.72),
      supplierId: supplier.id,
      supplierName: supplier.name,
      locationRack: String(locationRack || `Rack C-0${nextId}`).trim(),
      dateAdded: nowTimestamp().split(' ')[0],
    };

    dbState.products.unshift(newProduct);
    if (shouldTriggerLowStockAlert(newProduct)) {
      createAndBroadcastNotification({
        type: 'low_stock_alert',
        title: `Low Stock Alert: ${newProduct.name}`,
        message: `Newly added item ${newProduct.productCode} has ${newProduct.quantity} units (at or below reorder threshold of ${newProduct.reorderLevel}).`,
        referenceId: newProduct.productCode,
        severity: 'warning',
      });
    } else {
      saveDatabase(dbState);
      broadcastWs({ event: 'state:updated', state: dbState });
    }

    res.json({ product: newProduct, state: dbState });
  });

  // Update Stock (Stock In / Deduction / Adjustment)
  app.patch('/api/products/:id/stock', async (req, res) => {
    const id = Number(req.params.id);
    const product = dbState.products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const { quantityDelta, movementType, notes, performedBy } = req.body;
    const delta = Number(quantityDelta);
    if (!delta || isNaN(delta)) {
      return res.status(400).json({ error: 'Valid non-zero quantity change is required.' });
    }

    const check = calculateStockUpdate(product.quantity, delta);
    if (!check.ok) {
      return res.status(400).json({ error: check.error });
    }

    const prev = product.quantity;
    product.quantity = check.newStock;

    try {
      await updateProductStockInCloudSql(product.id, product.quantity);
    } catch (error) {
      console.error('Error syncing product stock to Cloud SQL:', error);
    }

    dbState.inventoryMovements.unshift({
      id: dbState.inventoryMovements.reduce((m, im) => Math.max(m, im.id), 0) + 1,
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      movementType: movementType || (delta > 0 ? 'Stock In' : 'Adjustment'),
      quantityChange: delta,
      previousStock: prev,
      newStock: product.quantity,
      referenceCode: `STK-${Date.now().toString().slice(-5)}`,
      performedBy: String(performedBy || 'Clarissa A. Mendoza'),
      createdAt: nowTimestamp(),
      notes: String(notes || '').trim(),
    });

    let notification: ShopNotification | undefined;
    if (shouldTriggerLowStockAlert(product)) {
      notification = createAndBroadcastNotification({
        type: 'low_stock_alert',
        title: `Low Stock Alert: ${product.name}`,
        message: `${product.name} (${product.productCode}) now has ${product.quantity} units available (Reorder threshold: ${product.reorderLevel}).`,
        referenceId: product.productCode,
        severity: 'urgent',
      });
    } else {
      saveDatabase(dbState);
      broadcastWs({ event: 'state:updated', state: dbState });
    }

    res.json({ product, notification, state: dbState });
  });

  // Generate Invoice from Job Order
  app.post('/api/invoices', (req, res) => {
    const { jobOrderId, discountAmount = 0, accessoriesCosts = 0 } = req.body;
    const jobOrder = dbState.jobOrders.find((j) => j.id === Number(jobOrderId));
    if (!jobOrder) {
      return res.status(404).json({ error: 'Job Order not found.' });
    }

    const existingInvoice = dbState.invoices.find((inv) => inv.jobOrderId === jobOrder.id);
    if (existingInvoice) {
      return res.json({ invoice: existingInvoice, state: dbState });
    }

    const calc = calculateJobOrderTotals(
      jobOrder.servicesPerformed,
      jobOrder.partsUsed,
      jobOrder.laborCharges,
      Number(discountAmount) || 0
    );
    const cleanAcc = Math.max(0, Number(accessoriesCosts) || 0);
    const totalAmount = calc.totalAmount + cleanAcc;

    const nextInvId = dbState.invoices.reduce((m, i) => Math.max(m, i.id), 0) + 1;
    const invoiceNumber = `INV-2026-${String(nextInvId).padStart(3, '0')}`;

    const invoice = {
      id: nextInvId,
      invoiceNumber,
      jobOrderId: jobOrder.id,
      jobOrderNumber: jobOrder.jobOrderNumber,
      customerId: jobOrder.customerId,
      customerName: jobOrder.customerName,
      motorcycleSummary: `${jobOrder.motorcycleSummary} (${jobOrder.plateNumber})`,
      serviceCharges: calc.serviceCharges,
      laborCharges: calc.laborCharges,
      sparePartsCosts: calc.sparePartsCosts,
      accessoriesCosts: cleanAcc,
      discountAmount: calc.discountAmount,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      paymentStatus: 'Unpaid' as const,
      issuedBy: 'Maricar P. Balitaan',
      createdAt: nowTimestamp(),
    };

    jobOrder.invoiceId = invoice.id;
    dbState.invoices.unshift(invoice);
    logActivity(3, 'Maricar P. Balitaan', 'cashier', 'Generated Invoice', 'Billing & Payments', `Generated ${invoiceNumber} for ${jobOrder.jobOrderNumber} (₱${totalAmount.toLocaleString()})`);
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });

    res.json({ invoice, state: dbState });
  });

  // Record Payment for Invoice
  app.post('/api/invoices/:id/pay', (req, res) => {
    const id = Number(req.params.id);
    const invoice = dbState.invoices.find((inv) => inv.id === id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const { amountReceived, paymentMethod = 'Cash', cashierName = 'Maricar P. Balitaan' } = req.body;
    const paid = Number(amountReceived);
    if (isNaN(paid) || paid < invoice.balanceDue) {
      return res.status(400).json({ error: `Payment received (₱${paid || 0}) must cover the balance due (₱${invoice.balanceDue}).` });
    }

    const changeGiven = Math.max(0, paid - invoice.balanceDue);
    invoice.amountPaid = invoice.totalAmount;
    invoice.balanceDue = 0;
    invoice.paymentStatus = 'Paid';
    invoice.paymentMethod = paymentMethod;
    invoice.paidAt = nowTimestamp();

    const jobOrder = invoice.jobOrderId
      ? dbState.jobOrders.find((j) => j.id === invoice.jobOrderId)
      : undefined;

    const nextTrxId = dbState.transactions.reduce((m, t) => Math.max(m, t.id), 0) + 1;
    const transaction = {
      id: nextTrxId,
      transactionNumber: `TRX-2026-${9000 + nextTrxId}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      servicesPurchased: jobOrder
        ? jobOrder.servicesPerformed.map((s) => s.serviceName).join(', ') || 'Repair & Maintenance Labor'
        : 'Motorcycle Workshop Service',
      productsPurchased: jobOrder
        ? jobOrder.partsUsed.map((p) => `${p.productName} x${p.quantity}`).join(', ') || 'None'
        : 'None',
      totalAmount: invoice.totalAmount,
      paymentReceived: paid,
      changeGiven,
      paymentMethod,
      cashierName,
      transactionDate: nowTimestamp(),
    };

    dbState.transactions.unshift(transaction);
    logActivity(3, cashierName, 'cashier', 'Processed Payment', 'Billing & Payments', `Recorded ₱${paid.toLocaleString()} (${paymentMethod}) for ${invoice.invoiceNumber}`);
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });

    res.json({ invoice, transaction, state: dbState });
  });

  // Submit Customer Feedback -> triggers real-time WebSocket notification!
  app.post('/api/feedback', async (req, res) => {
    const { customerId, customerName, jobOrderNumber, serviceName, rating, comment } = req.body;
    if (!comment || !rating) {
      return res.status(400).json({ error: 'Rating and feedback comment are required.' });
    }

    const cleanRating = Math.min(5, Math.max(1, Number(rating) || 5));
    const nextId = dbState.feedback.reduce((m, f) => Math.max(m, f.id), 0) + 1;
    const resolvedName =
      customerName ||
      dbState.customers.find((c) => c.id === Number(customerId))?.fullName ||
      'Juanito B. Dela Cruz';

    const newFeedback = {
      id: nextId,
      customerId: Number(customerId) || 1,
      customerName: String(resolvedName).trim(),
      jobOrderNumber: jobOrderNumber ? String(jobOrderNumber).trim() : undefined,
      serviceName: String(serviceName || 'General Workshop Service').trim(),
      rating: cleanRating,
      comment: String(comment).trim(),
      createdAt: nowTimestamp(),
    };

    dbState.feedback.unshift(newFeedback);
    try {
      await insertFeedbackToCloudSql(newFeedback);
    } catch (error) {
      console.error('Error syncing feedback to Cloud SQL:', error);
    }
    logActivity(newFeedback.customerId, newFeedback.customerName, 'customer', 'Submitted Feedback', 'Customer Portal', `Rated ${cleanRating}/5 stars on ${newFeedback.serviceName}`);

    const notification = createAndBroadcastNotification({
      type: 'new_feedback',
      title: `New ${cleanRating}-Star Customer Feedback (${newFeedback.customerName})`,
      message: `${newFeedback.customerName} rated ${newFeedback.serviceName} ${cleanRating}/5: "${newFeedback.comment}"`,
      referenceId: newFeedback.jobOrderNumber || `FDB-${nextId}`,
      severity: 'success',
    });

    res.json({ feedback: newFeedback, notification, state: dbState });
  });

  // Trigger or test real-time notification broadcast directly
  app.post('/api/notifications/trigger', (req, res) => {
    const { type, title, message, targetCustomerId, referenceId } = req.body as {
      type: NotificationType;
      title?: string;
      message?: string;
      targetCustomerId?: number;
      referenceId?: string;
    };

    const presets: Record<NotificationType, { title: string; message: string; ref: string; custId?: number }> = {
      appointment_confirmed: {
        title: 'Appointment Confirmed: APT-2026-102',
        message: 'Mark Anthony Villanueva (Honda ADV 160 · CAR-7734) confirmed for Brake System Overhaul at 10:30 AM.',
        ref: 'APT-2026-102',
        custId: 2,
      },
      repair_status_changed: {
        title: 'Repair Status: Completed (JO-2026-001)',
        message: 'Yamaha NMAX 155 (CAR-4821) PMS & CVT Service marked as Completed by Rodel G. Dalisay.',
        ref: 'JO-2026-001',
        custId: 1,
      },
      low_stock_alert: {
        title: 'Low Stock Alert: Honda Genuine Air Filter (ADV 160)',
        message: 'Stock dropped to 3 units in Rack E-02 (Reorder threshold: 5 units).',
        ref: 'PRD-006',
      },
      new_feedback: {
        title: 'New 5-Star Feedback from Keisha Marie Dulnuan',
        message: '"EFI & Ultrasonic Injector Cleaning solved my cold-start stalling in Aurora Hill!" (5/5 Stars)',
        ref: 'APT-2026-103',
        custId: 3,
      },
    };

    const chosenType: NotificationType = type && presets[type] ? type : 'repair_status_changed';
    const preset = presets[chosenType];

    const notification = createAndBroadcastNotification({
      type: chosenType,
      title: title || preset.title,
      message: message || preset.message,
      targetCustomerId: targetCustomerId ?? preset.custId,
      referenceId: referenceId || preset.ref,
    });

    res.json({ notification, state: dbState });
  });

  // Mark notifications as read for a user
  app.post('/api/notifications/read', (req, res) => {
    const { userId, notificationId } = req.body as { userId: number; notificationId?: string };
    const uid = Number(userId) || 1;
    dbState.notifications.forEach((n) => {
      if (!notificationId || n.id === notificationId) {
        if (!n.readByUserIds.includes(uid)) {
          n.readByUserIds.push(uid);
        }
      }
    });
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });
    res.json({ state: dbState });
  });

  // Manage Users (Admin)
  app.post('/api/users', (req, res) => {
    const { username, fullName, email, phone, role, specialty } = req.body;
    if (!username || !fullName || !email || !role) {
      return res.status(400).json({ error: 'Username, full name, email, and role are required.' });
    }
    if (dbState.users.some((u) => u.username.toLowerCase() === String(username).trim().toLowerCase())) {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    const nextId = dbState.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    const newUser = {
      id: nextId,
      username: String(username).trim(),
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      phone: String(phone || '0917-000-0000').trim(),
      role: role as UserRole,
      specialty: specialty ? String(specialty).trim() : undefined,
      status: 'Active' as const,
      lastLogin: 'Never',
      twoFactorEnabled: false,
    };
    dbState.users.push(newUser);
    logActivity(1, 'Arturo C. Abad', 'admin', 'Created User Account', 'User Management', `Created ${newUser.role} account for ${newUser.fullName} (@${newUser.username})`);
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });
    res.json({ user: newUser, state: dbState });
  });

  app.patch('/api/users/:id/status', (req, res) => {
    const id = Number(req.params.id);
    const user = dbState.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    logActivity(1, 'Arturo C. Abad', 'admin', 'Updated User Status', 'User Management', `Set @${user.username} status to ${user.status}`);
    saveDatabase(dbState);
    broadcastWs({ event: 'state:updated', state: dbState });
    res.json({ user, state: dbState });
  });

  // Export SQL & XAMPP PHP bundle
  app.get('/api/export/xampp', (_req, res) => {
    const sqlPath = path.join(__dirname, 'database', 'ca_motorcycle_shop.sql');
    const phpDbPath = path.join(__dirname, 'xampp_php_project', 'config', 'db.php');
    const phpSecPath = path.join(__dirname, 'xampp_php_project', 'includes', 'security.php');
    const readmePath = path.join(__dirname, 'xampp_php_project', 'README_XAMPP_SETUP.md');

    res.json({
      sqlDump: fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf-8') : '',
      phpDbConfig: fs.existsSync(phpDbPath) ? fs.readFileSync(phpDbPath, 'utf-8') : '',
      phpSecurity: fs.existsSync(phpSecPath) ? fs.readFileSync(phpSecPath, 'utf-8') : '',
      xamppReadme: fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : '',
    });
  });

  // Vite middleware in dev / static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`C & A Motorcycle Shop Management System running on http://localhost:${PORT}`);
  });
}

startServer();
