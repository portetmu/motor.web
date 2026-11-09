import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Printer,
  Download,
  AlertTriangle,
  ArrowDownUp,
  CreditCard,
  Shield,
  Database,
  FileSpreadsheet,
  UserPlus,
} from 'lucide-react';
import type {
  Invoice,
  Product,
  ShopDatabaseState,
  UserAccount,
  UserRole,
} from '../types/shop';
import { shouldTriggerLowStockAlert } from '../utils/shopLogic';

interface InventoryBillingReportsProps {
  activeModule:
    | 'inventory'
    | 'billing'
    | 'sales'
    | 'reports'
    | 'users'
    | 'settings'
    | 'logs';
  dbState: ShopDatabaseState;
  currentUser: UserAccount;
  onStateChange: (newState: ShopDatabaseState) => void;
}

export const InventoryBillingReportsModules: React.FC<InventoryBillingReportsProps> = ({
  activeModule,
  dbState,
  currentUser,
  onStateChange,
}) => {
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inventory state
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [invSearch, setInvSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(-2);
  const [stockNotes, setStockNotes] = useState('Used in workshop bay / counter sale');
  const [prodForm, setProdForm] = useState({
    name: '',
    category: 'Filters & Maintenance',
    description: '',
    quantity: 4,
    reorderLevel: 5,
    unitPrice: 550,
    supplierId: 1,
    locationRack: 'Rack C-09',
  });

  // Billing state
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | 'Maya' | 'Bank Transfer'>(
    'Cash'
  );
  const [printingReceipt, setPrintingReceipt] = useState<Invoice | null>(null);

  // Reports state
  const [reportTab, setReportTab] = useState<
    'sales' | 'inventory' | 'lowstock' | 'repairs' | 'customers' | 'appointments'
  >('sales');
  const [salesCadence, setSalesCadence] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Users state
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '0917-555-0199',
    role: 'mechanic' as UserRole,
    specialty: 'General Service Technician',
  });

  // XAMPP / SQL Export state
  const [xamppBundle, setXamppBundle] = useState<{
    sqlDump: string;
    phpDbConfig: string;
    phpSecurity: string;
    xamppReadme: string;
  } | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'sql' | 'dbphp' | 'secphp' | 'readme'>('sql');

  useEffect(() => {
    if (activeModule === 'settings' && !xamppBundle) {
      fetch('/api/export/xampp')
        .then((r) => r.json())
        .then((d) => setXamppBundle(d))
        .catch(() => {});
    }
  }, [activeModule, xamppBundle]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  // --- INVENTORY HANDLERS ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prodForm),
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg('error', data.error || 'Could not add product.');
    } else {
      onStateChange(data.state);
      setShowAddProduct(false);
      setProdForm({ ...prodForm, name: '', description: '' });
      showMsg(
        'success',
        `Product ${data.product.name} (${data.product.productCode}) added to inventory.`
      );
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const res = await fetch(`/api/products/${adjustingProduct.id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantityDelta: stockDelta,
        movementType: stockDelta > 0 ? 'Stock In' : 'Direct Counter Sale',
        notes: stockNotes,
        performedBy: currentUser.fullName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg('error', data.error || 'Stock update failed.');
    } else {
      onStateChange(data.state);
      setAdjustingProduct(null);
      showMsg(
        'success',
        data.notification
          ? `Stock updated to ${data.product.quantity} & Low-Stock WebSocket Alert broadcast!`
          : `Stock updated to ${data.product.quantity} units.`
      );
    }
  };

  // --- BILLING HANDLERS ---
  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const res = await fetch(`/api/invoices/${payingInvoice.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountReceived: paymentAmount,
        paymentMethod,
        cashierName: currentUser.fullName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg('error', data.error || 'Payment failed.');
    } else {
      onStateChange(data.state);
      setPayingInvoice(null);
      setPrintingReceipt(data.invoice);
      showMsg(
        'success',
        `Payment recorded for ${data.invoice.invoiceNumber} (Transaction ${data.transaction.transactionNumber}).`
      );
    }
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg('error', data.error || 'Failed to create user.');
    } else {
      onStateChange(data.state);
      setShowAddUser(false);
      setUserForm({ ...userForm, username: '', fullName: '', email: '' });
      showMsg('success', `User @${data.user.username} (${data.user.role}) created.`);
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    const res = await fetch(`/api/users/${userId}/status`, { method: 'PATCH' });
    const data = await res.json();
    if (res.ok) {
      onStateChange(data.state);
      showMsg('success', `Updated @${data.user.username} status to ${data.user.status}.`);
    }
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            banner.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
              : 'bg-red-950/70 border-red-700 text-red-200'
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-neutral-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. INVENTORY MANAGEMENT MODULE */}
      {activeModule === 'inventory' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                Spare Parts &amp; Accessories Inventory
              </h1>
              <p className="text-xs text-neutral-400">
                Real-time stock quantities, incoming deliveries, automatic repair deductions, and
                WebSocket low-stock alerts
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                placeholder="Search part name or SKU..."
                aria-label="Search spare parts inventory"
                className="px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-white"
              />
              <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    stockFilter === 'all' ? 'bg-orange-600 text-white' : 'text-neutral-400'
                  }`}
                >
                  All Parts ({dbState.products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('low')}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    stockFilter === 'low' ? 'bg-amber-600 text-white' : 'text-neutral-400'
                  }`}
                >
                  Low Stock ({dbState.products.filter((p) => shouldTriggerLowStockAlert(p)).length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProduct((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {showAddProduct && (
            <form
              onSubmit={handleAddProduct}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500/50 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white">Add Spare Part or Accessory SKU</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    placeholder="e.g. Pirelli Angel Scooter Tire 120/70-14"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Category</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    <option value="Engine Oil & Fluids">Engine Oil &amp; Fluids</option>
                    <option value="Brake System">Brake System</option>
                    <option value="Drivetrain & Chains">Drivetrain &amp; Chains</option>
                    <option value="Electrical & Ignition">Electrical &amp; Ignition</option>
                    <option value="Tires & Tubes">Tires &amp; Tubes</option>
                    <option value="Filters & Maintenance">Filters &amp; Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Supplier</label>
                  <select
                    value={prodForm.supplierId}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, supplierId: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    value={prodForm.quantity}
                    onChange={(e) => setProdForm({ ...prodForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    Low-Stock Reorder Level
                  </label>
                  <input
                    type="number"
                    value={prodForm.reorderLevel}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, reorderLevel: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Unit Selling Price (₱)</label>
                  <input
                    type="number"
                    value={prodForm.unitPrice}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, unitPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Rack Location</label>
                  <input
                    type="text"
                    value={prodForm.locationRack}
                    onChange={(e) => setProdForm({ ...prodForm, locationRack: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-3.5 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg"
                >
                  Save Product SKU
                </button>
              </div>
            </form>
          )}

          {adjustingProduct && (
            <form
              onSubmit={handleAdjustStock}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Adjust Stock: {adjustingProduct.name} ({adjustingProduct.productCode})
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Current Stock: {adjustingProduct.quantity} · Reorder Threshold:{' '}
                    {adjustingProduct.reorderLevel} (Broadcasts real-time WebSocket Low-Stock Alert
                    if new stock ≤ {adjustingProduct.reorderLevel})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    Quantity Change (+ Restock / - Deduct)
                  </label>
                  <input
                    type="number"
                    value={stockDelta}
                    onChange={(e) => setStockDelta(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-300 mb-1">Movement Notes</label>
                  <input
                    type="text"
                    value={stockNotes}
                    onChange={(e) => setStockNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg"
                >
                  Apply Stock Update
                </button>
              </div>
            </form>
          )}

          {/* Inventory Products Table */}
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">SKU</th>
                  <th className="py-2.5 px-3 font-medium">Product Name &amp; Category</th>
                  <th className="py-2.5 px-3 font-medium">Supplier &amp; Rack</th>
                  <th className="py-2.5 px-3 font-medium text-right">Unit Price</th>
                  <th className="py-2.5 px-3 font-medium text-right">Available Qty</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.products
                  .filter((p) => (stockFilter === 'low' ? shouldTriggerLowStockAlert(p) : true))
                  .filter(
                    (p) =>
                      p.name.toLowerCase().includes(invSearch.toLowerCase()) ||
                      p.productCode.toLowerCase().includes(invSearch.toLowerCase()) ||
                      p.category.toLowerCase().includes(invSearch.toLowerCase())
                  )
                  .map((prod) => {
                    const isLow = shouldTriggerLowStockAlert(prod);
                    return (
                      <tr key={prod.id} className="hover:bg-neutral-800/40">
                        <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                          {prod.productCode}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-white">{prod.name}</div>
                          <div className="text-neutral-400">{prod.category}</div>
                        </td>
                        <td className="py-3 px-3 text-neutral-300">
                          <div>{prod.supplierName}</div>
                          <div className="text-neutral-500">{prod.locationRack}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                          ₱{prod.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          <span
                            className={`font-bold ${
                              isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {prod.quantity} pcs
                          </span>
                          <div className="text-[11px] text-neutral-500">
                            Reorder ≤ {prod.reorderLevel}
                            {isLow ? ' · LOW STOCK' : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingProduct(prod);
                              setStockDelta(-1);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded"
                          >
                            <ArrowDownUp className="w-3.5 h-3.5 text-orange-400" />
                            <span>Update Stock</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Inventory Movements Audit Table */}
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
            <h2 className="text-sm font-semibold text-white mb-3">
              Inventory Movement Ledger (Automatic Job Order Deductions &amp; Restocks)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2 px-3 font-medium">Timestamp</th>
                    <th className="py-2 px-3 font-medium">SKU &amp; Product</th>
                    <th className="py-2 px-3 font-medium">Movement Type</th>
                    <th className="py-2 px-3 font-medium text-right">Change</th>
                    <th className="py-2 px-3 font-medium text-right">New Balance</th>
                    <th className="py-2 px-3 font-medium">Reference / Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {dbState.inventoryMovements.slice(0, 8).map((mov) => (
                    <tr key={mov.id}>
                      <td className="py-2 px-3 font-mono text-neutral-400">{mov.createdAt}</td>
                      <td className="py-2 px-3 text-white font-medium">
                        {mov.productCode} · {mov.productName}
                      </td>
                      <td className="py-2 px-3 text-neutral-300">{mov.movementType}</td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-semibold ${
                          mov.quantityChange > 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {mov.quantityChange > 0 ? `+${mov.quantityChange}` : mov.quantityChange}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white">
                        {mov.newStock} pcs
                      </td>
                      <td className="py-2 px-3 text-neutral-400">
                        <span className="font-mono text-orange-400">{mov.referenceCode}</span> ·{' '}
                        {mov.performedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. BILLING AND PAYMENTS MODULE */}
      {activeModule === 'billing' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                Billing, Invoices &amp; Shop Payments
              </h1>
              <p className="text-xs text-neutral-400">
                Automatically calculate service + labor + spare parts totals, record shop payments,
                and print official receipts
              </p>
            </div>
          </div>

          {payingInvoice && (
            <form
              onSubmit={handlePayInvoice}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Process Shop Payment for {payingInvoice.invoiceNumber} (
                  {payingInvoice.customerName})
                </h2>
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Total Balance Due</label>
                  <div className="px-3 py-2 text-sm font-mono font-bold text-orange-400 bg-neutral-950 rounded-lg border border-neutral-800">
                    ₱{payingInvoice.balanceDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    Amount Tendered (PHP) *
                  </label>
                  <input
                    type="number"
                    required
                    min={payingInvoice.balanceDue}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    <option value="Cash">Cash (Front Desk Counter)</option>
                    <option value="GCash">GCash QR Verified</option>
                    <option value="Maya">Maya Terminal</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-mono text-neutral-300">
                  Change to Return: ₱
                  {Math.max(0, paymentAmount - payingInvoice.balanceDue).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                >
                  Confirm Payment &amp; Generate Receipt
                </button>
              </div>
            </form>
          )}

          {printingReceipt && (
            <div className="p-6 rounded-xl bg-white text-neutral-900 border border-neutral-300 max-w-xl mx-auto space-y-4">
              <div className="flex items-start justify-between border-b border-neutral-300 pb-3">
                <div>
                  <h2 className="text-lg font-bold">C &amp; A MOTORCYCLE SHOP</h2>
                  <p className="text-xs text-neutral-600">
                    #218 Magsaysay Avenue, Baguio City · Tel (074) 442-8910
                  </p>
                  <p className="text-xs font-mono mt-1">
                    OFFICIAL SERVICE &amp; PARTS RECEIPT: {printingReceipt.invoiceNumber}
                  </p>
                </div>
                <div className="flex gap-2 no-print">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintingReceipt(null)}
                    className="px-2.5 py-1.5 text-xs bg-neutral-200 text-neutral-800 rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="text-xs space-y-1">
                <div>
                  <strong>Customer:</strong> {printingReceipt.customerName}
                </div>
                <div>
                  <strong>Vehicle:</strong> {printingReceipt.motorcycleSummary || 'Counter Sale'}
                </div>
                <div>
                  <strong>Job Order Ref:</strong> {printingReceipt.jobOrderNumber || 'Direct'}
                </div>
                <div>
                  <strong>Date Issued:</strong> {printingReceipt.createdAt}
                </div>
              </div>
              <div className="border-t border-b border-neutral-300 py-3 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span>Service Package Charges:</span>
                  <span>₱{printingReceipt.serviceCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Technician Labor Charges:</span>
                  <span>₱{printingReceipt.laborCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spare Parts &amp; Fluids Used:</span>
                  <span>₱{printingReceipt.sparePartsCosts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-neutral-200">
                  <span>TOTAL AMOUNT DUE:</span>
                  <span>₱{printingReceipt.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>PAYMENT STATUS ({printingReceipt.paymentMethod || 'Cash'}):</span>
                  <span>{printingReceipt.paymentStatus.toUpperCase()}</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 text-center">
                Thank you for trusting C &amp; A Motorcycle Shop, Baguio City!
              </p>
            </div>
          )}

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">Invoice No.</th>
                  <th className="py-2.5 px-3 font-medium">Job Order</th>
                  <th className="py-2.5 px-3 font-medium">Customer &amp; Vehicle</th>
                  <th className="py-2.5 px-3 font-medium text-right">Services + Labor</th>
                  <th className="py-2.5 px-3 font-medium text-right">Spare Parts</th>
                  <th className="py-2.5 px-3 font-medium text-right">Total Bill</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-800/40">
                    <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-300">
                      {inv.jobOrderNumber || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{inv.customerName}</div>
                      <div className="text-neutral-400">{inv.motorcycleSummary}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300">
                      ₱{(inv.serviceCharges + inv.laborCharges).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300">
                      ₱{inv.sparePartsCosts.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-white">
                      ₱{inv.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          inv.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                      {inv.paymentStatus !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingInvoice(inv);
                            setPaymentAmount(inv.balanceDue);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPrintingReceipt(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SALES AND TRANSACTIONS MODULE */}
      {activeModule === 'sales' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-white font-display">
              Sales &amp; Transaction History
            </h1>
            <p className="text-xs text-neutral-400">
              Complete ledger of settled repair bills and spare parts sales at C &amp; A Motorcycle
              Shop
            </p>
          </div>
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">Transaction No.</th>
                  <th className="py-2.5 px-3 font-medium">Date &amp; Time</th>
                  <th className="py-2.5 px-3 font-medium">Customer</th>
                  <th className="py-2.5 px-3 font-medium">Services Purchased</th>
                  <th className="py-2.5 px-3 font-medium">Products Purchased</th>
                  <th className="py-2.5 px-3 font-medium">Method</th>
                  <th className="py-2.5 px-3 font-medium text-right">Total Amount</th>
                  <th className="py-2.5 px-3 font-medium text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-neutral-800/40">
                    <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                      {trx.transactionNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400">{trx.transactionDate}</td>
                    <td className="py-3 px-3 font-medium text-white">{trx.customerName}</td>
                    <td className="py-3 px-3 text-neutral-300 max-w-xs truncate">
                      {trx.servicesPurchased}
                    </td>
                    <td className="py-3 px-3 text-neutral-300 max-w-xs truncate">
                      {trx.productsPurchased}
                    </td>
                    <td className="py-3 px-3 text-neutral-300">{trx.paymentMethod}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-white">
                      ₱{trx.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400">
                      ₱{trx.paymentReceived.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. REPORTS MODULE */}
      {activeModule === 'reports' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                Business &amp; Operational Reports Module
              </h1>
              <p className="text-xs text-neutral-400">
                Generate printable Daily/Weekly/Monthly Sales, Inventory, Low-Stock, Repair,
                Customer, and Appointment reports
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1.5 bg-neutral-900 rounded-xl border border-neutral-800 no-print">
            {(
              [
                { id: 'sales', label: 'Sales Reports (Daily / Weekly / Monthly)' },
                { id: 'inventory', label: 'Inventory Report' },
                { id: 'lowstock', label: 'Low-Stock Report' },
                { id: 'repairs', label: 'Repair & Maintenance Report' },
                { id: 'customers', label: 'Customer Report' },
                { id: 'appointments', label: 'Appointment Report' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReportTab(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  reportTab === t.id
                    ? 'bg-orange-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white uppercase">
                  C &amp; A Motorcycle Shop — Official {reportTab} Report
                </h2>
                <p className="text-xs text-neutral-400">
                  Generated by {currentUser.fullName} ({currentUser.role.toUpperCase()}) · Baguio
                  City
                </p>
              </div>
              {reportTab === 'sales' && (
                <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 no-print">
                  {(['daily', 'weekly', 'monthly'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSalesCadence(c)}
                      className={`px-2.5 py-1 text-xs capitalize rounded ${
                        salesCadence === c ? 'bg-orange-600 text-white' : 'text-neutral-400'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {reportTab === 'sales' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-xs text-neutral-400">
                      {salesCadence.toUpperCase()} Gross Revenue
                    </div>
                    <div className="text-xl font-bold font-mono text-orange-400 mt-1">
                      ₱
                      {dbState.transactions
                        .reduce((s, t) => s + t.totalAmount, 0)
                        .toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-xs text-neutral-400">Completed Transactions</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {dbState.transactions.length}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-xs text-neutral-400">Average Ticket Size</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      ₱
                      {Math.round(
                        dbState.transactions.reduce((s, t) => s + t.totalAmount, 0) /
                          Math.max(1, dbState.transactions.length)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="py-2 px-3">Transaction</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Customer</th>
                      <th className="py-2 px-3">Payment Method</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {dbState.transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2 px-3 font-mono text-orange-400">
                          {t.transactionNumber}
                        </td>
                        <td className="py-2 px-3 font-mono text-neutral-400">
                          {t.transactionDate}
                        </td>
                        <td className="py-2 px-3 text-white">{t.customerName}</td>
                        <td className="py-2 px-3 text-neutral-300">{t.paymentMethod}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white">
                          ₱{t.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(reportTab === 'inventory' || reportTab === 'lowstock') && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Qty Available</th>
                    <th className="py-2 px-3 text-right">Reorder Level</th>
                    <th className="py-2 px-3 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {dbState.products
                    .filter((p) =>
                      reportTab === 'lowstock' ? shouldTriggerLowStockAlert(p) : true
                    )
                    .map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono text-orange-400">{p.productCode}</td>
                        <td className="py-2 px-3 text-white">{p.name}</td>
                        <td className="py-2 px-3 text-neutral-400">{p.category}</td>
                        <td className="py-2 px-3 text-right font-mono text-white">{p.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-neutral-400">
                          {p.reorderLevel}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-white">
                          ₱{(p.quantity * p.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {reportTab === 'repairs' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2 px-3">Job Order</th>
                    <th className="py-2 px-3">Customer &amp; Bike</th>
                    <th className="py-2 px-3">Mechanic</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Total Charges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {dbState.jobOrders.map((j) => (
                    <tr key={j.id}>
                      <td className="py-2 px-3 font-mono text-orange-400">{j.jobOrderNumber}</td>
                      <td className="py-2 px-3 text-white">
                        {j.customerName} ({j.motorcycleSummary})
                      </td>
                      <td className="py-2 px-3 text-neutral-300">{j.assignedMechanicName}</td>
                      <td className="py-2 px-3 text-white">{j.status}</td>
                      <td className="py-2 px-3 text-right font-mono text-white">
                        ₱{j.totalEstimated.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportTab === 'customers' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2 px-3">Customer Code</th>
                    <th className="py-2 px-3">Full Name</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">Barangay / City</th>
                    <th className="py-2 px-3">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {dbState.customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 px-3 font-mono text-orange-400">{c.code}</td>
                      <td className="py-2 px-3 text-white">{c.fullName}</td>
                      <td className="py-2 px-3 font-mono text-neutral-300">{c.phone}</td>
                      <td className="py-2 px-3 text-neutral-300">{c.barangayCity}</td>
                      <td className="py-2 px-3 font-mono text-neutral-400">{c.dateRegistered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportTab === 'appointments' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2 px-3">Appointment</th>
                    <th className="py-2 px-3">Schedule</th>
                    <th className="py-2 px-3">Customer &amp; Plate</th>
                    <th className="py-2 px-3">Requested Service</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {dbState.appointments.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 px-3 font-mono text-orange-400">
                        {a.appointmentNumber}
                      </td>
                      <td className="py-2 px-3 font-mono text-white">
                        {a.preferredDate} {a.preferredTime}
                      </td>
                      <td className="py-2 px-3 text-white">
                        {a.customerName} ({a.plateNumber})
                      </td>
                      <td className="py-2 px-3 text-neutral-300">{a.serviceName}</td>
                      <td className="py-2 px-3 text-white font-semibold">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 5. USER MANAGEMENT MODULE (ADMIN) */}
      {activeModule === 'users' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                User Accounts &amp; Role-Based Access Control (RBAC)
              </h1>
              <p className="text-xs text-neutral-400">
                Create, edit, and deactivate staff and customer accounts across all 5 system roles
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddUser((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create User Account</span>
            </button>
          </div>

          {showAddUser && (
            <form
              onSubmit={handleCreateUser}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500/50 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white">Create Staff or Role Account</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Role *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    <option value="admin">Administrator</option>
                    <option value="owner">Management / Owner</option>
                    <option value="cashier">Cashier / Front Desk</option>
                    <option value="mechanic">Mechanic / Technician</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-300 mb-1">
                    Department / Bay Specialty
                  </label>
                  <input
                    type="text"
                    value={userForm.specialty}
                    onChange={(e) => setUserForm({ ...userForm, specialty: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg"
                >
                  Save User Account
                </button>
              </div>
            </form>
          )}

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Email &amp; Phone</th>
                  <th className="py-2.5 px-3">Last Login</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                      @{u.username}
                    </td>
                    <td className="py-3 px-3 font-medium text-white">{u.fullName}</td>
                    <td className="py-3 px-3 uppercase font-semibold text-neutral-200">
                      {u.role}
                    </td>
                    <td className="py-3 px-3 text-neutral-300">
                      <div>{u.email}</div>
                      <div className="font-mono text-neutral-500">{u.phone}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400">{u.lastLogin}</td>
                    <td className="py-3 px-3 text-white">{u.status}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u.id)}
                        className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded"
                      >
                        {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. ACTIVITY LOGS & AUDIT TRAIL */}
      {activeModule === 'logs' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-white font-display">
              System Activity Logs &amp; Security Audit Trail
            </h1>
            <p className="text-xs text-neutral-400">
              Chronological audit trail of logins, appointment confirmations, repair updates,
              inventory deductions, and payments
            </p>
          </div>
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User &amp; Role</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.activityLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 px-3 font-mono text-neutral-400">{log.createdAt}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-white">{log.userName}</span> ·{' '}
                      <span className="uppercase text-orange-400">{log.userRole}</span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300">{log.module}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{log.action}</td>
                    <td className="py-2.5 px-3 text-neutral-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. SYSTEM SETTINGS, BACKUP & XAMPP PHP 8.1 / MYSQL 8.3 EXPORT */}
      {activeModule === 'settings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                System Settings, Database Backup &amp; XAMPP Deployment Package
              </h1>
              <p className="text-xs text-neutral-400">
                Download `ca_motorcycle_shop.sql`, PHP 8.1+ PDO modules, and XAMPP + phpMyAdmin
                installation guide
              </p>
            </div>
            {xamppBundle && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile('ca_motorcycle_shop.sql', xamppBundle.sqlDump)
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ca_motorcycle_shop.sql</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      'ca_motorcycle_shop_backup.json',
                      JSON.stringify(dbState, null, 2)
                    )
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"
                >
                  <Database className="w-3.5 h-3.5 text-orange-400" />
                  <span>Backup Live Database Snapshot</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveCodeTab('sql')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  activeCodeTab === 'sql' ? 'bg-orange-600 text-white' : 'text-neutral-400'
                }`}
              >
                database/ca_motorcycle_shop.sql (MySQL 8.3+)
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab('readme')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  activeCodeTab === 'readme' ? 'bg-orange-600 text-white' : 'text-neutral-400'
                }`}
              >
                XAMPP &amp; phpMyAdmin Setup Guide
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab('dbphp')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  activeCodeTab === 'dbphp' ? 'bg-orange-600 text-white' : 'text-neutral-400'
                }`}
              >
                config/db.php (PHP 8.1 PDO)
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab('secphp')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  activeCodeTab === 'secphp' ? 'bg-orange-600 text-white' : 'text-neutral-400'
                }`}
              >
                includes/security.php (RBAC, CSRF &amp; Notifications)
              </button>
            </div>

            <pre className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200 overflow-x-auto max-h-96">
              {xamppBundle
                ? activeCodeTab === 'sql'
                  ? xamppBundle.sqlDump
                  : activeCodeTab === 'readme'
                  ? xamppBundle.xamppReadme
                  : activeCodeTab === 'dbphp'
                  ? xamppBundle.phpDbConfig
                  : xamppBundle.phpSecurity
                : 'Loading XAMPP & MySQL package files...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
