import { useState, useMemo } from 'react';
import { Receipt, Printer, Mail, ShieldCheck, Eye, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import Select from '../../components/ui/Select';
import { getAdminPortalState, updateAdminPortalState } from '../../data/adminPortalStore';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function Receipts({ embedded = false }) {
  const [receipts, setReceipts] = useState(() => getAdminPortalState().receiptsAudit || []);
  const [methodFilter, setMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      const mOk = methodFilter === 'All' || r.method === methodFilter;
      const sOk = statusFilter === 'All' || r.status === statusFilter;
      return mOk && sOk;
    });
  }, [receipts, methodFilter, statusFilter]);

  const handleReverse = (rct) => {
    const nextState = updateAdminPortalState((prev) => ({
      ...prev,
      receiptsAudit: (prev.receiptsAudit || []).map((r) =>
        r.id === rct.id
          ? {
              ...r,
              status: 'Voided',
              auditLog: [...(r.auditLog || []), `${formatDate(new Date().toISOString().slice(0, 10))} · Reversed by Admin (Correction)`],
            }
          : r
      ),
    }));
    setReceipts(nextState.receiptsAudit || []);
    setSelectedReceipt((prev) => (prev ? { ...prev, status: 'Voided' } : null));
    toast.success(`Receipt ${rct.id} marked Reversed/Voided in immutable audit trail.`);
  };

  const columns = [
    { key: 'id', label: 'Receipt #', render: (_, row) => <span className="font-bold text-indigo-700">{row.id}</span> },
    { key: 'date', label: 'Posted Date', render: (_, row) => <span className="text-xs text-gray-700">{formatDate(row.date)}</span> },
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
    { key: 'method', label: 'Method', render: (_, row) => <span className="text-xs font-medium text-gray-700">{row.method}</span> },
    { key: 'amount', label: 'Paid', render: (_, row) => <span className="font-bold text-emerald-700">{formatUsd(row.amount)}</span> },
    { key: 'remainingBalance', label: 'Post-Pay Bal', render: (_, row) => <span className="text-xs font-semibold text-gray-800">{formatUsd(row.remainingBalance)}</span> },
    { key: 'status', label: 'Status', render: (_, row) => <Badge status={row.status === 'Posted' ? 'Paid' : row.status} /> },
  ];

  return (
    <div className="space-y-6 pb-10">
      {!embedded && (
        <PageHeader
          title="Payment Receipts & Audit"
          subtitle="Issued payment receipts generated strictly after settlement confirmation, with invoice allocations and audit logs."
          breadcrumbs={[{ label: 'Rent & Payments', path: '/rent-payments' }, { label: 'Receipts' }]}
        />
      )}

      <Card className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Receipts are issued only after provider confirmation or Admin manual posting.</span>
          </div>
          <div className="flex gap-3">
            <Select
              value={methodFilter}
              options={['All', 'Cash (Office / Hand-Delivered)', 'ACH Bank Transfer', 'Debit / Credit Card', 'Check', 'Wire / Online Portal']}
              onChange={(e) => setMethodFilter(e.target.value)}
            />
            <Select
              value={statusFilter}
              options={['All', 'Posted', 'Voided']}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filtered}
          onRowClick={(row) => setSelectedReceipt(row)}
          actions={(row) => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReceipt(row);
              }}
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
              title="Open Receipt Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        />
      </Card>

      <Drawer
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title={`Receipt ${selectedReceipt?.id || ''}`}
      >
        {selectedReceipt && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-base text-gray-900">{selectedReceipt.tenantName}</span>
                <Badge status={selectedReceipt.status === 'Posted' ? 'Paid' : selectedReceipt.status} />
              </div>
              <p className="text-gray-500">{selectedReceipt.propertyName} · Unit {selectedReceipt.unitNumber}</p>
              
              {selectedReceipt.method.includes('Cash') && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>💵 Verified Physical Cash Payment</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Hand-delivered cash received at management office. Dual-sign cash voucher logged with escrow ledger.
                  </p>
                  {selectedReceipt.receivedByStaff && (
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Received by: <strong>{selectedReceipt.receivedByStaff}</strong>
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div><p className="text-gray-400">Amount Paid</p><p className="font-black text-emerald-700 text-base">{formatUsd(selectedReceipt.amount)}</p></div>
                <div><p className="text-gray-400">Remaining Balance</p><p className="font-black text-gray-900 text-base">{formatUsd(selectedReceipt.remainingBalance)}</p></div>
                <div><p className="text-gray-400">Method</p><p className="font-bold text-gray-800">{selectedReceipt.method}</p></div>
                <div><p className="text-gray-400">Date</p><p className="font-bold text-gray-800">{formatDate(selectedReceipt.date)}</p></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2.5 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-gray-500">Invoice Allocations</h4>
              {(selectedReceipt.allocations || []).map((a, idx) => (
                <div key={idx} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700">{a.invoiceId} · {a.label}</span>
                  <span className="font-bold text-gray-900">{formatUsd(a.allocated)}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Audit Trail
              </h4>
              {(selectedReceipt.auditLog || []).map((entry, idx) => (
                <p key={idx} className="text-gray-700 py-1 border-b border-gray-50 last:border-0">{entry}</p>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Printer} onClick={() => toast.success(`Preparing printable PDF for ${selectedReceipt.id}...`)}>
                Print / PDF
              </Button>
              <Button variant="secondary" icon={Mail} onClick={() => toast.success(`Receipt ${selectedReceipt.id} re-emailed to tenant.`)}>
                Email Tenant
              </Button>
              {selectedReceipt.status !== 'Voided' && (
                <Button variant="danger" icon={RotateCcw} onClick={() => handleReverse(selectedReceipt)}>
                  Reverse Entry
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
