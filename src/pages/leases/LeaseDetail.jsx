import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Archive, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { getLeases, archiveLease, updateLease } from '../../data/mockLeases';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function LeaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leasesList, setLeasesList] = useState(() => getLeases());
  const lease = leasesList.find((l) => String(l.id) === String(id)) || leasesList[0];

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  if (!lease) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Lease record not found.</p>
        <Button className="mt-4" onClick={() => navigate('/leases')}>Back to Leases</Button>
      </div>
    );
  }

  const handleRenew = () => {
    updateLease(lease.id, { status: 'Active', noticePeriod: '60 days (Renewed)' });
    setLeasesList(getLeases());
    toast.success('Lease marked for active renewal.');
  };

  const handleArchive = () => {
    archiveLease(lease.id, true);
    setLeasesList(getLeases());
    setIsArchiveModalOpen(false);
    toast.success('Lease archived. Financial invoices and trust deposit history remain intact.');
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={`Lease · ${lease.tenantName}`}
        subtitle={`${lease.propertyName} · Unit ${lease.unitNumber} · ${lease.leaseType || 'Fixed-Term'} (${lease.stateJurisdiction || 'NY'})`}
        breadcrumbs={[{ label: 'Leases', path: '/leases' }, { label: `Lease #${lease.id}` }]}
        onBack={() => navigate('/leases')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => toast.success(`Downloading ${lease.signedPdf ? 'Executed Signed PDF' : 'Draft Lease PDF'}...`)}
            >
              {lease.signedPdf ? 'Download Signed PDF' : 'Download Draft PDF'}
            </Button>
            <Button variant="secondary" icon={RefreshCw} onClick={handleRenew}>
              Renew Term
            </Button>
            {!lease.archived && lease.status !== 'Archived' && (
              <Button variant="danger" icon={Archive} onClick={() => setIsArchiveModalOpen(true)}>
                Archive Lease
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Template Notice:</strong> {lease.templateVersion || 'State Residential Lease'}. Templates do not guarantee automatic statutory compliance; review local housing ordinances prior to execution or amendment.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Agreement Summary</h3>
                <p className="text-xs text-gray-500">Created {formatDate(lease.createdAt)} · Notice Window {lease.noticeDays || 60} days</p>
              </div>
            </div>
            <Badge status={lease.archived ? 'Archived' : lease.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500">Monthly Base Rent</p>
              <p className="text-lg font-black text-gray-900 mt-1">{formatUsd(lease.monthlyRent)}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-[11px] text-emerald-700">Trust Deposit Held</p>
              <p className="text-lg font-black text-emerald-900 mt-1">{formatUsd(lease.deposit)}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500">Start Date</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{formatDate(lease.startDate)}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500">End Date</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{lease.endDate ? formatDate(lease.endDate) : 'Month-to-Month'}</p>
            </div>
          </div>

          {/* Recurring Charges & Rent Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Recurring Add-ons</h4>
              {(lease.recurringAddons || []).length > 0 ? (
                lease.recurringAddons.map((a, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700">{a.label}</span>
                    <span className="font-bold text-gray-900">{formatUsd(a.amount)}/mo</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No recurring add-on charges configured.</p>
              )}
              <p className="text-[11px] text-gray-500 pt-1">Late Fee Policy: <strong>{lease.lateFeeRule}</strong></p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Rent Escalation Schedule</h4>
              {(lease.rentSchedule || []).length > 0 ? (
                lease.rentSchedule.map((row, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700">{row.year} ({formatDate(row.effective)})</span>
                    <span className="font-bold text-indigo-700">{formatUsd(row.monthlyRent)} · {row.change}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">Standard rate: {formatUsd(lease.monthlyRent)}/mo</p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Special Clauses & Addenda</p>
            <p className="text-sm text-gray-800 leading-relaxed">{lease.specialClauses || lease.terms}</p>
          </div>
        </Card>

        {/* Signers & Milestones */}
        <Card className="p-6 space-y-5 h-fit">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Signers & Execution Roster</h3>
            <p className="text-xs text-gray-500">All executed copies are archived immutably.</p>
          </div>

          <div className="space-y-3">
            {(lease.signers || lease.coSigners || []).map((signer, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-900">{signer.name}</p>
                  <p className="text-gray-500">{signer.role}</p>
                </div>
                <div className="text-right">
                  <Badge status={signer.status === 'Signed' ? 'Active' : signer.status || 'Active'} />
                  {signer.signedAt && <p className="text-[10px] text-gray-400 mt-1">{signer.signedAt}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-600" /> Renewal Reminders Scheduled</p>
            <p>{(lease.reminders || [90, 60, 30, 7]).join(' / ')} days prior to end date.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Archive Policy:</strong> Linked leases cannot be hard-deleted; archiving preserves trust deposit and billing audit trails.
            </span>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Lease Record"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleArchive}>Archive Lease</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Archive lease for <strong>{lease.tenantName}</strong> ({lease.propertyName} · {lease.unitNumber})? Billing history and security deposit trust records stay preserved.
        </p>
      </Modal>
    </div>
  );
}
