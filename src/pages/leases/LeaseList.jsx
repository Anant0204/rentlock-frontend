import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, Clock, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import apiClient from '../../services/apiClient';
import { getLeases, deleteLease } from '../../data/mockLeases';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function LeaseList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [leases, setLeases] = useState(() => getLeases());

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const refreshLeases = () => {
      const local = getLeases();
      if (Array.isArray(local) && local.length > 0) {
        setLeases(local);
      }
      apiClient
        .get('/leases?limit=100')
        .then((res) => {
          const items = res?.items || res;
          if (Array.isArray(items) && items.length > 0) {
            const localItems = getLeases();
            const combined = [...items];
            localItems.forEach((l) => {
              if (
                !combined.some(
                  (item) =>
                    String(item.id) === String(l.id) ||
                    (item.leaseNumber && item.leaseNumber === l.leaseNumber)
                )
              ) {
                combined.push(l);
              }
            });
            setLeases(combined);
            localStorage.setItem('custom_leases', JSON.stringify(combined));
          }
        })
        .catch(() => {});
    };

    refreshLeases();

    const handleSync = () => {
      refreshLeases();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('rentlock_leases_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('rentlock_leases_changed', handleSync);
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!leaseToDelete) return;
    setIsDeleting(true);
    try {
      if (leaseToDelete.id && !isNaN(Number(leaseToDelete.id))) {
        await apiClient.delete(`/leases/${leaseToDelete.id}`).catch((err) => {
          console.warn('[LeaseList] Delete API error:', err.message);
        });
      }
      deleteLease(leaseToDelete.id);
      setLeases((prev) => prev.filter((l) => String(l.id) !== String(leaseToDelete.id)));
      toast.success(`Lease for ${leaseToDelete.tenantName || 'Resident'} deleted successfully.`);
      setIsDeleteModalOpen(false);
      setLeaseToDelete(null);
    } catch (err) {
      console.error('Delete lease error:', err);
      toast.error('Failed to delete lease.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return leases.filter((l) => {
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'active' && l.status === 'Active') ||
        (activeTab === 'expiring' && l.status === 'Expiring Soon') ||
        (activeTab === 'draft' && (l.status === 'Draft' || l.status === 'Pending Signature'));

      const matchSearch =
        !q ||
        (l.tenantName || '').toLowerCase().includes(q) ||
        (l.propertyName || '').toLowerCase().includes(q) ||
        (l.unitNumber || '').toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [leases, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const active = leases.filter((l) => l.status === 'Active').length;
    const expiring = leases.filter((l) => l.status === 'Expiring Soon').length;
    const drafts = leases.filter((l) => l.status === 'Draft' || l.status === 'Pending Signature').length;
    const depositsHeld = leases.reduce((s, l) => s + (Number(l.deposit) || 0), 0);
    return { active, expiring, drafts, depositsHeld };
  }, [leases]);

  const columns = [
    {
      key: 'tenantName',
      label: 'Resident / Signer',
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-900">{row.tenantName}</p>
          <p className="text-xs text-gray-500">
            {row.leaseType || 'Fixed-Term'} · {row.stateJurisdiction || 'NY'}
          </p>
        </div>
      ),
    },
    {
      key: 'propertyName',
      label: 'Property & Unit',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-gray-800">{row.propertyName}</p>
          <p className="text-xs text-indigo-600 font-bold">Unit {row.unitNumber}</p>
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'Term Window',
      render: (_, row) => (
        <span className="text-xs text-gray-700">
          {formatDate(row.startDate)} – {row.endDate ? formatDate(row.endDate) : 'Month-to-Month'}
        </span>
      ),
    },
    {
      key: 'monthlyRent',
      label: 'Monthly Rent',
      render: (_, row) => <span className="font-bold text-gray-900">{formatUsd(row.monthlyRent)}</span>,
    },
    {
      key: 'deposit',
      label: 'Trust Deposit',
      render: (_, row) => <span className="font-semibold text-emerald-700">{formatUsd(row.deposit)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => <Badge status={row.status || 'Draft'} />,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Leases & Contracts"
        subtitle="Manage executed U.S. residential and commercial leases, renewal windows, e-sign drafts, and trust deposits."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Leases' }]}
        actions={
          <Button icon={Plus} onClick={() => navigate('/leases/create')}>
            Create Lease
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Active Leases" value={stats.active} subtitle="Current occupied agreements" icon={CheckCircle2} color="green" />
        <StatCard title="Expiring Within 60d" value={stats.expiring} subtitle="Renewal outreach flagged" icon={Clock} color="amber" />
        <StatCard title="Trust Deposits Linked" value={formatUsd(stats.depositsHeld)} subtitle="Held separately from revenue" icon={FileText} color="blue" />
        <StatCard title="Drafts & Pending" value={stats.drafts} subtitle="Awaiting execution / e-sign" icon={FileText} color="purple" />
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: `All Current (${leases.length})` },
              { id: 'active', label: `Active (${stats.active})` },
              { id: 'expiring', label: `Expiring (${stats.expiring})` },
              { id: 'draft', label: `Drafts / E-Sign (${stats.drafts})` },
            ]}
            activeTab={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setPage(1);
            }}
          />
          <input
            type="text"
            placeholder="Search tenant, property, unit..."
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
          data={filteredData}
          page={page}
          totalPages={Math.max(1, Math.ceil(filteredData.length / 8))}
          totalItems={filteredData.length}
          pageSize={8}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/leases/${row.id}`)}
          actions={(row) => (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => navigate(`/leases/${row.id}`)}
                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                title="View Lease Record"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeaseToDelete(row);
                  setIsDeleteModalOpen(true);
                }}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                title="Delete Lease"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setLeaseToDelete(null);
          }
        }}
        title="Delete Lease Agreement"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setLeaseToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={isDeleting}
              onClick={handleConfirmDelete}
            >
              Delete Lease
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to permanently delete the lease for{' '}
          <strong>{leaseToDelete?.tenantName || 'this resident'}</strong> (
          {leaseToDelete?.propertyName} · Unit {leaseToDelete?.unitNumber})? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
