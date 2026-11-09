export type UserRole = 'admin' | 'owner' | 'cashier' | 'mechanic' | 'customer';

export type NotificationType =
  | 'appointment_confirmed'
  | 'repair_status_changed'
  | 'low_stock_alert'
  | 'new_feedback';

export interface ShopNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  targetRoles: UserRole[];
  targetCustomerId?: number;
  referenceId?: string;
  severity: 'info' | 'success' | 'warning' | 'urgent';
  createdAt: string;
  readByUserIds: number[];
}

export interface UserAccount {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  specialty?: string;
  customerId?: number;
  lastLogin: string;
  twoFactorEnabled?: boolean;
}

export interface Customer {
  id: number;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  barangayCity: string;
  dateRegistered: string;
  status: 'Active' | 'Inactive';
  notes?: string;
}

export interface Motorcycle {
  id: number;
  customerId: number;
  customerName: string;
  brand: string;
  model: string;
  plateNumber: string;
  type: 'Scooter' | 'Underbone' | 'Sport Bike' | 'Standard / Naked' | 'Dual-Sport / Adventure' | 'Cruiser';
  year: number;
  engineDisplacement: string;
  color: string;
  odometerKm: number;
  vinChassis: string;
}

export interface ServiceItem {
  id: number;
  code: string;
  name: string;
  category: 'Preventive Maintenance' | 'Engine & Transmission' | 'Electrical & EFI' | 'Brakes & Suspension' | 'Tires & Drivetrain';
  description: string;
  basePrice: number;
  estimatedDurationMins: number;
  isActive: boolean;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Appointment {
  id: number;
  appointmentNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  motorcycleId: number;
  motorcycleSummary: string;
  plateNumber: string;
  serviceId: number;
  serviceName: string;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: string; // HH:mm
  reportedProblem: string;
  assignedMechanicId?: number;
  assignedMechanicName?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export type RepairStatus =
  | 'Pending'
  | 'In Progress'
  | 'Waiting for Parts'
  | 'Completed'
  | 'Cancelled';

export interface JobOrderServiceLine {
  serviceId: number;
  serviceName: string;
  price: number;
}

export interface JobOrderPartLine {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface JobOrder {
  id: number;
  jobOrderNumber: string;
  appointmentId?: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  motorcycleId: number;
  motorcycleSummary: string;
  plateNumber: string;
  odometerKm: number;
  reportedProblem: string;
  inspectionResults: string;
  assignedMechanicId: number;
  assignedMechanicName: string;
  servicesPerformed: JobOrderServiceLine[];
  partsUsed: JobOrderPartLine[];
  laborCharges: number;
  repairNotes: string;
  dateReceived: string;
  completionDate?: string;
  status: RepairStatus;
  totalEstimated: number;
  invoiceId?: number;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  categorySupplied: string;
  status: 'Active' | 'Inactive';
}

export interface Product {
  id: number;
  productCode: string;
  name: string;
  category: 'Engine Oil & Fluids' | 'Brake System' | 'Drivetrain & Chains' | 'Electrical & Ignition' | 'Tires & Tubes' | 'Filters & Maintenance' | 'Suspension & Accessories';
  description: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  costPrice: number;
  supplierId: number;
  supplierName: string;
  locationRack: string;
  dateAdded: string;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  movementType: 'Stock In' | 'Job Order Deduction' | 'Direct Counter Sale' | 'Adjustment';
  quantityChange: number; // positive or negative
  previousStock: number;
  newStock: number;
  referenceCode: string;
  performedBy: string;
  createdAt: string;
  notes?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  jobOrderId?: number;
  jobOrderNumber?: string;
  customerId: number;
  customerName: string;
  motorcycleSummary?: string;
  serviceCharges: number;
  laborCharges: number;
  sparePartsCosts: number;
  accessoriesCosts: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
  paymentMethod?: 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer';
  issuedBy: string;
  createdAt: string;
  paidAt?: string;
}

export interface TransactionRecord {
  id: number;
  transactionNumber: string;
  invoiceId?: number;
  invoiceNumber?: string;
  customerId: number;
  customerName: string;
  servicesPurchased: string;
  productsPurchased: string;
  totalAmount: number;
  paymentReceived: number;
  changeGiven: number;
  paymentMethod: 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer';
  cashierName: string;
  transactionDate: string;
}

export interface CustomerFeedback {
  id: number;
  customerId: number;
  customerName: string;
  jobOrderNumber?: string;
  serviceName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  staffResponse?: string;
}

export interface EmployeeSchedule {
  id: number;
  userId: number;
  employeeName: string;
  role: UserRole;
  shiftDays: string;
  shiftHours: string;
  bayAssignment: string;
  status: 'On Duty' | 'Off Duty' | 'On Leave';
}

export interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface ShopDatabaseState {
  users: UserAccount[];
  customers: Customer[];
  motorcycles: Motorcycle[];
  services: ServiceItem[];
  appointments: Appointment[];
  jobOrders: JobOrder[];
  products: Product[];
  inventoryMovements: InventoryMovement[];
  suppliers: Supplier[];
  invoices: Invoice[];
  transactions: TransactionRecord[];
  feedback: CustomerFeedback[];
  employeeSchedules: EmployeeSchedule[];
  activityLogs: ActivityLog[];
  notifications: ShopNotification[];
}
