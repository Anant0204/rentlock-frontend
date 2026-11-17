import { useState, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
  Landmark, ArrowUpRight, ArrowDownLeft, Plus, ShieldCheck, History, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import Drawer from '../../components/ui/Drawer';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { getInvoices } from '../../data/mockInvoices';
import { getTenants } from '../../data/mockTenants';
import { getProperties } from '../../data/mockProperties';
import { getAdminPortalState, updateAdminPortalState } from '../../data/adminPortalStore';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function PaymentLedger({ embedded = false }) {
  const [activeTab, setActiveTab] = useState('ledger');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [portalState, setPortalState] = useState(() => getAdminPortalState());
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [invoices, setInvoices] = useState(() => getInvoices().filter((i) => i.status !== 'Voided'));

  useEffect(() => {
    apiClient.get('/invoices?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setInvoices(items.filter((i) => i.status !== 'Voided'));
      }
    }).catch(() => {});
  }, []);

  const tenants = useMemo(() => getTenants(), []);
  const properties = useMemo(() => getProperties().filter((p) => !p.archived), []);

  const [adjForm, setAdjForm] = useState({
    tenantName: tenants[0]?.name || 'Rebecca Miller',
    type: 'Credit (Concession)',
    amount: '100',
    reason: '',
  });

  const ledgerRows = useMemo(() => {
    const baseRows = invoices
      .filter((i) => !propertyFilter || i.propertyName === propertyFilter)
      .map((inv) => ({
        id: inv.id,
        date: inv.paymentDate || inv.dueDate,
        tenantName: inv.tenantName,
        propertyName: inv.propertyName,
        unitNumber: inv.unitNumber,
        description: `${inv.month} Rent + Charges`,
        debit: Number(inv.total) || 0,
        credit: Number(inv.paid) || 0,
        balance: Number(inv.balance) || 0,
        status: inv.status,
      }));

    return baseRows.reduce((acc, row) => {
      const prevBal = acc.length > 0 ? acc[acc.length - 1].runningBalance : 0;
      const runningBalance = prevBal + row.debit - row.credit;
      return [...acc, { ...row, runningBalance }];
    }, []);
  }, [invoices, propertyFilter]);

  const stats = useMemo(() => {
    const totalDebit = ledgerRows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledgerRows.reduce((s, r) => s + r.credit, 0);
    const openReceivable = ledgerRows.reduce((s, r) => s + r.balance, 0);
    const trustDeposits = (portalState.securityDeposits || [])
      .filter((d) => d.status !== 'Refunded')
      .reduce((s, d) => s + (Number(d.heldAmount) || 0), 0);
    return { totalDebit, totalCredit, openReceivable, trustDeposits };
  }, [ledgerRows, portalState.securityDeposits]);

  const handleRecordAdjustment = () => {
    const amt = Number(adjForm.amount) || 0;
    if (!adjForm.reason.trim() || amt <= 0) {
      toast.error('Please enter a positive USD amount and mandatory audit reason.');
      return;
    }
    const pickedTenant = tenants.find((t) => t.name === adjForm.tenantName);
    const entry = {
      id: `ADJ-${302 + (portalState.ledgerAdjustments?.length || 0)}`,
      date: new Date().toISOString().slice(0, 10),
      tenantName: adjForm.tenantName,
      unitNumber: pickedTenant?.unitNumber || 'Unit',
      propertyName: pickedTenant?.propertyName || 'Portfolio',
      type: adjForm.type,
      amount: amt,
      reason: adjForm.reason.trim(),
      createdBy: 'Robert King (Admin)',
    };
    const next = updateAdminPortalState((prev) => ({
      ...prev,
      ledgerAdjustments: [entry, ...(prev.ledgerAdjustments || [])],
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: formatDate(entry.date),
          user: 'Robert King (Admin)',
          action: 'Recorded Ledger Adjustment',
          target: `${entry.id} · ${entry.tenantName}`,
          beforeAfter: `${entry.type}: ${formatUsd(entry.amount)}`,
          reason: entry.reason,
          effectiveDate: entry.date,
        },
        ...(prev.auditLogs || []),
      ],
    }));
    setPortalState(next);
    setAdjForm({ tenantName: tenants[0]?.name || '', type: 'Credit (Concession)', amount: '100', reason: '' });
    setIsAdjustOpen(false);
    toast.success(`Immutable adjustment ${entry.id} recorded.`);
  };

  const ledgerColumns = [
    { key: 'date', label: 'Posting Date', render: (_, row) => <span className="text-xs text-gray-600">{formatDate(row.date)}</span> },
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
    { key: 'description', label: 'Memo / Reference', render: (_, row) => <span className="text-xs text-gray-700">{row.id} · {row.description}</span> },
    { key: 'debit', label: 'Debit (USD)', render: (_, row) => <span className="font-semibold text-gray-900">{formatUsd(row.debit)}</span> },
    { key: 'credit', label: 'Credit (USD)', render: (_, row) => <span className="font-semibold text-emerald-700">{formatUsd(row.credit)}</span> },
    { key: 'runningBalance', label: 'Running Net AR', render: (_, row) => <span className="font-bold text-indigo-700">{formatUsd(row.runningBalance)}</span> },
    { key: 'status', label: 'Status', render: (_, row) => <Badge status={row.status} /> },
  ];

  return (
    <div className="space-y-6 pb-10">
      {!embedded ? (
        <PageHeader
          title="General Payment Ledger"
          subtitle="Immutable double-entry debit/credit tenant ledger with separate security deposit trust accounting."
          breadcrumbs={[{ label: 'Rent & Payments', path: '/rent-payments' }, { label: 'Payment Ledger' }]}
          actions={
            <Button icon={Plus} onClick={() => setIsAdjustOpen(true)}>
              Record Adjustment
            </Button>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Immutable double-entry debit/credit tenant ledger with separate security deposit trust accounting.</p>
          <Button icon={Plus} onClick={() => setIsAdjustOpen(true)}>
            Record Adjustment
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Debits Billed (AR)" value={formatUsd(stats.totalDebit)} subtitle="Posted rent & fee charges" icon={ArrowUpRight} color="blue" />
        <StatCard title="Credits Settled" value={formatUsd(stats.totalCredit)} subtitle="Confirmed tenant payments" icon={ArrowDownLeft} color="green" />
        <StatCard title="Open Net Balance" value={formatUsd(stats.openReceivable)} subtitle="Operating receivable balance" icon={FileSpreadsheet} color="amber" />
        <StatCard title="Security Deposit Liability" value={formatUsd(stats.trustDeposits)} subtitle="Held separately in Escrow Trust" icon={Landmark} color="purple" />
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'ledger', label: `Operating Ledger (${ledgerRows.length})` },
              { id: 'adjustments', label: `Adjustments (${(portalState.ledgerAdjustments || []).length})` },
              { id: 'deposits', label: `Trust Deposits (${(portalState.securityDeposits || []).length})` },
              { id: 'audit', label: `Audit Timeline (${(portalState.auditLogs || []).length})` },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          {activeTab === 'ledger' && (
            <Select
              value={propertyFilter}
              options={[{ value: '', label: 'All Properties' }, ...properties.map((p) => ({ value: p.name, label: p.name }))]}
              onChange={(e) => setPropertyFilter(e.target.value)}
            />
          )}
        </div>

        {activeTab === 'ledger' && <Table columns={ledgerColumns} data={ledgerRows} />}

        {activeTab === 'adjustments' && (
          <div className="space-y-3">
            {(portalState.ledgerAdjustments || []).map((adj) => (
              <div key={adj.id} className="p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700">{adj.id}</span>
                    <span className="font-bold text-gray-900">{adj.tenantName}</span>
                    <span className="text-xs text-gray-500">({adj.propertyName} · {adj.unitNumber})</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Reason: {adj.reason} · Recorded by {adj.createdBy} on {formatDate(adj.date)}</p>
                </div>
                <div className="text-right">
                  <Badge status={adj.type.includes('Credit') ? 'Paid' : 'Pending'} />
                  <p className="text-sm font-black text-gray-900 mt-1">{formatUsd(adj.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'deposits' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Escrow Trust Liabilities are isolated from Operating Rent Revenue until legally forfeited or refunded upon move-out.</span>
            </div>
            {(portalState.securityDeposits || []).map((dep) => (
              <div key={dep.id} className="p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-sm text-gray-900">{dep.tenantName} · {dep.propertyName} ({dep.unitNumber})</p>
                  <p className="text-gray-500 mt-0.5">{dep.trustAccount} · Collected {formatDate(dep.collectedDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-indigo-700">{formatUsd(dep.heldAmount)}</span>
                  <Badge status={dep.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-2.5">
            {(portalState.auditLogs || []).map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3 text-xs">
                <History className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{log.action} · {log.target}</p>
                  <p className="text-gray-600">{log.beforeAfter} — <em>{log.reason}</em></p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{log.timestamp} · {log.user}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Drawer isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} title="Record Ledger Adjustment">
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Ledger entries cannot be silently erased. Adjustments append an immutable Credit or Debit entry with your audit reason.
          </div>
          <Select
            label="Resident Account"
            value={adjForm.tenantName}
            options={tenants.map((t) => t.name)}
            onChange={(e) => setAdjForm({ ...adjForm, tenantName: e.target.value })}
          />
          <Select
            label="Adjustment Type"
            value={adjForm.type}
            options={['Credit (Concession)', 'Credit (Write-Off)', 'Debit (Late Fee)', 'Debit (Damage / Utility Backcharge)']}
            onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
          />
          <Input
            label="Amount (USD $) *"
            type="number"
            value={adjForm.amount}
            onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
          />
          <Input
            label="Mandatory Audit Reason *"
            placeholder="e.g. Approved maintenance disruption credit"
            value={adjForm.reason}
            onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
          />
          <Button className="w-full" onClick={handleRecordAdjustment}>
            Post Immutable Adjustment
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
