import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ShieldCheck, AlertCircle, Building2, Eye, MessageSquare } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import apiClient from '../../services/apiClient';
import { getTenants } from '../../data/mockTenants';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function TenantList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [allTenants, setAllTenants] = useState(() => getTenants());

  useEffect(() => {
    apiClient.get('/tenants?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setAllTenants(items);
        localStorage.setItem('custom_tenants', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const filteredData = useMemo(() => {
    return allTenants.filter((t) => {
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'active' && t.status === 'Active') ||
        (activeTab === 'pastdue' && Number(t.dueAmount) > 0) ||
        (activeTab === 'archived' && (t.status === 'Archived' || t.status === 'Exited'));

      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (t.name || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.mobile || '').toLowerCase().includes(q) ||
        (t.propertyName || '').toLowerCase().includes(q) ||
        (t.unitNumber || '').toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [allTenants, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const active = allTenants.filter((t) => t.status === 'Active').length;
    const totalDue = allTenants.reduce((sum, t) => sum + (Number(t.dueAmount) || 0), 0);
    const smsEnabled = allTenants.filter((t) => t.smsOptIn).length;
    return { total: allTenants.length, active, totalDue, smsEnabled };
  }, [allTenants]);

  const columns = [
    {
      key: 'name',
      label: 'Resident / Contact',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {(row.name || 'Tenant').split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="font-bold text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
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
      key: 'mobile',
      label: 'U.S. Phone & Consent',
      render: (_, row) => (
        <div>
          <p className="text-xs font-medium text-gray-800">{row.mobile}</p>
          <p className="text-[11px] text-gray-500">
            {row.smsOptIn ? 'SMS Opt-In Active' : 'Portal / Email Only'}
          </p>
        </div>
      ),
    },
    {
      key: 'rent',
      label: 'Monthly Rent',
      render: (_, row) => <span className="font-bold text-gray-900">{formatUsd(row.rent)}</span>,
    },
    {
      key: 'dueAmount',
      label: 'Balance Due',
      render: (_, row) => (
        <span className={`font-bold ${Number(row.dueAmount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {Number(row.dueAmount) > 0 ? formatUsd(row.dueAmount) : 'Current'}
        </span>
      ),
    },
    {
      key: 'leaseEnd',
      label: 'Lease Ends',
      render: (_, row) => <span className="text-xs text-gray-600">{formatDate(row.leaseEnd)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => <Badge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Tenants & Residents"
        subtitle="Manage U.S. residential and commercial tenants, consent-verified screening status, and household profiles."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Tenants' }]}
        actions={
          <Button icon={Plus} onClick={() => navigate('/tenants/add')}>
            Add Tenant
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Residents" value={stats.total} subtitle="Across active & past records" icon={Users} color="blue" />
        <StatCard title="Active Households" value={stats.active} subtitle="Current leased occupants" icon={Building2} color="green" />
        <StatCard title="Balance Due" value={formatUsd(stats.totalDue)} subtitle="Open receivable total" icon={AlertCircle} color="amber" />
        <StatCard title="SMS Opt-In" value={`${stats.smsEnabled}/${stats.total}`} subtitle="Consent-verified messaging" icon={MessageSquare} color="purple" />
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: `All (${allTenants.length})` },
              { id: 'active', label: `Active (${allTenants.filter((t) => t.status === 'Active').length})` },
              { id: 'pastdue', label: `Balance Due (${allTenants.filter((t) => Number(t.dueAmount) > 0).length})` },
              { id: 'archived', label: `Archived / Exited (${allTenants.filter((t) => t.status === 'Archived' || t.status === 'Exited').length})` },
            ]}
            activeTab={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setPage(1);
            }}
          />
          <input
            type="text"
            placeholder="Search name, email, unit, or phone..."
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
          onRowClick={(row) => navigate(`/tenants/${row.id}`)}
          actions={(row) => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tenants/${row.id}`);
              }}
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
              title="Open Tenant Profile"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        />

        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-2 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Tenant records retain billing history safely via Archive status rather than hard deletion.</span>
        </div>
      </Card>
    </div>
  );
}
