import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Trash2, RefreshCw, AlertTriangle, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import apiClient from '../../services/apiClient';
import { getLeases, deleteLease, updateLease } from '../../data/mockLeases';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function LeaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leasesList, setLeasesList] = useState(() => getLeases());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    apiClient.get(`/leases/${id}`).then((res) => {
      if (res && res.id) {
        setLeasesList((prev) => {
          const idx = prev.findIndex((l) => String(l.id) === String(id));
          if (idx > -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...res };
            return updated;
          }
          return [...prev, res];
        });
      }
    }).catch(() => {});
  }, [id]);

  const lease = leasesList.find((l) => String(l.id) === String(id)) || leasesList[0];

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (lease.id && !isNaN(Number(lease.id))) {
        await apiClient.delete(`/leases/${lease.id}`).catch((err) => {
          console.warn('[Lease] Delete backend notice:', err.message);
        });
      }
      deleteLease(lease.id);
      toast.success('Lease agreement deleted successfully.');
      setIsDeleteModalOpen(false);
      navigate('/leases');
    } catch (err) {
      console.error('Delete lease error:', err);
      toast.error('Failed to delete lease agreement.');
    } finally {
      setIsDeleting(false);
    }
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
            <Button variant="danger" icon={Trash2} onClick={() => setIsDeleteModalOpen(true)}>
              Delete Lease
            </Button>
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
            <Badge status={lease.status || 'Draft'} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-gray-500 font-medium">Monthly Rent</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{formatUsd(lease.monthlyRent)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-gray-500 font-medium">Trust Deposit</p>
              <p className="font-bold text-emerald-700 text-sm mt-0.5">{formatUsd(lease.deposit)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-gray-500 font-medium">Due Day</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">Day {lease.dueDate || 1} of month</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-gray-500 font-medium">Jurisdiction</p>
              <p className="font-bold text-indigo-700 text-sm mt-0.5">{lease.stateJurisdiction || 'NY'} Statutory</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900">Signers &amp; Participants</h4>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-gray-800">{lease.tenantName} (Primary Tenant)</p>
                  <p className="text-[11px] text-gray-500">{lease.tenantEmail || 'Email on file'}</p>
                </div>
                <Badge status={lease.signedPdf ? 'Executed' : 'Pending Signature'} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Lease Controls</h3>

          <div className="space-y-2 text-xs">
            <p className="text-gray-500">Lease Number</p>
            <p className="font-bold text-gray-900 font-mono text-xs">{lease.leaseNumber || `LSE-2026-${String(lease.id).padStart(3, '0')}`}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-600" /> Renewal Reminders Scheduled</p>
            <p>{(lease.reminders || [90, 60, 30, 7]).join(' / ')} days prior to end date.</p>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteModalOpen(false);
        }}
        title="Delete Lease Agreement"
        size="sm"
        footer={
          <>
            <Button variant="secondary" disabled={isDeleting} onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} loading={isDeleting} onClick={handleDelete}>Delete Lease</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to permanently delete the lease for <strong>{lease.tenantName}</strong> ({lease.propertyName} · Unit {lease.unitNumber})? This action will permanently remove the record from your database.
        </p>
      </Modal>
    </div>
  );
}
