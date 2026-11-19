import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle2, Clock, AlertCircle, Plus, Search,
  DollarSign, Building2, User, Phone, Mail, Receipt, Printer,
  CreditCard, Banknote, ShieldCheck, ArrowRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import apiClient from '../../services/apiClient';
import { getInvoices, updateInvoice } from '../../data/mockInvoices';
import { getProperties } from '../../data/mockProperties';
import { getTenants, updateTenant } from '../../data/mockTenants';
import { getAdminPortalState, updateAdminPortalState } from '../../data/adminPortalStore';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function Invoices({ embedded = false, initialOpenPayment = false }) {
  const navigate = useNavigate();

  // Core Data States
  const [invoices, setInvoices] = useState(() => getInvoices());
  const [tenants, setTenants] = useState(() => getTenants());
  const [properties, setProperties] = useState(() => getProperties().filter((p) => !p.archived));

  // Filter States
  const [statusFilter, setStatusFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(initialOpenPayment);
  const [isCreateChargeOpen, setIsCreateChargeOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [isSubmittingCharge, setIsSubmittingCharge] = useState(false);

  // Payment Form State
  const [payForm, setPayForm] = useState({
    tenantId: '',
    invoiceId: null,
    tenantName: '',
    unitNumber: '',
    propertyName: '',
    amount: '',
    dueBalance: 0,
    method: 'Cash (Office / Hand-Delivered)',
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: '',
  });

  // Create Charge Form State
  const [chargeForm, setChargeForm] = useState({
    tenantId: '',
    chargeType: 'Monthly Rent',
    amount: '',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    notes: '',
  });

  // Fetch live backend data on mount
  useEffect(() => {
    // 1. Fetch live tenants
    apiClient.get('/tenants?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setTenants(items);
        try {
          localStorage.setItem('custom_tenants', JSON.stringify(items));
        } catch {}
      }
    }).catch(() => {});

    // 2. Fetch live properties
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        const active = items.filter((p) => !p.archived);
        setProperties(active);
      }
    }).catch(() => {});

    // 3. Fetch live invoices
    apiClient.get('/invoices?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setInvoices(items);
        try {
          localStorage.setItem('custom_invoices', JSON.stringify(items));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Construct Unified Rent Roll: Combine every Tenant with their active Rent/Invoice details
  const rentRoll = useMemo(() => {
    const invoicesByTenant = new Map();
    invoices.forEach((inv) => {
      if (inv.status !== 'Voided') {
        const tId = String(inv.tenantId || inv.tenant?.id || '');
        if (tId) {
          const list = invoicesByTenant.get(tId) || [];
          list.push(inv);
          invoicesByTenant.set(tId, list);
        }
      }
    });

    const rows = [];
    const processedTenantIds = new Set();

    // Loop through all tenants
    tenants.forEach((tenant) => {
      const tId = String(tenant.id);
      processedTenantIds.add(tId);
      const tenantInvs = invoicesByTenant.get(tId) || [];

      if (tenantInvs.length > 0) {
        tenantInvs.forEach((inv) => {
          const totalAmt = Number(inv.total || inv.amount || tenant.monthlyRent || tenant.rent || 0);
          const paidAmt = Number(inv.paid || inv.paidAmount || 0);
          const bal = Math.max(0, Number(inv.balance !== undefined ? inv.balance : totalAmt - paidAmt));
          let st = inv.status || (bal === 0 ? 'Paid' : 'Pending');
          if (bal > 0 && inv.dueDate && new Date(inv.dueDate) < new Date()) {
            st = 'Overdue';
          }

          rows.push({
            id: inv.id,
            invoiceId: inv.id,
            isInvoice: true,
            tenantId: tenant.id,
            tenantName: tenant.name || inv.tenantName || 'Resident',
            tenantPhone: tenant.phone || tenant.mobile || '—',
            tenantEmail: tenant.email || inv.tenantEmail || '—',
            propertyId: inv.propertyId || tenant.propertyId,
            propertyName: inv.propertyName || tenant.propertyName || 'General Portfolio',
            unitId: inv.unitId || tenant.unitId,
            unitNumber: inv.unitNumber || tenant.unitNumber || 'Unassigned',
            month: inv.month || 'Current Cycle',
            monthlyRent: totalAmt,
            billedTotal: totalAmt,
            paid: paidAmt,
            balance: bal,
            dueDate: inv.dueDate || '2026-12-01',
            status: st,
            paymentMethod: inv.paymentMethod || '—',
          });
        });
      } else {
        // Tenant without prior invoice -> Synthesize monthly rent item
        const rentAmount = Number(tenant.monthlyRent || tenant.rent || 2000);
        const dueBalance = Number(tenant.dueAmount !== undefined ? tenant.dueAmount : rentAmount);
        const paidAmount = Math.max(0, rentAmount - dueBalance);
        const st = dueBalance === 0 ? 'Paid' : 'Pending';

        rows.push({
          id: `TEN-RENT-${tenant.id}`,
          invoiceId: null,
          isInvoice: false,
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantPhone: tenant.phone || tenant.mobile || '—',
          tenantEmail: tenant.email || '—',
          propertyId: tenant.propertyId,
          propertyName: tenant.propertyName || tenant.property?.name || 'General Portfolio',
          unitId: tenant.unitId,
          unitNumber: tenant.unitNumber || tenant.unit?.unitNumber || 'Unassigned',
          month: 'Current Cycle',
          monthlyRent: rentAmount,
          billedTotal: rentAmount,
          paid: paidAmount,
          balance: dueBalance,
          dueDate: '2026-12-05',
          status: st,
          paymentMethod: '—',
        });
      }
    });

    // Catch orphan invoices for tenants not present in tenant roster
    invoices.forEach((inv) => {
      const tId = String(inv.tenantId || inv.tenant?.id || '');
      if (tId && !processedTenantIds.has(tId) && inv.status !== 'Voided') {
        const totalAmt = Number(inv.total || inv.amount || 0);
        const paidAmt = Number(inv.paid || inv.paidAmount || 0);
        const bal = Math.max(0, Number(inv.balance !== undefined ? inv.balance : totalAmt - paidAmt));
        let st = inv.status || (bal === 0 ? 'Paid' : 'Pending');
        if (bal > 0 && inv.dueDate && new Date(inv.dueDate) < new Date()) {
          st = 'Overdue';
        }

        rows.push({
          id: inv.id,
          invoiceId: inv.id,
          isInvoice: true,
          tenantId: inv.tenantId,
          tenantName: inv.tenantName || inv.tenant?.name || 'Resident',
          tenantPhone: inv.tenantPhone || '—',
          tenantEmail: inv.tenantEmail || '—',
          propertyId: inv.propertyId,
          propertyName: inv.propertyName || 'General Portfolio',
          unitId: inv.unitId,
          unitNumber: inv.unitNumber || 'Unassigned',
          month: inv.month || 'Current Cycle',
          monthlyRent: totalAmt,
          billedTotal: totalAmt,
          paid: paidAmt,
          balance: bal,
          dueDate: inv.dueDate || '2026-12-01',
          status: st,
          paymentMethod: inv.paymentMethod || '—',
        });
      }
    });

    return rows;
  }, [tenants, invoices]);

  // Filtered rows for the table
  const filteredRentRoll = useMemo(() => {
    return rentRoll.filter((row) => {
      const q = searchQuery.trim().toLowerCase();

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Pending' && row.status !== 'Pending') return false;
        if (statusFilter === 'Paid' && row.status !== 'Paid') return false;
        if (statusFilter === 'Overdue' && row.status !== 'Overdue') return false;
      }

      // Property filter
      if (propertyFilter !== 'All') {
        if (row.propertyName !== propertyFilter && String(row.propertyId) !== String(propertyFilter)) {
          return false;
        }
      }

      // Search Query
      if (!q) return true;
      return (
        (row.tenantName || '').toLowerCase().includes(q) ||
        (row.propertyName || '').toLowerCase().includes(q) ||
        (row.unitNumber || '').toLowerCase().includes(q) ||
        (row.tenantPhone || '').toLowerCase().includes(q) ||
        (row.tenantEmail || '').toLowerCase().includes(q) ||
        String(row.id || '').toLowerCase().includes(q)
      );
    });
  }, [rentRoll, statusFilter, propertyFilter, searchQuery]);

  // Live KPI Summary Metrics
  const stats = useMemo(() => {
    const totalBilled = rentRoll.reduce((s, r) => s + (Number(r.billedTotal) || 0), 0);
    const totalPaid = rentRoll.reduce((s, r) => s + (Number(r.paid) || 0), 0);
    const totalOutstanding = rentRoll.reduce((s, r) => s + (Number(r.balance) || 0), 0);
    const overdueCount = rentRoll.filter((r) => r.status === 'Overdue').length;
    return {
      billed: totalBilled,
      collected: totalPaid,
      outstanding: totalOutstanding,
      overdueCount,
    };
  }, [rentRoll]);

  // Open Record Payment Modal for a specific row
  const handleOpenRecordPayment = (row = null) => {
    const target = row || rentRoll.find((r) => r.balance > 0) || rentRoll[0];
    if (!target) {
      toast.error('No tenants available to record payment.');
      return;
    }
    setPayForm({
      tenantId: String(target.tenantId || ''),
      invoiceId: target.invoiceId || null,
      tenantName: target.tenantName,
      unitNumber: target.unitNumber,
      propertyName: target.propertyName,
      amount: target.balance > 0 ? String(target.balance) : String(target.monthlyRent),
      dueBalance: target.balance,
      method: 'Cash (Office / Hand-Delivered)',
      paymentDate: new Date().toISOString().slice(0, 10),
      reference: '',
    });
    setIsRecordPaymentOpen(true);
  };

  // Submit Payment Record
  const handleSubmitPayment = async (e) => {
    if (e) e.preventDefault();
    const payAmt = Number(payForm.amount);
    if (!payAmt || payAmt <= 0) {
      toast.error('Please enter a valid payment amount greater than $0.');
      return;
    }

    setIsSubmittingPay(true);
    try {
      const isCash = payForm.method.includes('Cash');
      const receiptId = isCash
        ? `CSH-${Math.floor(1000 + Math.random() * 9000)}`
        : `RCT-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. If invoiceId exists, update invoice
      if (payForm.invoiceId) {
        const inv = invoices.find((i) => String(i.id) === String(payForm.invoiceId));
        const prevPaid = Number(inv?.paid || inv?.paidAmount || 0);
        const total = Number(inv?.total || inv?.amount || payAmt);
        const newPaid = prevPaid + payAmt;
        const newBal = Math.max(0, total - newPaid);
        const newStatus = newBal === 0 ? 'Paid' : 'Pending';

        updateInvoice(payForm.invoiceId, {
          paid: newPaid,
          balance: newBal,
          status: newStatus,
          paymentMethod: payForm.method,
          paymentDate: payForm.paymentDate,
        });

        setInvoices(getInvoices());
      } else {
        // Create new settled invoice record
        const newInvId = `INV-2026-${String(invoices.length + 12).padStart(3, '0')}`;
        updateInvoice(newInvId, {
          id: newInvId,
          tenantId: Number(payForm.tenantId),
          tenantName: payForm.tenantName,
          propertyName: payForm.propertyName,
          unitNumber: payForm.unitNumber,
          month: 'Current Month',
          total: payAmt,
          paid: payAmt,
          balance: 0,
          status: 'Paid',
          paymentMethod: payForm.method,
          paymentDate: payForm.paymentDate,
          dueDate: payForm.paymentDate,
          createdAt: payForm.paymentDate,
        });

        setInvoices(getInvoices());
      }

      // 2. Update Tenant due balance in local store
      if (payForm.tenantId) {
        updateTenant(Number(payForm.tenantId), {
          dueAmount: Math.max(0, Number(payForm.dueBalance) - payAmt),
        });
        setTenants(getTenants());
      }

      // 3. Create Audit Receipt Record
      const newReceipt = {
        id: receiptId,
        invoiceId: payForm.invoiceId || 'DIRECT-RENT',
        date: payForm.paymentDate,
        tenantName: payForm.tenantName,
        propertyName: payForm.propertyName,
        unitNumber: payForm.unitNumber,
        method: payForm.method,
        amount: payAmt,
        remainingBalance: Math.max(0, Number(payForm.dueBalance) - payAmt),
        status: 'Posted',
        notes: payForm.reference || 'Tenant rent tender recorded',
        receivedByStaff: 'Property Manager',
      };

      updateAdminPortalState((prev) => ({
        ...prev,
        receiptsAudit: [newReceipt, ...(prev.receiptsAudit || [])],
      }));

      toast.success(`Payment of ${formatUsd(payAmt)} recorded for ${payForm.tenantName}! Receipt: ${receiptId}`);
      setIsRecordPaymentOpen(false);
    } catch (err) {
      console.error('Record payment error:', err);
      toast.error('Failed to record payment.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Open Create Charge / Invoice Modal
  const handleOpenCreateCharge = () => {
    const firstTenant = tenants[0];
    setChargeForm({
      tenantId: firstTenant ? String(firstTenant.id) : '',
      chargeType: 'Monthly Rent',
      amount: firstTenant ? String(firstTenant.monthlyRent || firstTenant.rent || 2000) : '',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      notes: '',
    });
    setIsCreateChargeOpen(true);
  };

  // Submit Charge / Invoice
  const handleSubmitCharge = async (e) => {
    if (e) e.preventDefault();
    if (!chargeForm.tenantId) {
      toast.error('Please select a tenant.');
      return;
    }
    const numAmt = Number(chargeForm.amount);
    if (!numAmt || numAmt <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!chargeForm.dueDate) {
      toast.error('Please select a due date.');
      return;
    }

    setIsSubmittingCharge(true);
    try {
      const selectedTenant = tenants.find((t) => String(t.id) === String(chargeForm.tenantId));
      const newInvId = `INV-2026-${String(invoices.length + 101).padStart(3, '0')}`;

      // Call backend
      if (selectedTenant?.unitId) {
        apiClient.post('/invoices', {
          tenantId: Number(selectedTenant.id),
          unitId: Number(selectedTenant.unitId),
          description: `${chargeForm.chargeType} · ${selectedTenant.name}`,
          amount: numAmt,
          dueDate: chargeForm.dueDate,
        }).catch(() => {});
      }

      // Save locally
      updateInvoice(newInvId, {
        id: newInvId,
        tenantId: Number(selectedTenant?.id || chargeForm.tenantId),
        tenantName: selectedTenant?.name || 'Resident',
        propertyName: selectedTenant?.propertyName || 'General Portfolio',
        unitNumber: selectedTenant?.unitNumber || 'Unassigned',
        month: chargeForm.chargeType,
        total: numAmt,
        paid: 0,
        balance: numAmt,
        status: 'Pending',
        dueDate: chargeForm.dueDate,
        notes: chargeForm.notes,
        createdAt: new Date().toISOString().slice(0, 10),
      });

      setInvoices(getInvoices());
      toast.success(`Charge of ${formatUsd(numAmt)} posted for ${selectedTenant?.name}!`);
      setIsCreateChargeOpen(false);
    } catch (err) {
      console.error('Post charge error:', err);
      toast.error('Failed to create charge.');
    } finally {
      setIsSubmittingCharge(false);
    }
  };

  // Columns definition for the main Rent Roll Table
  const columns = [
    {
      key: 'tenantName',
      label: 'Tenant & Contact',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
            {row.tenantName?.slice(0, 2).toUpperCase() || 'TN'}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xs sm:text-sm">{row.tenantName}</p>
            <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
              <span>{row.tenantPhone}</span>
              {row.tenantEmail && row.tenantEmail !== '—' && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[130px]">{row.tenantEmail}</span>
                </>
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'propertyName',
      label: 'Property & Unit',
      render: (_, row) => (
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold">
            🏢 {row.propertyName}
          </span>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            Unit: <strong className="text-gray-700">{row.unitNumber}</strong>
          </p>
        </div>
      ),
    },
    {
      key: 'monthlyRent',
      label: 'Monthly Rent',
      render: (_, row) => (
        <span className="font-bold text-gray-900 text-xs sm:text-sm">
          {formatUsd(row.monthlyRent)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (_, row) => (
        <span className="text-xs text-gray-700 font-medium">
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      key: 'paid',
      label: 'Paid',
      render: (_, row) => (
        <span className="font-bold text-emerald-600 text-xs sm:text-sm">
          {formatUsd(row.paid)}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance Due',
      render: (_, row) => (
        <span className={`font-black text-xs sm:text-sm ${row.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
          {formatUsd(row.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <Badge status={row.status === 'Paid' ? 'Paid' : (row.status === 'Overdue' ? 'Overdue' : 'Pending')} />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.balance > 0 ? (
            <Button
              size="sm"
              icon={Banknote}
              onClick={() => handleOpenRecordPayment(row)}
            >
              Record Payment
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              icon={Receipt}
              onClick={() => setSelectedReceipt(row)}
            >
              Receipt
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Tenant Rent Roll & Payment Status</h2>
          <p className="text-xs text-gray-500">Monitor tenant balances, dues, and record rent collection receipts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            icon={Plus}
            onClick={() => handleOpenRecordPayment()}
          >
            Record Payment
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={FileText}
            onClick={handleOpenCreateCharge}
          >
            + Create Charge / Invoice
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expected Rent"
          value={formatUsd(stats.billed)}
          subtitle="All active tenant dues"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Collected This Month"
          value={formatUsd(stats.collected)}
          subtitle="Cleared rent receipts"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Pending Balance"
          value={formatUsd(stats.outstanding)}
          subtitle="Outstanding receivables"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Overdue Tenants"
          value={stats.overdueCount}
          subtitle="Past due grace window"
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Search, Filter & Rent Table */}
      <Card className="p-5 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Pending', 'Paid', 'Overdue'].map((st) => {
              const count = st === 'All'
                ? rentRoll.length
                : rentRoll.filter((r) => r.status === st).length;
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}

            {/* Property Filter Dropdown */}
            {properties.length > 0 && (
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="ml-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer"
              >
                <option value="All">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenant, unit, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* The Main Rent Table */}
        <Table
          columns={columns}
          data={filteredRentRoll}
          emptyMessage="No tenant rent records found for this filter."
        />
      </Card>

      {/* ────────────────────────────────────────────── */}
      {/* RECORD PAYMENT MODAL (Clean 1-Step)            */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title="Record Tenant Rent Payment"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={CheckCircle2}
              loading={isSubmittingPay}
              onClick={handleSubmitPayment}
            >
              Confirm & Record Payment
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs text-gray-700">
          {/* Target Tenant Selector */}
          <div>
            <Select
              label="Select Tenant *"
              required
              value={payForm.tenantId}
              options={tenants.map((t) => ({
                value: String(t.id),
                label: `${t.name} (Unit: ${t.unitNumber || 'Unassigned'} · ${t.propertyName || 'Portfolio'})`,
              }))}
              onChange={(e) => {
                const selected = tenants.find((t) => String(t.id) === String(e.target.value));
                if (selected) {
                  const matchRoll = rentRoll.find((r) => String(r.tenantId) === String(selected.id));
                  setPayForm({
                    ...payForm,
                    tenantId: String(selected.id),
                    tenantName: selected.name,
                    unitNumber: selected.unitNumber || 'Unassigned',
                    propertyName: selected.propertyName || 'General Portfolio',
                    invoiceId: matchRoll?.invoiceId || null,
                    amount: matchRoll?.balance > 0 ? String(matchRoll.balance) : String(selected.monthlyRent || selected.rent || 2000),
                    dueBalance: matchRoll?.balance || (selected.monthlyRent || selected.rent || 2000),
                  });
                }
              }}
            />
          </div>

          {/* Tenant summary pill */}
          {payForm.tenantName && (
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-indigo-950">
              <div>
                <p className="font-bold text-xs">{payForm.tenantName}</p>
                <p className="text-[11px] text-indigo-700">
                  🏢 {payForm.propertyName} · Unit {payForm.unitNumber}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Pending Due</span>
                <span className="text-sm font-black text-rose-600">
                  {formatUsd(payForm.dueBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Payment Amount (USD $) *"
              required
              type="number"
              step="0.01"
              min="0.01"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            />
            <Select
              label="Payment Method *"
              value={payForm.method}
              options={[
                'Cash (Office / Hand-Delivered)',
                'ACH Bank Transfer',
                'Cheque / Manual Check',
                'Debit / Credit Card',
                'Online Portal / UPI',
              ]}
              onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
            />
          </div>

          {/* Payment Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Payment Received Date *"
              required
              type="date"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
            />
            <Input
              label="Reference / Cheque # (Optional)"
              placeholder="e.g. Cheque #4902 or Cash Slip"
              value={payForm.reference}
              onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* CREATE CHARGE / INVOICE MODAL (Clean 1-Step)   */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateChargeOpen}
        onClose={() => setIsCreateChargeOpen(false)}
        title="Create Tenant Charge / Rent Invoice"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCreateChargeOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={Plus}
              loading={isSubmittingCharge}
              onClick={handleSubmitCharge}
            >
              Post Invoice / Charge
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitCharge} className="space-y-4 text-xs text-gray-700">
          <Select
            label="Select Tenant *"
            required
            placeholder="Choose tenant..."
            value={chargeForm.tenantId}
            options={tenants.map((t) => ({
              value: String(t.id),
              label: `${t.name} (Unit: ${t.unitNumber || 'Unassigned'} · ${t.propertyName || 'Portfolio'})`,
            }))}
            onChange={(e) => setChargeForm({ ...chargeForm, tenantId: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Charge Type / Category *"
              value={chargeForm.chargeType}
              options={[
                'Monthly Rent',
                'Utility Surcharge',
                'Late Fee',
                'Maintenance Repair',
                'Parking Fee',
                'Other Charge',
              ]}
              onChange={(e) => setChargeForm({ ...chargeForm, chargeType: e.target.value })}
            />
            <Input
              label="Charge Amount (USD $) *"
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={chargeForm.amount}
              onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
            />
          </div>

          <Input
            label="Payment Due Date *"
            required
            type="date"
            value={chargeForm.dueDate}
            onChange={(e) => setChargeForm({ ...chargeForm, dueDate: e.target.value })}
          />

          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1">
              Memo / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Regular monthly rent for current billing cycle..."
              value={chargeForm.notes}
              onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:bg-white focus:border-indigo-400"
            />
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* VIEW RECEIPT MODAL                             */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        title="Official Rent Receipt"
        size="md"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              variant="secondary"
              icon={Printer}
              onClick={() => window.print()}
            >
              Print Receipt
            </Button>
            <Button onClick={() => setSelectedReceipt(null)}>
              Done
            </Button>
          </div>
        }
      >
        {selectedReceipt && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 text-xs text-gray-800">
            {/* Receipt Header */}
            <div className="flex justify-between items-start pb-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-black text-indigo-700">RentLock Property Management</p>
                <p className="text-[11px] text-gray-500">Official Settlement Receipt Voucher</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ✓ Settled & Paid
                </span>
                <p className="text-[11px] text-gray-500 mt-1">Receipt ID: {selectedReceipt.id || 'RCT-8901'}</p>
              </div>
            </div>

            {/* Tenant and Property Details */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Received From</span>
                <p className="font-bold text-sm text-gray-900">{selectedReceipt.tenantName}</p>
                <p className="text-[11px] text-gray-500">{selectedReceipt.tenantPhone}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Property & Unit</span>
                <p className="font-bold text-sm text-gray-900">{selectedReceipt.propertyName}</p>
                <p className="text-[11px] text-gray-500">Unit: {selectedReceipt.unitNumber}</p>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Date:</span>
                <span className="font-semibold">{formatDate(selectedReceipt.dueDate || new Date().toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-semibold">{selectedReceipt.paymentMethod || 'Cash Tender'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-sm">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-700 font-black">{formatUsd(selectedReceipt.paid || selectedReceipt.monthlyRent)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Remaining Balance Due:</span>
                <span className="font-bold text-gray-900">{formatUsd(selectedReceipt.balance || 0)}</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center italic">
              Thank you for your prompt rent payment. Generated securely by RentLock Portal.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
