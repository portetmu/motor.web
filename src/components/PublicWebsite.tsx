import React, { useState } from 'react';
import {
  Wrench,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  KeyRound,
} from 'lucide-react';
import { useFirebaseAuth } from '../context/AuthContext';
import type { ServiceItem, ShopDatabaseState, UserAccount, UserRole } from '../types/shop';

export type PublicPageTab = 'home' | 'services' | 'about' | 'contact' | 'register' | 'login';

interface PublicWebsiteProps {
  activePage: PublicPageTab;
  onNavigate: (page: PublicPageTab) => void;
  dbState: ShopDatabaseState;
  onLoginSuccess: (user: UserAccount, updatedState: ShopDatabaseState) => void;
  onRegisterCustomer: (payload: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    barangayCity: string;
    username: string;
  }) => Promise<void>;
}

const HERO_IMG = '/src/assets/images/hero_motorcycle_workshop_1794223368233.jpg';
const DIAGNOSTICS_IMG = '/src/assets/images/service_engine_diagnostics_1794223369241.jpg';
const PARTS_IMG = '/src/assets/images/parts_inventory_showcase_1794223369787.jpg';

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  activePage,
  onNavigate,
  dbState,
  onLoginSuccess,
  onRegisterCustomer,
}) => {
  const { signInWithGoogle } = useFirebaseAuth();

  // Login state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@CA2026');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Registration state
  const [regForm, setRegForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    barangayCity: 'Baguio City',
    username: '',
  });
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    motorcycle: '',
    inquiry: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Services filter state
  const [serviceCategory, setServiceCategory] = useState<string>('All');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both your username and password.');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed.');
      } else {
        onLoginSuccess(data.user, data.state);
      }
    } catch {
      setLoginError('Network error while connecting to authentication server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const token = await signInWithGoogle();
      if (!token) {
        setLoginError('Google Sign-In was cancelled.');
        return;
      }
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed.');
      } else {
        onLoginSuccess(data.user, data.state);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Google Sign-In failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickDemoRole = async (role: UserRole, presetUser: string, presetPass: string) => {
    setUsername(presetUser);
    setPassword(presetPass);
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: presetUser, roleSwitch: role }),
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user, data.state);
      } else {
        setLoginError(data.error || 'Could not switch role.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage(null);
    if (!regForm.fullName.trim() || !regForm.phone.trim() || !regForm.address.trim()) {
      setRegMessage({
        type: 'error',
        text: 'Please fill in your full name, mobile number, and Baguio/Benguet address.',
      });
      return;
    }
    try {
      await onRegisterCustomer(regForm);
      setRegMessage({
        type: 'success',
        text: 'Customer profile & portal account created! Redirecting to your Customer Portal...',
      });
    } catch (err: any) {
      setRegMessage({
        type: 'error',
        text: err?.message || 'Registration failed.',
      });
    }
  };

  const categories = [
    'All',
    ...Array.from(new Set(dbState.services.map((s: ServiceItem) => s.category))),
  ];

  const filteredServices = dbState.services.filter((s) =>
    serviceCategory === 'All' ? true : s.category === serviceCategory
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-neutral-800 bg-neutral-950/95 sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-lg font-bold tracking-tight text-white hover:text-orange-500 transition-colors whitespace-nowrap shrink-0 font-display"
        >
          C &amp; A Motorcycle Shop
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-300">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'home' ? 'text-orange-500 underline underline-offset-8' : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'services' ? 'text-orange-500 underline underline-offset-8' : ''
            }`}
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => onNavigate('about')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'about' ? 'text-orange-500 underline underline-offset-8' : ''
            }`}
          >
            About Us
          </button>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'contact' ? 'text-orange-500 underline underline-offset-8' : ''
            }`}
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'register' ? 'text-orange-500 underline underline-offset-8' : ''
            }`}
          >
            Register
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-500 transition-colors whitespace-nowrap shrink-0"
          >
            Sign In to Portal
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center justify-around px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-xs overflow-x-auto">
        {(['home', 'services', 'about', 'contact', 'register', 'login'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onNavigate(tab)}
            className={`px-2.5 py-1 rounded font-medium capitalize whitespace-nowrap shrink-0 ${
              activePage === tab ? 'bg-orange-600 text-white' : 'text-neutral-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {activePage === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center">
                  <p className="text-xs font-medium text-orange-400 tracking-wide">
                    Magsaysay Avenue · Baguio City · Integrated Workshop System
                  </p>
                  <h1
                    className="mt-3 text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight font-display"
                    style={{ textWrap: 'balance' }}
                  >
                    Precision Motorcycle Service &amp; Real-Time Repair Management for Baguio Riders
                  </h1>
                  <p className="mt-4 text-base text-neutral-300 leading-relaxed max-w-xl">
                    C &amp; A Motorcycle Shop combines master EFI diagnostics, steep-grade brake
                    engineering, genuine spare parts inventory, and live WebSocket repair tracking in
                    one centralized management platform.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onNavigate('login')}
                      className="px-5 py-3 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <span>Access Management &amp; Customer Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('services')}
                      className="px-5 py-3 text-sm font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Browse Service Rate Card
                    </button>
                  </div>

                  {/* Quick Demo Role Bar directly on Home for instant access */}
                  <div className="mt-8 pt-6 border-t border-neutral-800">
                    <p className="text-xs text-neutral-400 mb-2.5">
                      Instant Demo Role Access (1-Click Sign-In with Real-Time WebSocket Sync):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickDemoRole('admin', 'admin', 'Admin@CA2026')}
                        className="px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-orange-600/20 hover:border-orange-500 border border-neutral-800 rounded-md text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Administrator
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDemoRole('owner', 'owner', 'Owner@CA2026')}
                        className="px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-orange-600/20 hover:border-orange-500 border border-neutral-800 rounded-md text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Owner / Management
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDemoRole('cashier', 'cashier', 'Cashier@CA2026')}
                        className="px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-orange-600/20 hover:border-orange-500 border border-neutral-800 rounded-md text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Cashier / Front Desk
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDemoRole('mechanic', 'mechanic', 'Mechanic@CA2026')}
                        className="px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-orange-600/20 hover:border-orange-500 border border-neutral-800 rounded-md text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Mechanic / Technician
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDemoRole('customer', 'customer', 'Customer@CA2026')}
                        className="px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-orange-600/20 hover:border-orange-500 border border-neutral-800 rounded-md text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Customer Portal
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="relative h-full min-h-[320px] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                    <img
                      src={HERO_IMG}
                      alt="C & A Motorcycle Shop service bays with hydraulic lifts in Baguio City"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6">
                      <div>
                        <p className="text-xs text-orange-400 font-medium">
                          3 Hydraulic Service Bays · OBD-II &amp; Yamaha/Honda EFI Scanners
                        </p>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          Serving Cordilleran commuters, delivery fleets, and touring riders since 2018
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-width 4-column quantified metrics strip below hero */}
              <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-neutral-800">
                <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-2xl font-bold text-white font-mono tabular-nums">
                    {dbState.customers.length} Active
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Registered Baguio &amp; Benguet Riders
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-2xl font-bold text-white font-mono tabular-nums">
                    {dbState.services.length} Certified
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Standardized Maintenance Packages
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-2xl font-bold text-orange-500 font-mono tabular-nums">
                    &lt; 90 Mins
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Average Periodic Maintenance Turnaround
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="text-2xl font-bold text-white font-mono tabular-nums">
                    100% Live
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    WebSocket Notifications &amp; Digital Billing
                  </div>
                </div>
              </div>
            </section>

            {/* Core Capabilities (Editorial Numbering) */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12 border-t border-neutral-800">
              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
                  Engineered for Highland Riding &amp; Transparent Shop Operations
                </h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Every motorcycle entering our Magsaysay Avenue workshop follows a documented
                  10-step digital workflow from inspection to itemized billing.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono text-orange-400">01. Highland EFI &amp; CVT Tuning</span>
                    <h3 className="text-lg font-semibold text-white mt-2">
                      Altitude-Calibrated Diagnostics
                    </h3>
                    <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
                      Baguio’s 1,500-meter elevation and steep gradients demand accurate fuel-trim
                      calibration, ultrasonic injector cleaning, and high-boiling-point DOT 4 brake
                      fluid maintenance.
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
                    Starting at <span className="font-mono text-white">₱550.00</span> · 60–90 mins
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono text-orange-400">
                      02. Live WebSocket Notifications
                    </span>
                    <h3 className="text-lg font-semibold text-white mt-2">
                      Real-Time Role-Targeted Updates
                    </h3>
                    <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
                      Customers receive instant appointment confirmations and repair progress updates;
                      mechanics see assigned job orders; management receives automatic low-stock
                      alerts and customer ratings.
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
                    Zero manual phone follow-ups required
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono text-orange-400">
                      03. Automated Parts &amp; Billing
                    </span>
                    <h3 className="text-lg font-semibold text-white mt-2">
                      Exact Inventory &amp; Digital Receipts
                    </h3>
                    <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
                      Every spare part used in a repair job order is automatically deducted from rack
                      inventory and itemized on the customer’s printable official receipt.
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
                    100% genuine Yamaha, Honda, Motul, NGK &amp; Brembo stock
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activePage === 'services' && (
          <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-neutral-800">
              <div>
                <h1 className="text-3xl font-bold text-white font-display">
                  Motorcycle Repair &amp; Maintenance Rate Card
                </h1>
                <p className="text-sm text-neutral-400 mt-1">
                  Transparent service rates for scooters, underbones, and big bikes in Baguio City.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setServiceCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      serviceCategory === cat
                        ? 'bg-orange-600 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs text-neutral-400">
                      <span className="font-mono text-orange-400">{srv.code}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{srv.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">{srv.estimatedDurationMins} mins</span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-2">{srv.name}</h3>
                    <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-neutral-400 block">Standard Labor &amp; Service</span>
                      <span className="text-lg font-bold text-white font-mono tabular-nums">
                        ₱{srv.basePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('login')}
                      className="px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === 'about' && (
          <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs text-orange-400 font-medium">
                  About C &amp; A Motorcycle Shop · Baguio City
                </p>
                <h1 className="text-3xl font-bold text-white mt-2 font-display">
                  Built to Modernize Cordillera Motorcycle Maintenance
                </h1>
                <p className="text-sm text-neutral-300 mt-4 leading-relaxed">
                  Located along Magsaysay Avenue in Baguio City, C &amp; A Motorcycle Shop replaced
                  paper job cards and manual stock ledgers with this centralized Web-Based Management
                  and Information System.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Wrench className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Certified Mechanics &amp; Multi-Bay Scheduling
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Dedicated bays for Periodic Maintenance, EFI/Electrical Diagnostics, and
                        Steep-Grade Brake &amp; Suspension Overhauls.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        RA 10173 Data Privacy Act of 2012 Compliance
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Role-based access control (RBAC), password hashing, audit logging, and strict
                        customer record isolation protect every rider’s personal and vehicle history.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 flex flex-col">
                  <img
                    src={DIAGNOSTICS_IMG}
                    alt="Master Technician performing EFI diagnostics"
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white">Master EFI Diagnostics</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Precision fuel-injection and sensor calibration for highland riding conditions.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 flex flex-col">
                  <img
                    src={PARTS_IMG}
                    alt="Genuine spare parts inventory"
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white">Genuine Parts Inventory</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Real-time stock tracking for Motul, Brembo, DID, NGK, Yamaha, and Honda parts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'contact' && (
          <section className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
                <h1 className="text-2xl font-bold text-white font-display">
                  Visit or Contact Our Baguio Workshop
                </h1>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Walk-ins are welcome for emergency repairs, or book a confirmed bay slot online to
                  skip the queue.
                </p>
                <div className="space-y-3 pt-2 text-xs text-neutral-300">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>#218 Magsaysay Avenue (near Bokawkan Rd), Baguio City, 2600 Benguet</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="font-mono tabular-nums">(074) 442-8910 / 0917-501-1103</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>service@camotorcycleshop.ph</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Monday – Saturday · 08:00 AM – 05:30 PM</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 p-6 rounded-xl bg-neutral-900 border border-neutral-800">
                <h2 className="text-lg font-semibold text-white">Send a Service Inquiry</h2>
                {contactSubmitted ? (
                  <div className="mt-4 p-4 rounded-lg bg-emerald-950/50 border border-emerald-700 text-xs text-emerald-200">
                    Thank you! Your inquiry has been logged with our Front Desk Cashier in Baguio
                    City. We will reach out shortly.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (contactForm.name && contactForm.phone && contactForm.inquiry) {
                        setContactSubmitted(true);
                      }
                    }}
                    className="mt-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-300 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="e.g. Carlo Mendoza"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-300 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="0917-XXX-XXXX"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">
                        Motorcycle Brand &amp; Model
                      </label>
                      <input
                        type="text"
                        value={contactForm.motorcycle}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, motorcycle: e.target.value })
                        }
                        placeholder="e.g. Honda ADV 160 / Yamaha NMAX 155"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">
                        Service Question or Reported Issue *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={contactForm.inquiry}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, inquiry: e.target.value })
                        }
                        placeholder="Describe the maintenance needed or part availability inquiry..."
                        className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                    >
                      Submit Inquiry
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}

        {activePage === 'register' && (
          <section className="max-w-xl mx-auto px-6 py-12">
            <div className="p-6 sm:p-8 rounded-xl bg-neutral-900 border border-neutral-800">
              <h1 className="text-2xl font-bold text-white font-display">
                Customer Portal Registration
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Create your C &amp; A Motorcycle Shop customer account to register your motorcycles,
                book service appointments, and track live repair status.
              </p>

              {regMessage && (
                <div
                  className={`mt-4 p-3 rounded-lg text-xs border ${
                    regMessage.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                      : 'bg-red-950/60 border-red-700 text-red-200'
                  }`}
                >
                  {regMessage.text}
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.fullName}
                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                    placeholder="e.g. Ryan Jay Dulay"
                    className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      placeholder="0917-XXX-XXXX"
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="rider@email.com"
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Street / House Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.address}
                      onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                      placeholder="#14 Rimando Road"
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Barangay / City
                    </label>
                    <input
                      type="text"
                      value={regForm.barangayCity}
                      onChange={(e) => setRegForm({ ...regForm, barangayCity: e.target.value })}
                      placeholder="Baguio City"
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Preferred Portal Username
                  </label>
                  <input
                    type="text"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    placeholder="e.g. ryandulay"
                    className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                >
                  Create Customer Account &amp; Enter Portal
                </button>
              </form>
            </div>
          </section>
        )}

        {activePage === 'login' && (
          <section className="max-w-4xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Login Form */}
              <div className="lg:col-span-6 p-6 sm:p-8 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 text-orange-500 text-xs font-medium">
                  <KeyRound className="w-4 h-4" />
                  <span>Role-Based Authentication</span>
                </div>
                <h1 className="text-2xl font-bold text-white mt-1 font-display">
                  Sign In to C &amp; A System
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Enter your credentials or select a demonstration account on the right.
                </p>

                {loginError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-700 text-xs text-red-200">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="login-username"
                      className="block text-xs font-medium text-neutral-300 mb-1"
                    >
                      Username
                    </label>
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-medium text-neutral-300 mb-1"
                    >
                      Password
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                  >
                    {loginLoading ? 'Authenticating...' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    disabled={loginLoading}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Sign In with Google</span>
                  </button>
                </form>
              </div>

              {/* Demonstration Accounts Panel */}
              <div className="lg:col-span-6 p-6 sm:p-8 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-orange-400 text-xs font-medium">
                    <UserCheck className="w-4 h-4" />
                    <span>5 Pre-Configured Test Accounts</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1 font-display">
                    One-Click Role Testing
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Click any role below to log in immediately and test its modules and real-time
                    WebSocket notification visibility:
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {[
                      {
                        role: 'admin' as UserRole,
                        title: 'A. Administrator',
                        user: 'admin',
                        pass: 'Admin@CA2026',
                        desc: 'Full control, User Accounts, RBAC, Audit Logs, XAMPP/SQL Backup',
                      },
                      {
                        role: 'owner' as UserRole,
                        title: 'B. Management / Owner',
                        user: 'owner',
                        pass: 'Owner@CA2026',
                        desc: 'Sales/Inventory Reports, Suppliers, Low-Stock & Feedback Alerts',
                      },
                      {
                        role: 'cashier' as UserRole,
                        title: 'C. Cashier / Front Desk',
                        user: 'cashier',
                        pass: 'Cashier@CA2026',
                        desc: 'Customers, Appointments, Job Orders, POS Billing & Receipts',
                      },
                      {
                        role: 'mechanic' as UserRole,
                        title: 'D. Mechanic / Technician',
                        user: 'mechanic',
                        pass: 'Mechanic@CA2026',
                        desc: 'Assigned Job Orders, Inspection Results, Parts Usage & Status',
                      },
                      {
                        role: 'customer' as UserRole,
                        title: 'E. Customer Portal',
                        user: 'customer',
                        pass: 'Customer@CA2026',
                        desc: 'My Motorcycles, Book Appointment, Live Repair Tracker & Receipts',
                      },
                    ].map((acct) => (
                      <button
                        key={acct.role}
                        type="button"
                        onClick={() => handleQuickDemoRole(acct.role, acct.user, acct.pass)}
                        className="w-full p-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-orange-500/60 text-left transition-colors flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{acct.title}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">{acct.desc}</div>
                        </div>
                        <div className="text-right font-mono text-[11px] text-orange-400 shrink-0">
                          <div>{acct.user}</div>
                          <div className="text-neutral-500">{acct.pass}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="px-6 lg:px-12 py-6 border-t border-neutral-800 bg-neutral-950 text-xs text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-semibold text-neutral-200">
            C &amp; A Motorcycle Shop Management System
          </span>
          <span aria-hidden="true"> · </span>
          <span>Magsaysay Ave., Baguio City</span>
          <span aria-hidden="true"> · </span>
          <span>RA 10173 Data Privacy Compliant</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="hover:text-white transition-colors"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="hover:text-white transition-colors"
          >
            Customer Registration
          </button>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="hover:text-white transition-colors"
          >
            Staff &amp; Customer Sign In
          </button>
        </div>
      </footer>
    </div>
  );
};
