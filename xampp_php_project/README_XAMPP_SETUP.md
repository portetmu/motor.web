# C & A Motorcycle Shop Management System — XAMPP & phpMyAdmin Setup Guide

## 1. System Requirements
- **XAMPP**: v8.1.x or v8.2.x (Apache 2.4+, PHP 8.1+, MariaDB 10.6+ / MySQL 8.3+)
- **Web Browsers**: Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari

## 2. Installing and Running with XAMPP
1. Install **XAMPP** in `C:\xampp` (Windows) or `/opt/lampp` (Linux/macOS).
2. Copy the project folder into `C:\xampp\htdocs\ca_motorcycle_shop`.
3. Open the **XAMPP Control Panel** and click **Start** next to both **Apache** and **MySQL**.

## 3. Importing the Database into phpMyAdmin
1. Open your browser and navigate to `http://localhost/phpmyadmin`.
2. Click on the **Import** tab in the top navigation bar.
3. Click **Choose File** and select `/database/ca_motorcycle_shop.sql`.
4. Ensure the character set is set to `utf8mb4` and click **Import** (or **Go**) at the bottom.
5. Verify that the database `ca_motorcycle_shop` is created with all 18 relational tables (`users`, `customers`, `motorcycles`, `services`, `appointments`, `job_orders`, `job_order_services`, `job_order_parts`, `products`, `inventory_movements`, `suppliers`, `invoices`, `payments`, `transactions`, `feedback`, `employee_schedules`, `activity_logs`, `notifications`).

## 4. Demonstration Login Credentials for Testing
> **Security Note**: These credentials are for demonstration and testing only. Change all default passwords before production deployment.

| Role | Username | Password | Key Permissions & Real-Time Notifications |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Admin@CA2026` | Full system control, User Management, RBAC, Activity Logs, Database Backup, receives all 4 notification types |
| **Management / Owner** | `owner` | `Owner@CA2026` | Sales & Inventory Reports, Suppliers, Staff Schedules, receives Low Stock Alerts, New Feedback, Appointments & Repair updates |
| **Cashier / Front Desk** | `cashier` | `Cashier@CA2026` | Customer & Motorcycle Registration, Appointments, Job Orders, POS Billing & Printable Receipts, receives Appointments, Repairs & Low Stock |
| **Mechanic / Technician** | `mechanic` | `Mechanic@CA2026` | Assigned Repair Job Orders, Inspection Results, Parts Usage, Repair Status Updates, receives Repair Status Changes |
| **Customer** | `customer` | `Customer@CA2026` | Customer Portal (My Motorcycles, Book Appointment, Repair Tracking, Digital Receipts, Submit Feedback), receives own Appointment & Repair updates |
