import React, { useState } from 'react';
import {
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Wrench,
  FileText,
  Bike,
  UserPlus,
  CalendarPlus,
} from 'lucide-react';
import type {
  AppointmentStatus,
  Customer,
  JobOrder,
  Motorcycle,
  RepairStatus,
  ShopDatabaseState,
  UserAccount,
} from '../types/shop';

interface OperationsModulesProps {
  activeModule: 'customers' | 'motorcycles' | 'appointments' | 'repairs';
  dbState: ShopDatabaseState;
  currentUser: UserAccount;
  onStateChange: (newState: ShopDatabaseState) => void;
  onNavigateModule: (mod: string) => void;
}

export const OperationsModules: React.FC<OperationsModulesProps> = ({
  activeModule,
  dbState,
  currentUser,
  onStateChange,
  onNavigateModule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Customer Management State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [custForm, setCustForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    barangayCity: 'Baguio City',
    notes: '',
  });

  // Motorcycle Management State
  const [showAddMoto, setShowAddMoto] = useState(false);
  const [selectedMotoHistory, setSelectedMotoHistory] = useState<Motorcycle | null>(null);
  const [motoForm, setMotoForm] = useState({
    customerId: dbState.customers[0]?.id || 1,
    brand: 'Yamaha',
    model: '',
    plateNumber: '',
    type: 'Scooter',
    year: 2025,
    engineDisplacement: '155cc',
    color: 'Matte Black',
    odometerKm: 1200,
    vinChassis: '',
  });

  // Appointment Management State
  const [aptFilter, setAptFilter] = useState<'All' | AppointmentStatus>('All');
  const [showAddApt, setShowAddApt] = useState(false);
  const [aptForm, setAptForm] = useState({
    customerId: dbState.customers[0]?.id || 1,
    motorcycleId: dbState.motorcycles[0]?.id || 1,
    serviceId: dbState.services[0]?.id || 1,
    preferredDate: '2026-11-12',
    preferredTime: '10:00',
    reportedProblem: '',
    assignedMechanicId: 4,
  });

  // Repair / Job Order Management State
  const [repairFilter, setRepairFilter] = useState<'All' | RepairStatus>('All');
  const [showAddJo, setShowAddJo] = useState(false);
  const [editingJo, setEditingJo] = useState<JobOrder | null>(null);
  const [joUpdateForm, setJoUpdateForm] = useState({
    status: 'In Progress' as RepairStatus,
    inspectionResults: '',
    repairNotes: '',
    laborCharges: 350,
    addPartProductId: '',
    addPartQuantity: 1,
  });
  const [newJoForm, setNewJoForm] = useState({
    customerId: dbState.customers[0]?.id || 1,
    motorcycleId: dbState.motorcycles[0]?.id || 1,
    assignedMechanicId: 4,
    serviceIds: [1],
    reportedProblem: '',
    inspectionResults: 'Initial bay check in progress.',
    laborCharges: 350,
  });

  const notify = (type: 'success' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  // --- HANDLERS ---
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(custForm),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('error', data.error || 'Failed to add customer.');
    } else {
      onStateChange(data.state);
      setShowAddCustomer(false);
      setCustForm({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        barangayCity: 'Baguio City',
        notes: '',
      });
      notify('success', `Customer ${data.customer.fullName} (${data.customer.code}) registered.`);
    }
  };

  const handleToggleCustomerStatus = async (cust: Customer) => {
    const nextStatus = cust.status === 'Active' ? 'Inactive' : 'Active';
    const res = await fetch(`/api/customers/${cust.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      onStateChange(data.state);
      notify('success', `Updated ${cust.fullName} status to ${nextStatus}.`);
    }
  };

  const handleAddMotorcycle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/motorcycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(motoForm),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('error', data.error || 'Failed to register motorcycle.');
    } else {
      onStateChange(data.state);
      setShowAddMoto(false);
      setMotoForm({ ...motoForm, model: '', plateNumber: '', vinChassis: '' });
      notify(
        'success',
        `Motorcycle ${data.motorcycle.brand} ${data.motorcycle.model} (${data.motorcycle.plateNumber}) registered.`
      );
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aptForm),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('error', data.error || 'Appointment conflict or invalid fields.');
    } else {
      onStateChange(data.state);
      setShowAddApt(false);
      setAptForm({ ...aptForm, reportedProblem: '' });
      notify('success', `Appointment ${data.appointment.appointmentNumber} scheduled.`);
    }
  };

  const handleUpdateAppointmentStatus = async (aptId: number, status: AppointmentStatus) => {
    const res = await fetch(`/api/appointments/${aptId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      onStateChange(data.state);
      notify(
        'success',
        status === 'Confirmed'
          ? `Appointment confirmed & real-time WebSocket notification broadcast!`
          : `Appointment status updated to ${status}.`
      );
    }
  };

  const handleCreateJobOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/job-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newJoForm),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('error', data.error || 'Could not create job order.');
    } else {
      onStateChange(data.state);
      setShowAddJo(false);
      setNewJoForm({ ...newJoForm, reportedProblem: '' });
      notify(
        'success',
        `Job Order ${data.jobOrder.jobOrderNumber} created & assigned to ${data.jobOrder.assignedMechanicName}.`
      );
    }
  };

  const handleSaveJobOrderUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJo) return;
    const res = await fetch(`/api/job-orders/${editingJo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: joUpdateForm.status,
        inspectionResults: joUpdateForm.inspectionResults,
        repairNotes: joUpdateForm.repairNotes,
        laborCharges: joUpdateForm.laborCharges,
        addPartProductId: joUpdateForm.addPartProductId ? Number(joUpdateForm.addPartProductId) : undefined,
        addPartQuantity: joUpdateForm.addPartQuantity,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('error', data.error || 'Failed to update job order.');
    } else {
      onStateChange(data.state);
      setEditingJo(null);
      notify(
        'success',
        `Job Order ${data.jobOrder.jobOrderNumber} updated (${data.jobOrder.status}) & real-time WebSocket event broadcast!`
      );
    }
  };

  const handleGenerateInvoice = async (jo: JobOrder) => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobOrderId: jo.id }),
    });
    const data = await res.json();
    if (res.ok) {
      onStateChange(data.state);
      notify('success', `Invoice ${data.invoice.invoiceNumber} generated. Opening Billing module...`);
      setTimeout(() => onNavigateModule('billing'), 600);
    }
  };

  return (
    <div className="space-y-6">
      {feedbackBanner && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
              : 'bg-red-950/70 border-red-700 text-red-200'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-neutral-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. CUSTOMER MANAGEMENT MODULE */}
      {activeModule === 'customers' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                Customer Management Module
              </h1>
              <p className="text-xs text-neutral-400">
                Register customers, search contact records, and inspect vehicle &amp; repair history
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or phone..."
                  aria-label="Search customers by name or phone"
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomer((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Customer</span>
              </button>
            </div>
          </div>

          {showAddCustomer && (
            <form
              onSubmit={handleAddCustomer}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500/50 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white">Register New Shop Customer</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={custForm.fullName}
                    onChange={(e) => setCustForm({ ...custForm, fullName: e.target.value })}
                    placeholder="e.g. Noel B. Cariño"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={custForm.phone}
                    onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                    placeholder="0917-XXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={custForm.email}
                    onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                    placeholder="customer@email.com"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={custForm.address}
                    onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                    placeholder="#85 Session Road"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Barangay / City</label>
                  <input
                    type="text"
                    value={custForm.barangayCity}
                    onChange={(e) => setCustForm({ ...custForm, barangayCity: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Rider Notes</label>
                  <input
                    type="text"
                    value={custForm.notes}
                    onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })}
                    placeholder="Preferred oil or schedule"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="px-3.5 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg"
                >
                  Save Customer Record
                </button>
              </div>
            </form>
          )}

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">Code</th>
                  <th className="py-2.5 px-3 font-medium">Customer Name</th>
                  <th className="py-2.5 px-3 font-medium">Contact &amp; Email</th>
                  <th className="py-2.5 px-3 font-medium">Address</th>
                  <th className="py-2.5 px-3 font-medium">Motorcycles</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.customers
                  .filter(
                    (c) =>
                      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.phone.includes(searchQuery) ||
                      c.code.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((cust) => {
                    const custMotos = dbState.motorcycles.filter((m) => m.customerId === cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-neutral-800/40">
                        <td className="py-3 px-3 font-mono text-orange-400 font-semibold">
                          {cust.code}
                        </td>
                        <td className="py-3 px-3 font-medium text-white">{cust.fullName}</td>
                        <td className="py-3 px-3">
                          <div className="font-mono tabular-nums text-neutral-200">{cust.phone}</div>
                          <div className="text-neutral-400">{cust.email || '—'}</div>
                        </td>
                        <td className="py-3 px-3 text-neutral-300">
                          {cust.address}, {cust.barangayCity}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-neutral-200">
                          {custMotos.length} unit(s)
                        </td>
                        <td className="py-3 px-3 text-neutral-300">{cust.status}</td>
                        <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded"
                          >
                            View History
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCustomerStatus(cust)}
                            className="px-2.5 py-1 text-xs bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded"
                          >
                            {cust.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {selectedCustomer && (
            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Customer Dossier: {selectedCustomer.fullName} ({selectedCustomer.code})
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Registered Motorcycles &amp; Service Job Order History
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-3 py-1 text-xs bg-neutral-800 text-neutral-300 rounded"
                >
                  Close Dossier
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                  <h4 className="text-xs font-semibold text-orange-400 mb-2">
                    Associated Motorcycles
                  </h4>
                  {dbState.motorcycles
                    .filter((m) => m.customerId === selectedCustomer.id)
                    .map((m) => (
                      <div key={m.id} className="text-xs py-1.5 border-b border-neutral-800 last:border-0">
                        <span className="font-semibold text-white">
                          {m.brand} {m.model}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono text-orange-400">{m.plateNumber}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums text-neutral-400">
                          {m.odometerKm.toLocaleString()} km
                        </span>
                      </div>
                    ))}
                </div>
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
                  <h4 className="text-xs font-semibold text-orange-400 mb-2">
                    Repair &amp; Service History
                  </h4>
                  {dbState.jobOrders
                    .filter((j) => j.customerId === selectedCustomer.id)
                    .map((j) => (
                      <div key={j.id} className="text-xs py-1.5 border-b border-neutral-800 last:border-0">
                        <span className="font-mono font-semibold text-white">
                          {j.jobOrderNumber}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{j.status}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums text-orange-400">
                          ₱{j.totalEstimated.toLocaleString()}
                        </span>
                        <p className="text-neutral-400 text-[11px] mt-0.5">{j.inspectionResults}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MOTORCYCLE MANAGEMENT MODULE */}
      {activeModule === 'motorcycles' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                Motorcycle Management Module
              </h1>
              <p className="text-xs text-neutral-400">
                Maintain customer vehicle registry, plate numbers, odometer readings, and service logs
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search plate, brand, owner..."
                  aria-label="Search motorcycles"
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddMoto((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Register Motorcycle</span>
              </button>
            </div>
          </div>

          {showAddMoto && (
            <form
              onSubmit={handleAddMotorcycle}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500/50 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white">Register Customer Motorcycle</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Owner / Customer *</label>
                  <select
                    value={motoForm.customerId}
                    onChange={(e) =>
                      setMotoForm({ ...motoForm, customerId: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={motoForm.brand}
                    onChange={(e) => setMotoForm({ ...motoForm, brand: e.target.value })}
                    placeholder="Yamaha / Honda / Kawasaki"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={motoForm.model}
                    onChange={(e) => setMotoForm({ ...motoForm, model: e.target.value })}
                    placeholder="e.g. Aerox 155 V2"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Plate Number *</label>
                  <input
                    type="text"
                    required
                    value={motoForm.plateNumber}
                    onChange={(e) => setMotoForm({ ...motoForm, plateNumber: e.target.value })}
                    placeholder="CAR-5501"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Motorcycle Type</label>
                  <select
                    value={motoForm.type}
                    onChange={(e) => setMotoForm({ ...motoForm, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    <option value="Scooter">Scooter</option>
                    <option value="Underbone">Underbone</option>
                    <option value="Sport Bike">Sport Bike</option>
                    <option value="Standard / Naked">Standard / Naked</option>
                    <option value="Dual-Sport / Adventure">Dual-Sport / Adventure</option>
                    <option value="Cruiser">Cruiser</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Year Model</label>
                  <input
                    type="number"
                    value={motoForm.year}
                    onChange={(e) => setMotoForm({ ...motoForm, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={motoForm.odometerKm}
                    onChange={(e) =>
                      setMotoForm({ ...motoForm, odometerKm: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Engine / Color</label>
                  <input
                    type="text"
                    value={motoForm.engineDisplacement}
                    onChange={(e) =>
                      setMotoForm({ ...motoForm, engineDisplacement: e.target.value })
                    }
                    placeholder="155cc Liquid-Cooled"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMoto(false)}
                  className="px-3.5 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg"
                >
                  Save Motorcycle
                </button>
              </div>
            </form>
          )}

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">Plate No.</th>
                  <th className="py-2.5 px-3 font-medium">Brand &amp; Model</th>
                  <th className="py-2.5 px-3 font-medium">Type &amp; Engine</th>
                  <th className="py-2.5 px-3 font-medium">Owner</th>
                  <th className="py-2.5 px-3 font-medium text-right">Odometer</th>
                  <th className="py-2.5 px-3 font-medium text-right">Service Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.motorcycles
                  .filter(
                    (m) =>
                      m.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.customerName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((moto) => (
                    <tr key={moto.id} className="hover:bg-neutral-800/40">
                      <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                        {moto.plateNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-white">
                        {moto.brand} {moto.model} ({moto.year})
                      </td>
                      <td className="py-3 px-3 text-neutral-300">
                        {moto.type} · {moto.engineDisplacement}
                      </td>
                      <td className="py-3 px-3 text-neutral-200">{moto.customerName}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300">
                        {moto.odometerKm.toLocaleString()} km
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedMotoHistory(moto)}
                          className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded"
                        >
                          Service History
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {selectedMotoHistory && (
            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-700 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Service History: {selectedMotoHistory.brand} {selectedMotoHistory.model} (
                  {selectedMotoHistory.plateNumber})
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedMotoHistory(null)}
                  className="px-3 py-1 text-xs bg-neutral-800 text-neutral-300 rounded"
                >
                  Close
                </button>
              </div>
              {dbState.jobOrders.filter((j) => j.motorcycleId === selectedMotoHistory.id).length ===
              0 ? (
                <p className="text-xs text-neutral-400">No recorded repair job orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {dbState.jobOrders
                    .filter((j) => j.motorcycleId === selectedMotoHistory.id)
                    .map((j) => (
                      <div
                        key={j.id}
                        className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-orange-400">
                            {j.jobOrderNumber} · {j.status}
                          </span>
                          <span className="font-mono text-neutral-400">{j.dateReceived}</span>
                        </div>
                        <p className="text-white font-medium mt-1">
                          Reported: {j.reportedProblem}
                        </p>
                        <p className="text-neutral-300 mt-0.5">
                          Inspection: {j.inspectionResults}
                        </p>
                        <p className="text-neutral-400 mt-1">
                          Mechanic: {j.assignedMechanicName} · Total: ₱
                          {j.totalEstimated.toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. APPOINTMENT MANAGEMENT MODULE */}
      {activeModule === 'appointments' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                Appointment Management Module
              </h1>
              <p className="text-xs text-neutral-400">
                Schedule service bays, prevent slot conflicts, and broadcast real-time confirmation
                notifications
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
                {(['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setAptFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      aptFilter === st
                        ? 'bg-orange-600 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowAddApt((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>New Appointment</span>
              </button>
            </div>
          </div>

          {showAddApt && (
            <form
              onSubmit={handleAddAppointment}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500/50 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white">
                Book Workshop Appointment (Conflict-Checked)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Customer *</label>
                  <select
                    value={aptForm.customerId}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      const firstMoto = dbState.motorcycles.find((m) => m.customerId === cid);
                      setAptForm({
                        ...aptForm,
                        customerId: cid,
                        motorcycleId: firstMoto ? firstMoto.id : aptForm.motorcycleId,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Motorcycle *</label>
                  <select
                    value={aptForm.motorcycleId}
                    onChange={(e) =>
                      setAptForm({ ...aptForm, motorcycleId: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.motorcycles.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.brand} {m.model} ({m.plateNumber}) — {m.customerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Requested Service *</label>
                  <select
                    value={aptForm.serviceId}
                    onChange={(e) => setAptForm({ ...aptForm, serviceId: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₱{s.basePrice})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Preferred Date *</label>
                  <input
                    type="date"
                    required
                    value={aptForm.preferredDate}
                    onChange={(e) => setAptForm({ ...aptForm, preferredDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Preferred Time *</label>
                  <select
                    value={aptForm.preferredTime}
                    onChange={(e) => setAptForm({ ...aptForm, preferredTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  >
                    <option value="08:30">08:30 AM</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="13:00">01:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:30">03:30 PM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Assigned Mechanic</label>
                  <select
                    value={aptForm.assignedMechanicId}
                    onChange={(e) =>
                      setAptForm({ ...aptForm, assignedMechanicId: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.users
                      .filter((u) => u.role === 'mechanic')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-300 mb-1">
                  Reported Motorcycle Problem *
                </label>
                <input
                  type="text"
                  required
                  value={aptForm.reportedProblem}
                  onChange={(e) => setAptForm({ ...aptForm, reportedProblem: e.target.value })}
                  placeholder="Describe symptoms e.g. dragging clutch, brake squeal, or PMS mileage..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddApt(false)}
                  className="px-3.5 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg"
                >
                  Submit Appointment
                </button>
              </div>
            </form>
          )}

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">Apt. No</th>
                  <th className="py-2.5 px-3 font-medium">Schedule</th>
                  <th className="py-2.5 px-3 font-medium">Customer &amp; Motorcycle</th>
                  <th className="py-2.5 px-3 font-medium">Service &amp; Reported Issue</th>
                  <th className="py-2.5 px-3 font-medium">Mechanic</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions (Live WebSocket)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dbState.appointments
                  .filter((a) => (aptFilter === 'All' ? true : a.status === aptFilter))
                  .map((apt) => (
                    <tr key={apt.id} className="hover:bg-neutral-800/40">
                      <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                        {apt.appointmentNumber}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-white">
                        <div>{apt.preferredDate}</div>
                        <div className="text-neutral-400">{apt.preferredTime}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">{apt.customerName}</div>
                        <div className="text-neutral-400">
                          {apt.motorcycleSummary} ·{' '}
                          <span className="font-mono">{apt.plateNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-neutral-200">{apt.serviceName}</div>
                        <div className="text-neutral-400 truncate">{apt.reportedProblem}</div>
                      </td>
                      <td className="py-3 px-3 text-neutral-300">
                        {apt.assignedMechanicName || 'Unassigned'}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">{apt.status}</td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {apt.status !== 'Confirmed' && apt.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateAppointmentStatus(apt.id, 'Confirmed')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                        )}
                        {apt.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateAppointmentStatus(apt.id, 'Completed')}
                            className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded"
                          >
                            Complete
                          </button>
                        )}
                        {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateAppointmentStatus(apt.id, 'Cancelled')}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-950 hover:bg-red-950 text-neutral-400 hover:text-red-300 border border-neutral-800 rounded"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. REPAIR AND MAINTENANCE (JOB ORDERS) MODULE */}
      {activeModule === 'repairs' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white font-display">
                Repair &amp; Maintenance Job Orders
              </h1>
              <p className="text-xs text-neutral-400">
                Create job orders, record mechanic inspection results, deduct spare parts from
                inventory, and broadcast live repair status changes
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800 overflow-x-auto">
                {(
                  [
                    'All',
                    'Pending',
                    'In Progress',
                    'Waiting for Parts',
                    'Completed',
                    'Cancelled',
                  ] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRepairFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      repairFilter === st
                        ? 'bg-orange-600 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              {currentUser.role !== 'mechanic' && (
                <button
                  type="button"
                  onClick={() => setShowAddJo((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Job Order</span>
                </button>
              )}
            </div>
          </div>

          {showAddJo && (
            <form
              onSubmit={handleCreateJobOrder}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500/50 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white">Create New Repair Job Order</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Customer *</label>
                  <select
                    value={newJoForm.customerId}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      const firstMoto = dbState.motorcycles.find((m) => m.customerId === cid);
                      setNewJoForm({
                        ...newJoForm,
                        customerId: cid,
                        motorcycleId: firstMoto ? firstMoto.id : newJoForm.motorcycleId,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Motorcycle *</label>
                  <select
                    value={newJoForm.motorcycleId}
                    onChange={(e) =>
                      setNewJoForm({ ...newJoForm, motorcycleId: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.motorcycles.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.brand} {m.model} ({m.plateNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Assigned Mechanic *</label>
                  <select
                    value={newJoForm.assignedMechanicId}
                    onChange={(e) =>
                      setNewJoForm({ ...newJoForm, assignedMechanicId: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.users
                      .filter((u) => u.role === 'mechanic')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.specialty})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Primary Service</label>
                  <select
                    value={newJoForm.serviceIds[0]}
                    onChange={(e) =>
                      setNewJoForm({ ...newJoForm, serviceIds: [Number(e.target.value)] })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {dbState.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₱{s.basePrice})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Labor Charge (PHP)</label>
                  <input
                    type="number"
                    value={newJoForm.laborCharges}
                    onChange={(e) =>
                      setNewJoForm({ ...newJoForm, laborCharges: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Reported Problem *</label>
                  <input
                    type="text"
                    required
                    value={newJoForm.reportedProblem}
                    onChange={(e) =>
                      setNewJoForm({ ...newJoForm, reportedProblem: e.target.value })
                    }
                    placeholder="e.g. Hard starting and throttle hesitation"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddJo(false)}
                  className="px-3.5 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg"
                >
                  Create &amp; Broadcast Job Order
                </button>
              </div>
            </form>
          )}

          {/* Editing / Inspecting Job Order Modal Panel */}
          {editingJo && (
            <form
              onSubmit={handleSaveJobOrderUpdate}
              className="p-5 rounded-xl bg-neutral-900 border border-orange-500 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Update Job Order {editingJo.jobOrderNumber} · {editingJo.motorcycleSummary} (
                    {editingJo.plateNumber})
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Changing repair status or deducting spare parts automatically broadcasts
                    real-time WebSocket notifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingJo(null)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Repair Status (Broadcasts Live Event)
                  </label>
                  <select
                    value={joUpdateForm.status}
                    onChange={(e) =>
                      setJoUpdateForm({
                        ...joUpdateForm,
                        status: e.target.value as RepairStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-semibold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Parts">Waiting for Parts</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Add Spare Part Used (Auto-Deducts Inventory)
                  </label>
                  <select
                    value={joUpdateForm.addPartProductId}
                    onChange={(e) =>
                      setJoUpdateForm({ ...joUpdateForm, addPartProductId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    <option value="">— No additional part —</option>
                    {dbState.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.quantity} · ₱{p.unitPrice})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Part Quantity &amp; Labor Charge (₱)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      value={joUpdateForm.addPartQuantity}
                      onChange={(e) =>
                        setJoUpdateForm({
                          ...joUpdateForm,
                          addPartQuantity: Number(e.target.value),
                        })
                      }
                      placeholder="Qty"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      value={joUpdateForm.laborCharges}
                      onChange={(e) =>
                        setJoUpdateForm({
                          ...joUpdateForm,
                          laborCharges: Number(e.target.value),
                        })
                      }
                      placeholder="Labor ₱"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Mechanic Inspection Results
                  </label>
                  <textarea
                    rows={2}
                    value={joUpdateForm.inspectionResults}
                    onChange={(e) =>
                      setJoUpdateForm({ ...joUpdateForm, inspectionResults: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Repair Notes &amp; Recommendations
                  </label>
                  <textarea
                    rows={2}
                    value={joUpdateForm.repairNotes}
                    onChange={(e) =>
                      setJoUpdateForm({ ...joUpdateForm, repairNotes: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingJo(null)}
                  className="px-3.5 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg"
                >
                  Save Inspection &amp; Broadcast Status
                </button>
              </div>
            </form>
          )}

          {/* Job Orders List */}
          <div className="space-y-4">
            {dbState.jobOrders
              .filter((jo) => (repairFilter === 'All' ? true : jo.status === repairFilter))
              .map((jo) => (
                <div
                  key={jo.id}
                  className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
                    <div>
                      <div className="text-xs text-neutral-400">
                        <span className="font-mono font-bold text-orange-400">
                          {jo.jobOrderNumber}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>Received: {jo.dateReceived}</span>
                        <span aria-hidden="true"> · </span>
                        <span>Mechanic: {jo.assignedMechanicName}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-0.5">
                        {jo.customerName} — {jo.motorcycleSummary} (
                        <span className="font-mono">{jo.plateNumber}</span> ·{' '}
                        <span className="font-mono">{jo.odometerKm.toLocaleString()} km</span>)
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-orange-400 px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800">
                        Status: {jo.status}
                      </span>
                      {jo.status !== 'In Progress' && jo.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(`/api/job-orders/${jo.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'In Progress' }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              onStateChange(data.state);
                              notify(
                                'success',
                                `${jo.jobOrderNumber} marked In Progress & WebSocket notification broadcast!`
                              );
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-orange-400 rounded-lg transition-colors"
                        >
                          Set In Progress
                        </button>
                      )}
                      {jo.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(`/api/job-orders/${jo.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Completed' }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              onStateChange(data.state);
                              notify(
                                'success',
                                `${jo.jobOrderNumber} marked Completed & WebSocket notification broadcast!`
                              );
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                        >
                          Mark Completed
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJo(jo);
                          setJoUpdateForm({
                            status: jo.status,
                            inspectionResults: jo.inspectionResults,
                            repairNotes: jo.repairNotes,
                            laborCharges: jo.laborCharges,
                            addPartProductId: '',
                            addPartQuantity: 1,
                          });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5 text-orange-400" />
                        <span>Inspect / Add Parts</span>
                      </button>
                      {currentUser.role !== 'mechanic' && (
                        <button
                          type="button"
                          onClick={() => handleGenerateInvoice(jo)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{jo.invoiceId ? 'View Bill' : 'Generate Bill'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-neutral-400 font-medium">
                        Reported Problem &amp; Inspection
                      </div>
                      <p className="text-neutral-200">
                        <strong>Reported:</strong> {jo.reportedProblem}
                      </p>
                      <p className="text-neutral-300">
                        <strong>Inspection:</strong> {jo.inspectionResults}
                      </p>
                      {jo.repairNotes && (
                        <p className="text-neutral-400">
                          <strong>Notes:</strong> {jo.repairNotes}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="text-neutral-400 font-medium mb-1">Services Performed</div>
                      {jo.servicesPerformed.map((s, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 text-neutral-200">
                          <span>{s.serviceName}</span>
                          <span className="font-mono tabular-nums">₱{s.price.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-0.5 text-neutral-400 border-t border-neutral-800 mt-1 pt-1">
                        <span>Technician Labor Charge</span>
                        <span className="font-mono tabular-nums">
                          ₱{jo.laborCharges.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-neutral-400 font-medium mb-1">
                        Spare Parts Used (Inventory Deducted)
                      </div>
                      {jo.partsUsed.length === 0 ? (
                        <p className="text-neutral-500">No spare parts deducted yet.</p>
                      ) : (
                        jo.partsUsed.map((p, idx) => (
                          <div key={idx} className="flex justify-between py-0.5 text-neutral-200">
                            <span className="truncate pr-2">
                              {p.productName} × {p.quantity}
                            </span>
                            <span className="font-mono tabular-nums shrink-0">
                              ₱{(p.unitPrice * p.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between font-semibold text-white border-t border-neutral-800 mt-2 pt-1.5">
                        <span>Total Job Order Estimate</span>
                        <span className="font-mono tabular-nums text-orange-400">
                          ₱{jo.totalEstimated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
