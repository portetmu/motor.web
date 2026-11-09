import React, { useState } from 'react';
import {
  Bike,
  CalendarPlus,
  Wrench,
  Printer,
  Star,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { Invoice, ShopDatabaseState, UserAccount } from '../types/shop';

export type CustomerPortalTab =
  | 'cust_dashboard'
  | 'cust_motorcycles'
  | 'cust_book'
  | 'cust_appointments'
  | 'cust_tracking'
  | 'cust_history'
  | 'cust_receipts'
  | 'cust_feedback'
  | 'cust_account';

interface CustomerPortalProps {
  activeTab: CustomerPortalTab;
  onSelectTab: (tab: CustomerPortalTab) => void;
  currentUser: UserAccount;
  dbState: ShopDatabaseState;
  onStateChange: (newState: ShopDatabaseState) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  dbState,
  onStateChange,
}) => {
  const customerId = currentUser.customerId || 1;
  const customerRecord =
    dbState.customers.find((c) => c.id === customerId) || dbState.customers[0];

  // Strictly isolated customer records
  const myMotorcycles = dbState.motorcycles.filter((m) => m.customerId === customerId);
  const myAppointments = dbState.appointments.filter((a) => a.customerId === customerId);
  const myJobOrders = dbState.jobOrders.filter((j) => j.customerId === customerId);
  const myInvoices = dbState.invoices.filter((i) => i.customerId === customerId);
  const myFeedbacks = dbState.feedback.filter((f) => f.customerId === customerId);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Add Motorcycle state
  const [motoForm, setMotoForm] = useState({
    brand: 'Yamaha',
    model: '',
    plateNumber: '',
    type: 'Scooter',
    year: 2025,
    engineDisplacement: '155cc',
    color: 'Matte Gray',
    odometerKm: 2500,
  });

  // Book Appointment state
  const [bookForm, setBookForm] = useState({
    motorcycleId: myMotorcycles[0]?.id || 1,
    serviceId: dbState.services[0]?.id || 1,
    preferredDate: '2026-11-14',
    preferredTime: '09:00',
    reportedProblem: '',
  });

  // Feedback form state
  const [fbForm, setFbForm] = useState({
    jobOrderNumber: myJobOrders[0]?.jobOrderNumber || 'JO-2026-001',
    serviceName: dbState.services[0]?.name || 'Complete Periodic Maintenance Service (PMS)',
    rating: 5,
    comment: '',
  });

  const [printingReceipt, setPrintingReceipt] = useState<Invoice | null>(null);

  const flash = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleAddMyMotorcycle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/motorcycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...motoForm, customerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash('error', data.error || 'Could not register motorcycle.');
    } else {
      onStateChange(data.state);
      setMotoForm({ ...motoForm, model: '', plateNumber: '' });
      flash('success', `Motorcycle ${data.motorcycle.brand} ${data.motorcycle.model} added!`);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bookForm, customerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash('error', data.error || 'Schedule conflict detected.');
    } else {
      onStateChange(data.state);
      setBookForm({ ...bookForm, reportedProblem: '' });
      flash(
        'success',
        `Appointment ${data.appointment.appointmentNumber} submitted! You will receive a real-time notification once confirmed.`
      );
      setTimeout(() => onSelectTab('cust_appointments'), 800);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fbForm,
        customerId,
        customerName: customerRecord.fullName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash('error', data.error || 'Could not submit feedback.');
    } else {
      onStateChange(data.state);
      setFbForm({ ...fbForm, comment: '' });
      flash(
        'success',
        'Thank you! Your feedback has been saved & delivered in real-time to Shop Management via WebSocket!'
      );
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
              : 'bg-red-950/70 border-red-700 text-red-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-neutral-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. CUSTOMER DASHBOARD */}
      {activeTab === 'cust_dashboard' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-orange-400 font-medium">
                Private Customer Portal · {customerRecord.code}
              </p>
              <h1 className="text-xl font-bold text-white mt-0.5 font-display">
                Welcome back, {customerRecord.fullName}
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                {customerRecord.address}, {customerRecord.barangayCity}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('cust_book')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Book Service Appointment</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => onSelectTab('cust_motorcycles')}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-orange-500/50 transition-colors"
            >
              <div className="text-xs text-neutral-400">My Motorcycles</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {myMotorcycles.length}
              </div>
              <div className="text-[11px] text-orange-400 mt-1">Registered vehicles →</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('cust_appointments')}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-orange-500/50 transition-colors"
            >
              <div className="text-xs text-neutral-400">My Appointments</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {myAppointments.length}
              </div>
              <div className="text-[11px] text-orange-400 mt-1">View schedule status →</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('cust_tracking')}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-orange-500/50 transition-colors"
            >
              <div className="text-xs text-neutral-400">Active Repairs</div>
              <div className="text-2xl font-bold text-orange-500 font-mono mt-1">
                {myJobOrders.filter((j) => j.status !== 'Completed').length}
              </div>
              <div className="text-[11px] text-orange-400 mt-1">Live bay tracking →</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('cust_receipts')}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-orange-500/50 transition-colors"
            >
              <div className="text-xs text-neutral-400">Digital Receipts</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {myInvoices.length}
              </div>
              <div className="text-[11px] text-orange-400 mt-1">View &amp; print bills →</div>
            </button>
          </div>

          {/* Active Repair Live Progress Card */}
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
            <h2 className="text-sm font-semibold text-white mb-3">
              Live Repair Progress Tracker (WebSocket Connected)
            </h2>
            {myJobOrders.map((jo) => (
              <div
                key={jo.id}
                className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 mb-3 last:mb-0 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-orange-400 text-xs">
                      {jo.jobOrderNumber}
                    </span>
                    <span className="text-xs text-white font-semibold ml-2">
                      {jo.motorcycleSummary} ({jo.plateNumber})
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-orange-400">
                    Current Status: {jo.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-300">
                  <strong>Inspection Findings:</strong> {jo.inspectionResults}
                </p>
                <div className="text-xs text-neutral-400 flex items-center justify-between pt-2 border-t border-neutral-800">
                  <span>Assigned Technician: {jo.assignedMechanicName}</span>
                  <span className="font-mono text-white font-semibold">
                    Est. Total: ₱{jo.totalEstimated.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Customer's Personal Real-Time Notifications */}
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800">
            <h2 className="text-sm font-semibold text-white mb-3">
              My Real-Time Notifications (Appointment Confirmations &amp; Repair Updates)
            </h2>
            <div className="space-y-2.5">
              {dbState.notifications
                .filter(
                  (n) =>
                    n.targetRoles.includes('customer') &&
                    (n.targetCustomerId === undefined || n.targetCustomerId === customerId)
                )
                .map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-orange-400">{notif.title}</span>
                      <p className="text-neutral-300 mt-0.5">{notif.message}</p>
                    </div>
                    <span className="font-mono text-neutral-400 shrink-0">{notif.createdAt}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MY MOTORCYCLES */}
      {activeTab === 'cust_motorcycles' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-white font-display">My Registered Motorcycles</h1>
            <p className="text-xs text-neutral-400">
              Manage your personal motorcycles registered with C &amp; A Motorcycle Shop
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myMotorcycles.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-orange-400">
                    {m.plateNumber}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {m.type} · {m.year}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {m.brand} {m.model}
                </h3>
                <div className="text-xs text-neutral-300">
                  Engine: {m.engineDisplacement} · Color: {m.color}
                </div>
                <div className="text-xs font-mono text-neutral-400 pt-2 border-t border-neutral-800 flex justify-between">
                  <span>Odometer: {m.odometerKm.toLocaleString()} km</span>
                  <span>VIN: {m.vinChassis}</span>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddMyMotorcycle}
            className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4"
          >
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bike className="w-4 h-4 text-orange-500" />
              <span>Add Another Motorcycle to My Account</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Brand *</label>
                <input
                  type="text"
                  required
                  value={motoForm.brand}
                  onChange={(e) => setMotoForm({ ...motoForm, brand: e.target.value })}
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
                  placeholder="e.g. Mio Gear 125"
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
                  placeholder="CAR-8812"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono uppercase"
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
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg"
            >
              Register Motorcycle
            </button>
          </form>
        </div>
      )}

      {/* 3. BOOK AN APPOINTMENT */}
      {activeTab === 'cust_book' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h1 className="text-xl font-bold text-white font-display">
              Book a Service Appointment
            </h1>
            <p className="text-xs text-neutral-400">
              Select your motorcycle, service package, and available Baguio workshop slot
            </p>
          </div>
          <form
            onSubmit={handleBookAppointment}
            className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Select My Motorcycle *
              </label>
              <select
                value={bookForm.motorcycleId}
                onChange={(e) =>
                  setBookForm({ ...bookForm, motorcycleId: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
              >
                {myMotorcycles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand} {m.model} ({m.plateNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Choose Service Package *
              </label>
              <select
                value={bookForm.serviceId}
                onChange={(e) => setBookForm({ ...bookForm, serviceId: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
              >
                {dbState.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — ₱{s.basePrice.toLocaleString()} ({s.estimatedDurationMins} mins)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  value={bookForm.preferredDate}
                  onChange={(e) => setBookForm({ ...bookForm, preferredDate: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Preferred Time Slot *
                </label>
                <select
                  value={bookForm.preferredTime}
                  onChange={(e) => setBookForm({ ...bookForm, preferredTime: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                >
                  <option value="08:30">08:30 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="13:30">01:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Reported Motorcycle Problem or Service Notes *
              </label>
              <textarea
                rows={3}
                required
                value={bookForm.reportedProblem}
                onChange={(e) => setBookForm({ ...bookForm, reportedProblem: e.target.value })}
                placeholder="Describe any unusual sounds, vibration, or maintenance request..."
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
            >
              Submit Appointment Request
            </button>
          </form>
        </div>
      )}

      {/* 4. MY APPOINTMENTS */}
      {activeTab === 'cust_appointments' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-white font-display">My Service Appointments</h1>
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3">Ref No.</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Motorcycle</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Assigned Mechanic</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {myAppointments.map((apt) => (
                  <tr key={apt.id}>
                    <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                      {apt.appointmentNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-white">
                      {apt.preferredDate} · {apt.preferredTime}
                    </td>
                    <td className="py-3 px-3 text-white">
                      {apt.motorcycleSummary} ({apt.plateNumber})
                    </td>
                    <td className="py-3 px-3 text-neutral-300">{apt.serviceName}</td>
                    <td className="py-3 px-3 text-neutral-300">
                      {apt.assignedMechanicName || 'Assigning Bay'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">{apt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5 & 6. REPAIR TRACKING & SERVICE HISTORY */}
      {(activeTab === 'cust_tracking' || activeTab === 'cust_history') && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-white font-display">
            {activeTab === 'cust_tracking'
              ? 'Live Motorcycle Repair Tracking'
              : 'Previous Repair & Maintenance History'}
          </h1>
          <div className="space-y-4">
            {myJobOrders.map((jo) => (
              <div
                key={jo.id}
                className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <span className="font-mono font-bold text-orange-400 text-xs">
                      {jo.jobOrderNumber}
                    </span>
                    <span aria-hidden="true" className="text-neutral-500">
                      {' '}
                      ·{' '}
                    </span>
                    <span className="text-xs text-neutral-400">Received {jo.dateReceived}</span>
                    <h3 className="text-sm font-semibold text-white mt-0.5">
                      {jo.motorcycleSummary} ({jo.plateNumber})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                    {jo.status === 'Completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-400" />
                    )}
                    <span>{jo.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-neutral-300">
                      <strong>Reported Problem:</strong> {jo.reportedProblem}
                    </p>
                    <p className="text-neutral-300">
                      <strong>Mechanic Inspection:</strong> {jo.inspectionResults}
                    </p>
                    <p className="text-neutral-400">
                      <strong>Mechanic Notes:</strong> {jo.repairNotes || 'In progress'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                    <div className="text-neutral-400 font-medium">Itemized Services &amp; Parts</div>
                    {jo.servicesPerformed.map((s, i) => (
                      <div key={i} className="flex justify-between text-neutral-200">
                        <span>{s.serviceName}</span>
                        <span className="font-mono">₱{s.price}</span>
                      </div>
                    ))}
                    {jo.partsUsed.map((p, i) => (
                      <div key={i} className="flex justify-between text-neutral-300">
                        <span>
                          {p.productName} × {p.quantity}
                        </span>
                        <span className="font-mono">₱{p.unitPrice * p.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-white border-t border-neutral-800 pt-1 mt-1">
                      <span>Total (incl. ₱{jo.laborCharges} labor)</span>
                      <span className="font-mono text-orange-400">
                        ₱{jo.totalEstimated.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DIGITAL RECEIPTS */}
      {activeTab === 'cust_receipts' && (
        <div className="space-y-5">
          <h1 className="text-xl font-bold text-white font-display">
            My Digital Invoices &amp; Printable Receipts
          </h1>

          {printingReceipt && (
            <div className="p-6 rounded-xl bg-white text-neutral-900 border border-neutral-300 max-w-lg mx-auto space-y-3">
              <div className="flex justify-between items-start border-b border-neutral-300 pb-2">
                <div>
                  <h3 className="font-bold text-base">C &amp; A MOTORCYCLE SHOP</h3>
                  <p className="text-xs text-neutral-600">Magsaysay Ave., Baguio City</p>
                </div>
                <div className="flex gap-2 no-print">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 text-xs font-semibold bg-orange-600 text-white rounded"
                  >
                    Print Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintingReceipt(null)}
                    className="px-2.5 py-1 text-xs bg-neutral-200 rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="text-xs font-mono space-y-1">
                <div>Receipt No: {printingReceipt.invoiceNumber}</div>
                <div>Customer: {printingReceipt.customerName}</div>
                <div>Motorcycle: {printingReceipt.motorcycleSummary}</div>
                <div>Total Amount: ₱{printingReceipt.totalAmount.toFixed(2)}</div>
                <div>Status: {printingReceipt.paymentStatus}</div>
              </div>
            </div>
          )}

          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3">Invoice No.</th>
                  <th className="py-2.5 px-3">Job Order</th>
                  <th className="py-2.5 px-3">Motorcycle</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {myInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 px-3 font-mono font-semibold text-orange-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-300">{inv.jobOrderNumber}</td>
                    <td className="py-3 px-3 text-white">{inv.motorcycleSummary}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      ₱{inv.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-white">{inv.paymentStatus}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPrintingReceipt(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. SUBMIT FEEDBACK & RATINGS */}
      {activeTab === 'cust_feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
            <h1 className="text-xl font-bold text-white font-display">
              Submit Service Feedback &amp; Rating
            </h1>
            <p className="text-xs text-neutral-400">
              Your rating is delivered in real time via WebSocket to C &amp; A Motorcycle Shop
              Management.
            </p>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Service Completed</label>
                <select
                  value={fbForm.serviceName}
                  onChange={(e) => setFbForm({ ...fbForm, serviceName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                >
                  {dbState.services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Star Rating (1–5)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFbForm({ ...fbForm, rating: star })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 ${
                        fbForm.rating >= star
                          ? 'bg-orange-600/20 border-orange-500 text-orange-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{star}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Your Review Comment *</label>
                <textarea
                  rows={3}
                  required
                  value={fbForm.comment}
                  onChange={(e) => setFbForm({ ...fbForm, comment: e.target.value })}
                  placeholder="Share your experience with our mechanics and service quality..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg"
              >
                Submit Rating &amp; Notify Management
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h2 className="text-sm font-semibold text-white">My Submitted Reviews</h2>
            {myFeedbacks.map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs space-y-1"
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-orange-400">{f.rating} / 5 Stars</span>
                  <span className="font-mono text-neutral-400">{f.createdAt}</span>
                </div>
                <div className="font-medium text-white">{f.serviceName}</div>
                <p className="text-neutral-300">“{f.comment}”</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. MY ACCOUNT */}
      {activeTab === 'cust_account' && (
        <div className="max-w-xl p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h1 className="text-xl font-bold text-white font-display">My Customer Profile</h1>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Customer Code</span>
              <span className="font-mono text-orange-400 font-semibold">{customerRecord.code}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Full Name</span>
              <span className="text-white font-medium">{customerRecord.fullName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Mobile Number</span>
              <span className="font-mono text-white">{customerRecord.phone}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Email</span>
              <span className="text-white">{customerRecord.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Address</span>
              <span className="text-white">
                {customerRecord.address}, {customerRecord.barangayCity}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
