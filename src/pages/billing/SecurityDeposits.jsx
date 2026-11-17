import { useState, useMemo } from 'react';
import {
  ShieldCheck, Landmark, FileCheck2, AlertTriangle, CheckCircle2, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import { getAdminPortalState, updateAdminPortalState } from '../../data/adminPortalStore';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function SecurityDeposits({ embedded = false }) {
  const [deposits, setDeposits] = useState(() => getAdminPortalState().securityDeposits || []);
  const [selectedId, setSelectedId] = useState(() => {
    const list = getAdminPortalState().securityDeposits || [];
    const due = list.find((d) => d.status === 'Disposition Due');
    return due?.id || list[0]?.id || '';
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [isItemizeOpen, setIsItemizeOpen] = useState(false);
  const [itemizeForm, setItemizeForm] = useState({ proposedDeduction: '0', deductionReason: '', linkedInvoicePdf: '' });

  const syncDeposits = (updater, auditNote = null) => {
    const next = updateAdminPortalState((prev) => ({
      ...prev,
      securityDeposits: typeof updater === 'function' ? updater(prev.securityDeposits || []) : updater,
      auditLogs: auditNote ? [auditNote, ...(prev.auditLogs || [])] : prev.auditLogs,
    }));
    setDeposits(next.securityDeposits || []);
  };

  const selectedDeposit = useMemo(
    () => deposits.find((d) => String(d.id) === String(selectedId)) || deposits[0] || null,
    [deposits, selectedId]
  );

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => statusFilter === 'All' || d.status === statusFilter);
  }, [deposits, statusFilter]);

  const stats = useMemo(() => {
    const activeHeld = deposits.filter((d) => d.status !== 'Refunded');
    const totalHeld = activeHeld.reduce((sum, d) => sum + (Number(d.heldAmount) || 0), 0);
    const openDispositions = deposits.filter((d) => d.status === 'Disposition Due').length;
    return {
      totalHeld,
      leasesCount: activeHeld.length,
      openDispositions,
    };
  }, [deposits]);

  const openItemizeModal = () => {
    if (!selectedDeposit) return;
    setItemizeForm({
      proposedDeduction: String(selectedDeposit.proposedDeduction || 0),
      deductionReason: selectedDeposit.deductionReason || '',
      linkedInvoicePdf: selectedDeposit.linkedInvoicePdf || 'Turnover-Itemization.pdf',
    });
    setIsItemizeOpen(true);
  };

  const saveItemization = () => {
    if (!selectedDeposit) return;
    const deduction = Math.min(Number(selectedDeposit.heldAmount), Math.max(0, Number(itemizeForm.proposedDeduction) || 0));
    syncDeposits((list) =>
      list.map((d) =>
        d.id === selectedDeposit.id
          ? {
              ...d,
              proposedDeduction: deduction,
              deductionReason: itemizeForm.deductionReason,
              linkedInvoicePdf: itemizeForm.linkedInvoicePdf,
              managerReviewed: true,
            }
          : d
      )
    );
    setIsItemizeOpen(false);
    toast.success('Deduction itemization updated & Manager review marked.');
  };

  const approveDisposition = () => {
    if (!selectedDeposit) return;
    const refundAmount = Math.max(0, (Number(selectedDeposit.heldAmount) || 0) - (Number(selectedDeposit.proposedDeduction) || 0));
    syncDeposits(
      (list) =>
        list.map((d) =>
          d.id === selectedDeposit.id ? { ...d, status: 'Refunded', managerReviewed: true } : d
        ),
      {
        id: `AUD-${Date.now()}`,
        timestamp: formatDate(new Date().toISOString().slice(0, 10)),
        user: 'Robert King (Admin)',
        action: 'Finalized Deposit Disposition',
        target: `${selectedDeposit.id} (${selectedDeposit.unitNumber})`,
        beforeAfter: `Held ${formatUsd(selectedDeposit.heldAmount)} -> Deduction ${formatUsd(selectedDeposit.proposedDeduction)} / Refund ${formatUsd(refundAmount)}`,
        reason: selectedDeposit.deductionReason || 'Move-out deposit disposition completed',
        effectiveDate: new Date().toISOString().slice(0, 10),
      }
    );
    toast.success(`Disposition finalized: Refund of ${formatUsd(refundAmount)} approved.`);
  };

  const columns = [
    {
      key: 'tenantName',
      label: 'Resident & Lease',
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-900">{row.tenantName}</p>
          <p className="text-xs text-gray-500">{row.leaseId} · {row.leaseStatus}</p>
        </div>
      ),
    },
    {
      key: 'propertyName',
      label: 'Property / Unit',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-gray-800">{row.propertyName}</p>
          <p className="text-xs text-indigo-600 font-bold">Unit {row.unitNumber}</p>
        </div>
      ),
    },
    {
      key: 'trustAccount',
      label: 'Escrow Trust Account',
      render: (_, row) => <span className="text-xs text-gray-600">{row.trustAccount}</span>,
    },
    {
      key: 'heldAmount',
      label: 'Held Balance',
      render: (_, row) => <span className="font-bold text-gray-900">{formatUsd(row.heldAmount)}</span>,
    },
    {
      key: 'status',
      label: 'Trust Status',
      render: (_, row) => <Badge status={row.status} />,
    },
  ];

  const refundPreview = selectedDeposit
    ? Math.max(0, (Number(selectedDeposit.heldAmount) || 0) - (Number(selectedDeposit.proposedDeduction) || 0))
    : 0;

  return (
    <div className="space-y-6 pb-10">
      {!embedded && (
        <PageHeader
          title="Security Deposits (Trust Liability)"
          subtitle="Track escrow-held resident security deposits separately from operating revenue and process itemized move-out dispositions."
          breadcrumbs={[{ label: 'Rent & Payments', path: '/rent-payments' }, { label: 'Security Deposits' }]}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Deposits Held" value={formatUsd(stats.totalHeld)} subtitle="Escrow trust liability balance" icon={Landmark} color="blue" />
        <StatCard title="Leases with Deposit" value={stats.leasesCount} subtitle="Active & closing accounts" icon={FileCheck2} color="green" />
        <StatCard title="Reconciliation" value="Balanced" subtitle="Trust ledger matches bank escrow" icon={ShieldCheck} color="purple" />
        <StatCard title="Open Dispositions" value={stats.openDispositions} subtitle="Itemization / refund review due" icon={AlertTriangle} color="amber" />
      </div>

      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3 text-xs text-blue-950">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <span>
          <strong>Trust Accounting Rule:</strong> Security deposits remain a separate Escrow Trust Liability on owner and portfolio ledgers. Only finalized, documented move-out deductions transfer from Trust to Operating Income or Repair Recovery.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-8 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-900">Trust Deposit Register</h3>
            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
              {['All', 'Held', 'Disposition Due', 'Refunded'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    statusFilter === st ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <Table
            columns={columns}
            data={filteredDeposits}
            onRowClick={(row) => setSelectedId(row.id)}
          />
        </Card>

        {/* Right: Disposition Review Panel */}
        <Card className="lg:col-span-4 p-6 space-y-5">
          {selectedDeposit ? (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Disposition Review</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-0.5">{selectedDeposit.tenantName}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedDeposit.propertyName} · Unit {selectedDeposit.unitNumber}
                  </p>
                </div>
                <Badge status={selectedDeposit.status} />
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Original Deposit Held</span>
                  <span className="font-bold text-gray-900">{formatUsd(selectedDeposit.heldAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Proposed Repair / Fee Deduction</span>
                  <span className="font-bold text-rose-600">-{formatUsd(selectedDeposit.proposedDeduction || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-black">
                  <span className="text-emerald-900">Proposed Refund Amount</span>
                  <span className="text-emerald-700">{formatUsd(refundPreview)}</span>
                </div>
              </div>

              {selectedDeposit.deductionReason && (
                <div className="p-3.5 rounded-xl bg-white border border-gray-200 text-xs space-y-1">
                  <p className="font-bold text-gray-700">Itemization Summary</p>
                  <p className="text-gray-600">{selectedDeposit.deductionReason}</p>
                  {selectedDeposit.linkedInvoicePdf && (
                    <p className="text-indigo-600 font-semibold flex items-center gap-1 pt-1">
                      <FileText className="w-3.5 h-3.5" /> {selectedDeposit.linkedInvoicePdf}
                    </p>
                  )}
                </div>
              )}

              {selectedDeposit.dispositionDue && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Statutory Disposition Deadline: <strong>{formatDate(selectedDeposit.dispositionDue)}</strong>. Manager review required prior to releasing funds.
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button variant="secondary" onClick={openItemizeModal}>
                  Review / Edit Itemization ›
                </Button>
                {selectedDeposit.status !== 'Refunded' && (
                  <Button icon={CheckCircle2} onClick={approveDisposition}>
                    Approve Refund & Close Disposition
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Select a deposit record to inspect disposition.</p>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isItemizeOpen}
        onClose={() => setIsItemizeOpen(false)}
        title="Review Deposit Deduction Itemization"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsItemizeOpen(false)}>Cancel</Button>
            <Button onClick={saveItemization}>Save Itemization</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Proposed Deduction Amount (USD)"
            type="number"
            value={itemizeForm.proposedDeduction}
            onChange={(e) => setItemizeForm({ ...itemizeForm, proposedDeduction: e.target.value })}
          />
          <Input
            label="Itemized Reason / Repair Summary"
            placeholder="e.g. Drywall patch ($225) + key fob replacement ($75)"
            value={itemizeForm.deductionReason}
            onChange={(e) => setItemizeForm({ ...itemizeForm, deductionReason: e.target.value })}
          />
          <Input
            label="Linked Invoice / Photo Evidence PDF"
            value={itemizeForm.linkedInvoicePdf}
            onChange={(e) => setItemizeForm({ ...itemizeForm, linkedInvoicePdf: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
