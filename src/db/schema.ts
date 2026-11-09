import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  username: text('username').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull().default('0917-000-0000'),
  role: text('role').notNull().default('customer'),
  specialty: text('specialty'),
  status: text('status').notNull().default('Active'),
  customerId: integer('customer_id'),
  lastLogin: text('last_login').notNull().default('Never'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().default(''),
  address: text('address').notNull(),
  barangayCity: text('barangay_city').notNull().default('Baguio City'),
  dateRegistered: text('date_registered').notNull(),
  status: text('status').notNull().default('Active'),
  notes: text('notes').default(''),
});

export const motorcycles = pgTable('motorcycles', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  plateNumber: text('plate_number').notNull().unique(),
  type: text('type').notNull().default('Scooter'),
  year: integer('year').notNull().default(2024),
  engineDisplacement: text('engine_displacement').notNull().default('150cc'),
  color: text('color').notNull().default('Black'),
  odometerKm: integer('odometer_km').notNull().default(0),
  vinChassis: text('vin_chassis').notNull(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  basePrice: integer('base_price').notNull(),
  estimatedDurationMins: integer('estimated_duration_mins').notNull().default(60),
  isActive: boolean('is_active').notNull().default(true),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  contactPerson: text('contact_person').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
  categorySupplied: text('category_supplied').notNull(),
  status: text('status').notNull().default('Active'),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  productCode: text('product_code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  quantity: integer('quantity').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(5),
  unitPrice: integer('unit_price').notNull(),
  costPrice: integer('cost_price').notNull(),
  supplierId: integer('supplier_id').notNull().default(1),
  supplierName: text('supplier_name').notNull(),
  locationRack: text('location_rack').notNull().default('Rack A-01'),
  dateAdded: text('date_added').notNull(),
});

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  appointmentNumber: text('appointment_number').notNull().unique(),
  customerId: integer('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  motorcycleId: integer('motorcycle_id').notNull(),
  motorcycleSummary: text('motorcycle_summary').notNull(),
  plateNumber: text('plate_number').notNull(),
  serviceId: integer('service_id').notNull(),
  serviceName: text('service_name').notNull(),
  preferredDate: text('preferred_date').notNull(),
  preferredTime: text('preferred_time').notNull(),
  reportedProblem: text('reported_problem').notNull(),
  assignedMechanicId: integer('assigned_mechanic_id'),
  assignedMechanicName: text('assigned_mechanic_name'),
  status: text('status').notNull().default('Pending'),
  createdAt: text('created_at').notNull(),
});

export const jobOrders = pgTable('job_orders', {
  id: serial('id').primaryKey(),
  jobOrderNumber: text('job_order_number').notNull().unique(),
  appointmentId: integer('appointment_id'),
  customerId: integer('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  motorcycleId: integer('motorcycle_id').notNull(),
  motorcycleSummary: text('motorcycle_summary').notNull(),
  plateNumber: text('plate_number').notNull(),
  odometerKm: integer('odometer_km').notNull().default(0),
  reportedProblem: text('reported_problem').notNull(),
  inspectionResults: text('inspection_results').notNull(),
  assignedMechanicId: integer('assigned_mechanic_id').notNull(),
  assignedMechanicName: text('assigned_mechanic_name').notNull(),
  servicesPerformedJson: text('services_performed_json').notNull().default('[]'),
  partsUsedJson: text('parts_used_json').notNull().default('[]'),
  laborCharges: integer('labor_charges').notNull().default(0),
  repairNotes: text('repair_notes').notNull().default(''),
  dateReceived: text('date_received').notNull(),
  completionDate: text('completion_date'),
  status: text('status').notNull().default('Pending'),
  totalEstimated: integer('total_estimated').notNull().default(0),
  invoiceId: integer('invoice_id'),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  productCode: text('product_code').notNull(),
  productName: text('product_name').notNull(),
  movementType: text('movement_type').notNull(),
  quantityChange: integer('quantity_change').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  referenceCode: text('reference_code').notNull(),
  performedBy: text('performed_by').notNull(),
  createdAt: text('created_at').notNull(),
  notes: text('notes'),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  jobOrderId: integer('job_order_id'),
  jobOrderNumber: text('job_order_number'),
  customerId: integer('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  motorcycleSummary: text('motorcycle_summary'),
  serviceCharges: integer('service_charges').notNull().default(0),
  laborCharges: integer('labor_charges').notNull().default(0),
  sparePartsCosts: integer('spare_parts_costs').notNull().default(0),
  accessoriesCosts: integer('accessories_costs').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  amountPaid: integer('amount_paid').notNull().default(0),
  balanceDue: integer('balance_due').notNull().default(0),
  paymentStatus: text('payment_status').notNull().default('Unpaid'),
  paymentMethod: text('payment_method'),
  issuedBy: text('issued_by').notNull(),
  createdAt: text('created_at').notNull(),
  paidAt: text('paid_at'),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transactionNumber: text('transaction_number').notNull().unique(),
  invoiceId: integer('invoice_id'),
  invoiceNumber: text('invoice_number'),
  customerId: integer('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  servicesPurchased: text('services_purchased').notNull(),
  productsPurchased: text('products_purchased').notNull(),
  totalAmount: integer('total_amount').notNull(),
  paymentReceived: integer('payment_received').notNull(),
  changeGiven: integer('change_given').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('Cash'),
  cashierName: text('cashier_name').notNull(),
  transactionDate: text('transaction_date').notNull(),
});

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  jobOrderNumber: text('job_order_number'),
  serviceName: text('service_name').notNull(),
  rating: integer('rating').notNull().default(5),
  comment: text('comment').notNull(),
  createdAt: text('created_at').notNull(),
  staffResponse: text('staff_response'),
});

export const employeeSchedules = pgTable('employee_schedules', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  employeeName: text('employee_name').notNull(),
  role: text('role').notNull(),
  shiftDays: text('shift_days').notNull(),
  shiftHours: text('shift_hours').notNull(),
  bayAssignment: text('bay_assignment').notNull(),
  status: text('status').notNull().default('On Duty'),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  module: text('module').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address').notNull(),
  createdAt: text('created_at').notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  targetRolesJson: text('target_roles_json').notNull(),
  targetCustomerId: integer('target_customer_id'),
  referenceId: text('reference_id'),
  severity: text('severity').notNull().default('info'),
  createdAt: text('created_at').notNull(),
  readByUserIdsJson: text('read_by_user_ids_json').notNull().default('[]'),
});

export const customersRelations = relations(customers, ({ many }) => ({
  motorcycles: many(motorcycles),
  appointments: many(appointments),
  jobOrders: many(jobOrders),
}));

export const motorcyclesRelations = relations(motorcycles, ({ one }) => ({
  owner: one(customers, {
    fields: [motorcycles.customerId],
    references: [customers.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
  }),
}));

export const jobOrdersRelations = relations(jobOrders, ({ one }) => ({
  customer: one(customers, {
    fields: [jobOrders.customerId],
    references: [customers.id],
  }),
}));
