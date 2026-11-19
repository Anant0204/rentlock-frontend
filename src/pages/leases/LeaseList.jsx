import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, Clock, Archive, Eye } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import apiClient from '../../services/apiClient';
import { getLeases } from '../../data/mockLeases';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function LeaseList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [leases, setLeases] = useState(() => getLeases());

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

  const filteredData = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return leases.filter((l) => {
      const matchTab =
        (activeTab === 'all' && !l.archived && l.status !== 'Archived') ||
        (activeTab === 'active' && l.status === 'Active') ||
        (activeTab === 'expiring' && l.status === 'Expiring Soon') ||
        (activeTab === 'draft' && (l.status === 'Draft' || l.status === 'Pending Signature')) ||
        (activeTab === 'archived' && (l.archived || l.status === 'Archived'));

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
    const archived = leases.filter((l) => l.archived || l.status === 'Archived').length;
    const depositsHeld = leases.filter((l) => !l.archived).reduce((s, l) => s + (Number(l.deposit) || 0), 0);
    return { active, expiring, archived, depositsHeld };
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
      render: (_, row) => <Badge status={row.archived ? 'Archived' : row.status} />,
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
        <StatCard title="Archived Leases" value={stats.archived} subtitle="Retained for audit trail" icon={Archive} color="purple" />
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: `All Current (${leases.filter((l) => !l.archived).length})` },
              { id: 'active', label: `Active (${stats.active})` },
              { id: 'expiring', label: `Expiring (${stats.expiring})` },
              { id: 'draft', label: `Drafts / E-Sign (${leases.filter((l) => l.status === 'Draft' || l.status === 'Pending Signature').length})` },
              { id: 'archived', label: `Archived (${stats.archived})` },
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/leases/${row.id}`);
              }}
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
              title="View Lease Record"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        />
      </Card>
    </div>
  );
}
