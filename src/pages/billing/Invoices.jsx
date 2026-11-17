import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle2, Clock, AlertCircle, Plus, Ban, Play, ArrowRight, ArrowLeft, ShieldCheck, Banknote
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
import Tabs from '../../components/ui/Tabs';
import apiClient from '../../services/apiClient';
import { getInvoices, updateInvoice, voidInvoice } from '../../data/mockInvoices';
import { getProperties } from '../../data/mockProperties';
import { getTenants } from '../../data/mockTenants';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function Invoices({ embedded = false }) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState(() => getInvoices());
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiClient.get('/invoices?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setInvoices(items);
        localStorage.setItem('custom_invoices', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const properties = useMemo(() => getProperties().filter((p) => !p.archived), []);
  const tenants = useMemo(() => getTenants(), []);

  // 5-Step Create Invoice Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [form, setForm] = useState({
    propertyName: properties[0]?.name || 'Sunrise Residency',
    tenantId: String(tenants[0]?.id || 1),
    month: 'Dec 2026',
    dueDate: '2026-12-01',
    rent: '2000',
    utilities: '0',
    addons: '0',
    proration: '0',
    credits: '0',
    lateFee: '0',
    salesTax: '0',
    notes: '',
  });

  // Void Invoice Modal
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'open' && (inv.status === 'Overdue' || inv.status === 'Partial' || inv.status === 'Pending')) ||
        (activeTab === 'paid' && inv.status === 'Paid') ||
        (activeTab === 'voided' && inv.status === 'Voided');
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        !q ||
        String(inv.id || '').toLowerCase().includes(q) ||
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        (inv.tenantName || '').toLowerCase().includes(q) ||
        (inv.propertyName || '').toLowerCase().includes(q) ||
        (inv.unitNumber || '').toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [invoices, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const valid = invoices.filter((i) => i.status !== 'Voided');
    const billed = valid.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const collected = valid.reduce((s, i) => s + (Number(i.paid) || 0), 0);
    const outstanding = valid.reduce((s, i) => s + (Number(i.balance) || 0), 0);
    const overdue = valid.filter((i) => i.status === 'Overdue').reduce((s, i) => s + (Number(i.balance) || 0), 0);
    return { billed, collected, outstanding, overdue };
  }, [invoices]);

  const selectedTenantObj = useMemo(
    () => tenants.find((t) => String(t.id) === String(form.tenantId)) || tenants[0],
    [tenants, form.tenantId]
  );

  const computedInvoiceTotal = useMemo(() => {
    const total =
      (Number(form.rent) || 0) +
      (Number(form.utilities) || 0) +
      (Number(form.addons) || 0) +
      (Number(form.proration) || 0) +
      (Number(form.lateFee) || 0) +
      (Number(form.salesTax) || 0) -
      (Number(form.credits) || 0);
    return Math.max(0, total);
  }, [form]);

  const handleRunRecurring = () => {
    toast.success(`Recurring charge cycle previewed for ${tenants.filter((t) => t.status === 'Active').length} active leases (No auto-bank debit without AutoPay enrollment).`);
  };

  const handleCreateSubmit = () => {
    const newId = `INV-2026-${String(invoices.length + 11).padStart(3, '0')}`;
    const total = computedInvoiceTotal;
    updateInvoice(newId, {
      id: newId,
      tenantId: selectedTenantObj?.id || 1,
      tenantName: selectedTenantObj?.name || 'Resident',
      propertyName: selectedTenantObj?.propertyName || form.propertyName,
      unitNumber: selectedTenantObj?.unitNumber || 'A-101',
      month: form.month,
      rent: Number(form.rent) || 0,
      maintenance: 0,
      utilities: Number(form.utilities) || 0,
      addons: (Number(form.addons) || 0) + (Number(form.proration) || 0),
      credits: Number(form.credits) || 0,
      salesTax: Number(form.salesTax) || 0,
      lateFee: Number(form.lateFee) || 0,
      total,
      paid: 0,
      balance: total,
      status: 'Pending',
      dueDate: form.dueDate,
      agingBucket: 'Current',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setInvoices(getInvoices());
    setIsCreateOpen(false);
    setCreateStep(1);
    toast.success(`Invoice ${newId} posted for ${formatUsd(total)}.`);
  };

  const handleConfirmVoid = () => {
    if (!voidTarget || !voidReason.trim()) {
      toast.error('Please enter an audit reason before voiding a posted invoice.');
      return;
    }
    voidInvoice(voidTarget.id, voidReason.trim());
    setInvoices(getInvoices());
    setVoidTarget(null);
    setVoidReason('');
    toast.success(`Invoice ${voidTarget.id} voided (audit history retained).`);
  };

  const columns = [
    {
      key: 'id',
      label: 'Invoice #',
      render: (_, row) => (
        <div>
          <p className="font-bold text-indigo-700">{row.id}</p>
          <p className="text-[11px] text-gray-500">{row.month}</p>
        </div>
      ),
    },
    {
      key: 'tenantName',
      label: 'Resident & Unit',
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-900">{row.tenantName}</p>
          <p className="text-xs text-gray-500">{row.propertyName} · {row.unitNumber}</p>
        </div>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (_, row) => <span className="text-xs text-gray-700">{formatDate(row.dueDate)}</span>,
    },
    {
      key: 'total',
      label: 'Billed Total',
      render: (_, row) => <span className="font-bold text-gray-900">{formatUsd(row.total)}</span>,
    },
    {
      key: 'paid',
      label: 'Paid',
      render: (_, row) => <span className="font-semibold text-emerald-700">{formatUsd(row.paid)}</span>,
    },
    {
      key: 'balance',
      label: 'Open Balance',
      render: (_, row) => (
        <span className={`font-bold ${Number(row.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {formatUsd(row.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <div>
          <Badge status={row.status} />
          {row.voidReason && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[110px]">{row.voidReason}</p>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {!embedded ? (
        <PageHeader
          title="Invoices & Recurring Billing"
          subtitle="Generate itemized U.S. rent statements, proration, utility pass-throughs, credits, and immutable void reversals."
          breadcrumbs={[{ label: 'Rent & Payments' }, { label: 'Invoices' }]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Banknote} onClick={() => navigate('/rent-payments?tab=collections')}>
                Record Payment (Cash / ACH)
              </Button>
              <Button variant="secondary" icon={Play} onClick={handleRunRecurring}>
                Run Recurring Charges
              </Button>
              <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
                Create Invoice
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Generate itemized U.S. rent statements, proration, utility pass-throughs, credits, and immutable void reversals.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Banknote} onClick={() => navigate('/rent-payments?tab=collections')}>
              Record Payment (Cash / ACH)
            </Button>
            <Button variant="secondary" icon={Play} onClick={handleRunRecurring}>
              Run Recurring Charges
            </Button>
            <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
              Create Invoice
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Billed" value={formatUsd(stats.billed)} subtitle="Non-voided active statements" icon={FileText} color="blue" />
        <StatCard title="Collected" value={formatUsd(stats.collected)} subtitle="Settled receipts applied" icon={CheckCircle2} color="green" />
        <StatCard title="Outstanding" value={formatUsd(stats.outstanding)} subtitle="Open tenant receivables" icon={Clock} color="amber" />
        <StatCard title="Overdue" value={formatUsd(stats.overdue)} subtitle="Past due grace window" icon={AlertCircle} color="red" />
      </div>

      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3 text-xs text-emerald-950">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p>
            <strong>Accounting Integrity &amp; Billing Safeguard:</strong> Creating an invoice does not auto-charge a tenant bank account or card unless AutoPay authorization is active. Posted invoices are immutable and can only be voided with a recorded reason.
          </p>
          <p className="text-[11px] text-emerald-800">
            💵 <strong>Office Cash &amp; Check Tenders:</strong> If a resident pays by Cash or Check in person, click <strong>"Receive Cash / Pay"</strong> on the invoice or go to <strong>Collections &amp; Aging</strong> to generate an official duplicate Cash Receipt (<code>CSH-...</code>) and safe escrow voucher.
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: `All (${invoices.length})` },
              { id: 'open', label: `Open / Overdue (${invoices.filter((i) => i.status === 'Overdue' || i.status === 'Partial' || i.status === 'Pending').length})` },
              { id: 'paid', label: `Paid (${invoices.filter((i) => i.status === 'Paid').length})` },
              { id: 'voided', label: `Voided (${invoices.filter((i) => i.status === 'Voided').length})` },
            ]}
            activeTab={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setPage(1);
            }}
          />
          <input
            type="text"
            placeholder="Search invoice #, resident, property..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-72 px-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <Table
          columns={columns}
          data={filtered}
          page={page}
          totalPages={Math.max(1, Math.ceil(filtered.length / 8))}
          totalItems={filtered.length}
          pageSize={8}
          onPageChange={setPage}
          actions={(row) => (
            <div className="flex items-center gap-1.5 justify-end">
              {row.status !== 'Voided' && Number(row.balance) > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/rent-payments?tab=collections&invoiceId=${row.id}`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-xs cursor-pointer transition-colors"
                  title="Receive in-person cash or bank payment"
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  Receive Cash / Pay
                </button>
              )}
              {row.status !== 'Voided' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVoidTarget(row);
                  }}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Void Invoice"
                >
                  <Ban className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      </Card>

      {/* 5-Step Create Invoice Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Create Invoice · Step ${createStep} of 5`}
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="secondary" icon={ArrowLeft} disabled={createStep === 1} onClick={() => setCreateStep((s) => s - 1)}>
              Back
            </Button>
            {createStep < 5 ? (
              <Button icon={ArrowRight} onClick={() => setCreateStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button icon={CheckCircle2} onClick={handleCreateSubmit}>Post Invoice ({formatUsd(computedInvoiceTotal)})</Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {createStep === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tenant / Lease Account"
                value={form.tenantId}
                options={tenants.map((t) => ({ value: String(t.id), label: `${t.name} (${t.propertyName} · ${t.unitNumber})` }))}
                onChange={(e) => {
                  const picked = tenants.find((t) => String(t.id) === e.target.value);
                  setForm({
                    ...form,
                    tenantId: e.target.value,
                    propertyName: picked?.propertyName || form.propertyName,
                    rent: String(picked?.rent || form.rent),
                  });
                }}
              />
              <Input label="Linked Property" value={selectedTenantObj?.propertyName || form.propertyName} readOnly />
            </div>
          )}

          {createStep === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Billing Period Label" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
              <Input label="Payment Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          )}

          {createStep === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Base Rent (USD)" type="number" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} />
              <Input label="Utilities / RUBS Pass-Through (USD)" type="number" value={form.utilities} onChange={(e) => setForm({ ...form, utilities: e.target.value })} />
              <Input label="Parking / Pet / Add-ons (USD)" type="number" value={form.addons} onChange={(e) => setForm({ ...form, addons: e.target.value })} />
              <Input label="Mid-Month Proration (USD)" type="number" value={form.proration} onChange={(e) => setForm({ ...form, proration: e.target.value })} />
            </div>
          )}

          {createStep === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Late Fee (USD)" type="number" value={form.lateFee} onChange={(e) => setForm({ ...form, lateFee: e.target.value })} />
              <Input label="Credits / Concessions (-USD)" type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
              <Input label="Sales / Local Tax (USD)" type="number" value={form.salesTax} onChange={(e) => setForm({ ...form, salesTax: e.target.value })} />
            </div>
          )}

          {createStep === 5 && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Resident</span><span className="font-bold text-gray-900">{selectedTenantObj?.name} · {selectedTenantObj?.unitNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Billing Period / Due</span><span className="font-semibold text-gray-800">{form.month} · Due {formatDate(form.dueDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Base + Add-ons + Tax</span><span className="font-semibold text-gray-800">{formatUsd(Number(form.rent) + Number(form.utilities) + Number(form.addons) + Number(form.proration) + Number(form.lateFee) + Number(form.salesTax))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Concessions / Credits</span><span className="font-semibold text-emerald-700">-{formatUsd(form.credits)}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-black">
                <span>Total Invoice Posted</span>
                <span className="text-indigo-700">{formatUsd(computedInvoiceTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Void Reason Modal */}
      <Modal
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        title={`Void Invoice ${voidTarget?.id}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVoidTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmVoid}>Confirm Void</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Posted invoices cannot be hard-deleted. Voiding zeroes open balance and preserves an audit entry.
          </p>
          <Input
            label="Audit Reason *"
            placeholder="e.g. Duplicate charge or concession agreement"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
