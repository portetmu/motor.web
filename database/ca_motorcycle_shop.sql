-- ============================================================================
-- C & A MOTORCYCLE SHOP MANAGEMENT SYSTEM (BAGUIO CITY)
-- Database Name: ca_motorcycle_shop
-- Engine: MySQL 8.3+ / MariaDB 10.6+ (InnoDB, UTF8MB4)
-- Compliance: Philippine Data Privacy Act of 2012 (Republic Act No. 10173)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `ca_motorcycle_shop`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ca_motorcycle_shop`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE (Role-Based Access Control & Bcrypt Password Hashes)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password (PASSWORD_BCRYPT)',
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NOT NULL,
  `role` ENUM('admin', 'owner', 'cashier', 'mechanic', 'customer') NOT NULL,
  `specialty` VARCHAR(120) DEFAULT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `two_factor_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CUSTOMERS TABLE
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `customer_code` VARCHAR(30) NOT NULL UNIQUE,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `address` VARCHAR(255) NOT NULL,
  `barangay_city` VARCHAR(120) NOT NULL DEFAULT 'Baguio City',
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `notes` TEXT DEFAULT NULL,
  `date_registered` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. MOTORCYCLES TABLE
DROP TABLE IF EXISTS `motorcycles`;
CREATE TABLE `motorcycles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `brand` VARCHAR(60) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `plate_number` VARCHAR(30) NOT NULL UNIQUE,
  `motorcycle_type` ENUM('Scooter', 'Underbone', 'Sport Bike', 'Standard / Naked', 'Dual-Sport / Adventure', 'Cruiser') NOT NULL,
  `manufacture_year` YEAR NOT NULL,
  `engine_displacement` VARCHAR(60) DEFAULT NULL,
  `color` VARCHAR(50) DEFAULT NULL,
  `odometer_km` INT UNSIGNED NOT NULL DEFAULT 0,
  `vin_chassis` VARCHAR(60) UNIQUE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_motorcycles_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. SERVICES TABLE
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `service_code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `description` TEXT NOT NULL,
  `base_price` DECIMAL(10,2) NOT NULL,
  `estimated_duration_mins` INT UNSIGNED NOT NULL DEFAULT 60,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. SUPPLIERS TABLE
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `supplier_code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `contact_person` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `address` VARCHAR(255) NOT NULL,
  `category_supplied` VARCHAR(150) DEFAULT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. PRODUCTS (SPARE PARTS & ACCESSORIES INVENTORY) TABLE
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(160) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `quantity_available` INT NOT NULL DEFAULT 0,
  `reorder_level` INT NOT NULL DEFAULT 5,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `supplier_id` INT UNSIGNED DEFAULT NULL,
  `location_rack` VARCHAR(40) DEFAULT NULL,
  `date_added` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. APPOINTMENTS TABLE
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `appointment_number` VARCHAR(30) NOT NULL UNIQUE,
  `customer_id` INT UNSIGNED NOT NULL,
  `motorcycle_id` INT UNSIGNED NOT NULL,
  `service_id` INT UNSIGNED NOT NULL,
  `preferred_date` DATE NOT NULL,
  `preferred_time` TIME NOT NULL,
  `reported_problem` TEXT NOT NULL,
  `assigned_mechanic_id` INT UNSIGNED DEFAULT NULL,
  `status` ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_appointments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appointments_motorcycle` FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appointments_service` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_appointments_mechanic` FOREIGN KEY (`assigned_mechanic_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. JOB ORDERS TABLE
DROP TABLE IF EXISTS `job_orders`;
CREATE TABLE `job_orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `job_order_number` VARCHAR(30) NOT NULL UNIQUE,
  `appointment_id` INT UNSIGNED DEFAULT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `motorcycle_id` INT UNSIGNED NOT NULL,
  `odometer_km` INT UNSIGNED NOT NULL DEFAULT 0,
  `reported_problem` TEXT NOT NULL,
  `inspection_results` TEXT DEFAULT NULL,
  `assigned_mechanic_id` INT UNSIGNED NOT NULL,
  `labor_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `repair_notes` TEXT DEFAULT NULL,
  `status` ENUM('Pending', 'In Progress', 'Waiting for Parts', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `date_received` DATETIME NOT NULL,
  `completion_date` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_jo_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_jo_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_jo_motorcycle` FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_jo_mechanic` FOREIGN KEY (`assigned_mechanic_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 9. JOB ORDER SERVICES TABLE
DROP TABLE IF EXISTS `job_order_services`;
CREATE TABLE `job_order_services` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `job_order_id` INT UNSIGNED NOT NULL,
  `service_id` INT UNSIGNED NOT NULL,
  `service_price` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_jos_jo` FOREIGN KEY (`job_order_id`) REFERENCES `job_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jos_service` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 10. JOB ORDER PARTS USED TABLE
DROP TABLE IF EXISTS `job_order_parts`;
CREATE TABLE `job_order_parts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `job_order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_jop_jo` FOREIGN KEY (`job_order_id`) REFERENCES `job_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jop_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 11. INVENTORY MOVEMENTS TABLE
DROP TABLE IF EXISTS `inventory_movements`;
CREATE TABLE `inventory_movements` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT UNSIGNED NOT NULL,
  `movement_type` ENUM('Stock In', 'Job Order Deduction', 'Direct Counter Sale', 'Adjustment') NOT NULL,
  `quantity_change` INT NOT NULL,
  `previous_stock` INT NOT NULL,
  `new_stock` INT NOT NULL,
  `reference_code` VARCHAR(50) NOT NULL,
  `performed_by` VARCHAR(120) NOT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inv_mov_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. INVOICES TABLE
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(30) NOT NULL UNIQUE,
  `job_order_id` INT UNSIGNED DEFAULT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `service_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `labor_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `spare_parts_costs` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `accessories_costs` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('Unpaid', 'Partial', 'Paid') NOT NULL DEFAULT 'Unpaid',
  `issued_by` VARCHAR(120) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `paid_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_invoices_jo` FOREIGN KEY (`job_order_id`) REFERENCES `job_orders`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 13. PAYMENTS TABLE
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT UNSIGNED NOT NULL,
  `payment_method` ENUM('Cash', 'GCash', 'Maya', 'Bank Transfer') NOT NULL DEFAULT 'Cash',
  `amount_received` DECIMAL(10,2) NOT NULL,
  `change_given` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `reference_no` VARCHAR(80) DEFAULT NULL,
  `received_by` VARCHAR(120) NOT NULL,
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. TRANSACTIONS TABLE
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transaction_number` VARCHAR(30) NOT NULL UNIQUE,
  `invoice_id` INT UNSIGNED DEFAULT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `services_purchased` TEXT DEFAULT NULL,
  `products_purchased` TEXT DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `payment_received` DECIMAL(10,2) NOT NULL,
  `change_given` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('Cash', 'GCash', 'Maya', 'Bank Transfer') NOT NULL DEFAULT 'Cash',
  `cashier_name` VARCHAR(120) NOT NULL,
  `transaction_date` DATETIME NOT NULL,
  CONSTRAINT `fk_transactions_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 15. FEEDBACK TABLE
DROP TABLE IF EXISTS `feedback`;
CREATE TABLE `feedback` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `job_order_number` VARCHAR(30) DEFAULT NULL,
  `service_name` VARCHAR(150) NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment` TEXT NOT NULL,
  `staff_response` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_feedback_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. EMPLOYEE SCHEDULES TABLE
DROP TABLE IF EXISTS `employee_schedules`;
CREATE TABLE `employee_schedules` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `shift_days` VARCHAR(60) NOT NULL,
  `shift_hours` VARCHAR(60) NOT NULL,
  `bay_assignment` VARCHAR(100) NOT NULL,
  `status` ENUM('On Duty', 'Off Duty', 'On Leave') NOT NULL DEFAULT 'On Duty',
  CONSTRAINT `fk_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 17. ACTIVITY LOGS & AUDIT TRAIL TABLE
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `user_name` VARCHAR(120) NOT NULL,
  `user_role` VARCHAR(30) NOT NULL,
  `action` VARCHAR(120) NOT NULL,
  `module` VARCHAR(80) NOT NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18. REAL-TIME NOTIFICATIONS TABLE
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(40) PRIMARY KEY,
  `type` ENUM('appointment_confirmed', 'repair_status_changed', 'low_stock_alert', 'new_feedback') NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `message` TEXT NOT NULL,
  `target_roles` VARCHAR(120) NOT NULL COMMENT 'Comma-separated roles e.g. admin,owner,cashier,mechanic,customer',
  `target_customer_id` INT UNSIGNED DEFAULT NULL,
  `reference_id` VARCHAR(50) DEFAULT NULL,
  `severity` ENUM('info', 'success', 'warning', 'urgent') NOT NULL DEFAULT 'info',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SAMPLE DEMONSTRATION ACCOUNTS (Bcrypt password hashes for demo credentials)
-- Admin:    admin     / Admin@CA2026
-- Owner:    owner     / Owner@CA2026
-- Cashier:  cashier   / Cashier@CA2026
-- Mechanic: mechanic  / Mechanic@CA2026
-- Customer: customer  / Customer@CA2026
-- ============================================================================
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `email`, `phone`, `role`, `specialty`, `status`, `two_factor_enabled`, `last_login`) VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Arturo C. Abad', 'admin@camotorcycleshop.ph', '0917-501-1101', 'admin', 'System Security & Administration', 'Active', 1, NOW()),
(2, 'owner', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Clarissa A. Mendoza', 'owner@camotorcycleshop.ph', '0917-501-1102', 'owner', 'Operations & Financial Management', 'Active', 1, NOW()),
(3, 'cashier', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Maricar P. Balitaan', 'cashier@camotorcycleshop.ph', '0917-501-1103', 'cashier', 'Front Desk, POS & Billing', 'Active', 0, NOW()),
(4, 'mechanic', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Rodel G. Dalisay', 'rodel.mechanic@camotorcycleshop.ph', '0917-501-1104', 'mechanic', 'Master Engine & EFI Diagnostics (Bay 1)', 'Active', 0, NOW()),
(5, 'mechanic2', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jomar T. Carino', 'jomar.mechanic@camotorcycleshop.ph', '0917-501-1105', 'mechanic', 'CVT, Suspension & Brake Systems (Bay 2)', 'Active', 0, NOW()),
(6, 'customer', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juanito B. Dela Cruz', 'juanito.delacruz@gmail.com', '0917-824-9012', 'customer', NULL, 'Active', 0, NOW());

INSERT INTO `customers` (`id`, `user_id`, `customer_code`, `full_name`, `phone`, `email`, `address`, `barangay_city`, `status`, `notes`, `date_registered`) VALUES
(1, 6, 'CUST-2026-001', 'Juanito B. Dela Cruz', '0917-824-9012', 'juanito.delacruz@gmail.com', '#42 Assumption Road', 'Session Road Area, Baguio City', 'Active', 'Regular commuter rider, prefers synthetic oil.', '2026-01-14'),
(2, NULL, 'CUST-2026-002', 'Mark Anthony Villanueva', '0918-441-3321', 'mark.villanueva@yahoo.com', 'Blk 4 Lot 9 Eagle Crest Phase 2', 'Bakakeng Norte, Baguio City', 'Active', 'Weekend Cordilleran touring rider.', '2026-02-09'),
(3, NULL, 'CUST-2026-003', 'Keisha Marie Dulnuan', '0927-619-7780', 'keisha.dulnuan@slu.edu.ph', '#118 Bonifacio Street', 'Aurora Hill, Baguio City', 'Active', 'Daily scooter commuter.', '2026-03-22'),
(4, NULL, 'CUST-2026-004', 'Christian Paul Almeda', '0998-312-4509', 'cp.almeda@gmail.com', 'Km. 5 Pico Road', 'La Trinidad, Benguet', 'Active', 'Delivery fleet operator.', '2026-05-11'),
(5, NULL, 'CUST-2026-005', 'Kenneth Bangaoil', '0915-990-2214', 'kenneth.bangaoil@gmail.com', '#27 Kennon Road', 'Camp 7, Baguio City', 'Active', 'Frequent steep-grade brake maintenance.', '2026-07-03');
