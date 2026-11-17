import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, UserCheck, Plus, Search, Eye, Edit2, Archive,
  RotateCcw, Download, Landmark, CheckCircle2,
  AlertTriangle, KeyRound, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Avatar from '../../components/ui/Avatar';
import apiClient from '../../services/apiClient';
import { getOwners, addOwner, updateOwner, archiveOwner } from '../../data/mockExtra';
import { getProperties } from '../../data/mockProperties';
import { formatUsd } from '../../utils/formatters';

const OWNER_TYPES = ['All Types', 'Individual', 'LLC', 'Trust', 'Corporation'];
const OWNER_STATUSES = ['All Statuses', 'Active', 'Pending Setup', 'Archived'];

function createOwnerTempId() {
  return Date.now();
}

export default function OwnerList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [owners, setOwners] = useState(() => getOwners());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  useEffect(() => {
    apiClient.get('/owners').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setOwners(items);
        localStorage.setItem('custom_owners', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => searchParams.get('add') === 'true');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [targetOwner, setTargetOwner] = useState(null);

  const allProperties = useMemo(() => getProperties(), []);

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    ownerType: 'Individual',
    email: '',
    password: '',
    phone: '',
    mailingAddress: '',
    status: 'Active',
    assignedProperty: 'Sunrise Residency',
    sharePercentage: 100,
  });

  const refreshOwners = () => {
    setOwners(getOwners());
  };

  const filteredOwners = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (owners || []).filter(Boolean).filter((o) => {
      const oType = o.ownerType || 'Individual';
      const oStatus = o.status || 'Active';
      if (typeFilter !== 'All Types' && oType !== typeFilter) return false;
      if (statusFilter !== 'All Statuses') {
        if (statusFilter === 'Archived' && !o.archived) return false;
        if (statusFilter !== 'Archived' && (o.archived || oStatus !== statusFilter)) return false;
      }
      if (q) {
        const matchesName = (o.name || '').toLowerCase().includes(q);
        const matchesEmail = (o.email || '').toLowerCase().includes(q);
        const matchesPhone = (o.phone || '').toLowerCase().includes(q);
        const matchesProps = Array.isArray(o.properties) && o.properties.some((p) => {
          const pName = typeof p === 'object' && p !== null ? p.name : String(p);
          return pName.toLowerCase().includes(q);
        });
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesProps) return false;
      }
      return true;
    });
  }, [owners, searchTerm, typeFilter, statusFilter]);

  // Aggregate stats
  const safeOwners = (owners || []).filter(Boolean);
  const activeOwners = safeOwners.filter((o) => !o.archived);
  const totalUnitsCovered = activeOwners.reduce((s, o) => s + (Number(o.totalUnits) || 0), 0);
  const totalDistributionsYtd = activeOwners.reduce((s, o) => s + (Number(o.distributionsYtd) || 0), 0);
  const activeLoginsCount = activeOwners.filter((o) => o.status === 'Active').length;

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      ownerType: 'Individual',
      email: '',
      password: '',
      phone: '+1 (212) 555-0100',
      mailingAddress: '123 Main St, New York, NY 10001',
      status: 'Active',
      assignedProperty: allProperties[0]?.name || 'General Portfolio',
      sharePercentage: 100,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (owner) => {
    setTargetOwner(owner);
    setFormData({
      name: owner.name || '',
      ownerType: owner.ownerType || 'Individual',
      email: owner.email || '',
      password: owner.password || '',
      phone: owner.phone || '',
      mailingAddress: owner.mailingAddress || '',
      status: owner.status || 'Active',
      assignedProperty: owner.properties?.[0] || allProperties[0]?.name || 'General Portfolio',
      sharePercentage: owner.sharePercentage || 100,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      return toast.error('Legal Owner Name and Email are required.');
    }
    if (!formData.password || formData.password.trim().length < 4) {
      return toast.error('Please create a login password for this owner (minimum 4 characters).');
    }

    const assignedProp = allProperties.find((p) => p.name === formData.assignedProperty) || allProperties[0];
    const newOwnerObj = {
      id: createOwnerTempId(),
      name: formData.name.trim(),
      ownerType: formData.ownerType,
      email: formData.email.trim(),
      password: formData.password.trim(),
      phone: (formData.phone || '').trim(),
      mailingAddress: (formData.mailingAddress || '').trim(),
      status: formData.status,
      archived: false,
      properties: [formData.assignedProperty],
      allocations: [
        {
          propertyName: formData.assignedProperty,
          units: assignedProp?.totalUnits || 24,
          share: Number(formData.sharePercentage) || 100,
          ytdIncomeShare: 0,
          ytdExpenseShare: 0,
        },
      ],
      totalUnits: assignedProp?.totalUnits || 24,
      sharePercentage: Number(formData.sharePercentage) || 100,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      distributionsYtd: 0,
    };

    addOwner(newOwnerObj);
    refreshOwners();
    setIsAddModalOpen(false);
    toast.success(`Owner ${newOwnerObj.name} created successfully with portal login.`);
  };

  const handleSaveEdit = () => {
    if (!targetOwner) return;
    if (!formData.name.trim() || !formData.email.trim()) {
      return toast.error('Legal Owner Name and Email are required.');
    }

    updateOwner(targetOwner.id, {
      name: formData.name.trim(),
      ownerType: formData.ownerType,
      email: formData.email.trim(),
      password: formData.password ? formData.password.trim() : (targetOwner.password || 'demo123'),
      phone: (formData.phone || '').trim(),
      mailingAddress: (formData.mailingAddress || '').trim(),
      status: formData.status,
      sharePercentage: Number(formData.sharePercentage) || targetOwner.sharePercentage || 100,
    });

    refreshOwners();
    setIsEditModalOpen(false);
    toast.success(`Owner ${formData.name} updated.`);
  };

  const handleArchiveToggle = () => {
    if (!targetOwner) return;
    const nextArchived = !targetOwner.archived;
    archiveOwner(targetOwner.id, nextArchived);
    refreshOwners();
    setIsArchiveModalOpen(false);
    toast.success(nextArchived ? `Owner ${targetOwner.name} archived.` : `Owner ${targetOwner.name} restored.`);
  };

  const handleExportCsv = () => {
    const headers = 'ID,Legal Name,Owner Type,Email,Phone,U.S. Address,Status,Distributions YTD,Properties Owned\n';
    const rows = filteredOwners
      .map(
        (o) =>
          `"${o.id}","${o.name}","${o.ownerType || 'Individual'}","${o.email}","${o.phone}","${o.mailingAddress?.replace(/"/g, '""')}","${o.status}",${o.distributionsYtd || 0},"${(o.properties || []).join(', ')}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RentLock-Owners-Directory.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Owner directory exported as CSV.');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Owner Directory & Holding Entities"
        subtitle="Manage real estate property owners, equity allocations, and portal login credentials."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Owners' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExportCsv}>
              Export Directory
            </Button>
            <Button icon={Plus} onClick={handleOpenAdd}>
              Add Owner / Entity
            </Button>
          </div>
        }
      />

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL OWNERS"
          value={String(activeOwners.length)}
          subtitle={`${owners.filter((o) => o.ownerType === 'LLC').length} LLCs · ${owners.filter((o) => o.ownerType === 'Individual').length} Individuals`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="LINKED UNITS"
          value={String(totalUnitsCovered)}
          subtitle="Portfolio units with active owner equity"
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="DISTRIBUTIONS YTD"
          value={formatUsd(totalDistributionsYtd)}
          subtitle="Settled payouts across all holding entities"
          icon={Landmark}
          color="green"
        />
        <StatCard
          title="PORTAL ACCESS"
          value={`${activeLoginsCount} / ${activeOwners.length}`}
          subtitle="Owners with active login credentials"
          icon={KeyRound}
          color="green"
        />
      </div>

      {/* Filter & Search Bar */}
      <Card padding="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by owner name, entity, email, phone, or property..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 cursor-pointer focus:outline-none"
            >
              {OWNER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 cursor-pointer focus:outline-none"
            >
              {OWNER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Owners Table */}
      <Card padding="p-0">
        <CardHeader
          title={`All Registered Property Owners (${filteredOwners.length})`}
          subtitle="Click on any owner to view full portfolio shares, tax records, and distribution history."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                <th className="py-3 px-4">Owner / Entity</th>
                <th className="py-3 px-3">Contact &amp; Address</th>
                <th className="py-3 px-3">Properties &amp; Units</th>
                <th className="py-3 px-3">Distributions YTD</th>
                <th className="py-3 px-3">Portal Login Access</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOwners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 text-sm">
                    No property owners matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredOwners.map((owner) => (
                  <tr
                    key={owner.id}
                    onClick={() => navigate(`/owners/${owner.id}`)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={owner.name} size="md" />
                        <div>
                          <p className="font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                            {owner.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 font-semibold text-gray-600">
                              {owner.ownerType || 'Individual'}
                            </span>
                            <span className="text-xs text-gray-400">ID #{owner.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <p className="font-medium text-gray-800 text-xs">{owner.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{owner.phone}</p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[200px] mt-0.5">
                        {owner.mailingAddress}
                      </p>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(owner.properties || []).map((prop, pIdx) => {
                          const propTitle = typeof prop === 'object' && prop !== null ? prop.name : String(prop);
                          return (
                            <span
                              key={pIdx}
                              className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg"
                            >
                              {propTitle}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {owner.totalUnits || 0} total units · {owner.sharePercentage || 100}% equity
                      </p>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <p className="font-bold text-emerald-700 text-sm">
                        {formatUsd(owner.distributionsYtd || 0)}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Net: {formatUsd(owner.netIncome || 0)}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <KeyRound className="w-3 h-3 text-emerald-600" />
                          Enabled
                        </span>
                      </div>
                      <p className="text-xs font-mono text-gray-500 mt-1">
                        Pass: {owner.password ? '••••••••' : 'demo123'}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Badge
                        status={
                          owner.archived
                            ? 'Inactive'
                            : owner.status === 'Active'
                            ? 'Active'
                            : 'Pending'
                        }
                      >
                        {owner.archived ? 'Archived' : owner.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Eye}
                          onClick={() => navigate(`/owners/${owner.id}`)}
                          title="View Details"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit2}
                          onClick={() => handleOpenEdit(owner)}
                          title="Edit Owner"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={owner.archived ? RotateCcw : Archive}
                          onClick={() => {
                            setTargetOwner(owner);
                            setIsArchiveModalOpen(true);
                          }}
                          title={owner.archived ? 'Restore' : 'Archive'}
                          className={owner.archived ? 'text-emerald-600' : 'text-gray-400 hover:text-red-500'}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Non-destructive policy banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950">
        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Non-Destructive Owner Accounting Safeguard</p>
          <p className="text-blue-900 mt-0.5">
            Owners and entities cannot be deleted if historical distribution statements, tax filings, or property shares exist. Use <strong>Archive</strong> to retire an entity while preserving all historical IRS 1099 and ownership audit trails.
          </p>
        </div>
      </div>

      {/* ADD OWNER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Property Owner / Holding Entity"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleSaveAdd}>
              Create Owner Profile
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 leading-relaxed">
            <strong>PORTAL LOGIN SETUP:</strong> Create the owner profile and set their login password. The owner can sign in to the Owner Portal using their email address and this password.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Legal Owner / Entity Name *"
              placeholder="e.g. Bennett Realty Holdings LLC or Rocky"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Select
              label="Owner Entity Type"
              options={['Individual', 'LLC', 'Trust', 'Corporation']}
              value={formData.ownerType}
              onChange={(e) => setFormData({ ...formData, ownerType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Primary Contact Email (Login ID) *"
              type="email"
              placeholder="e.g. owner@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="U.S. Phone Number"
              placeholder="+1 (212) 555-0188"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="U.S. Registered Mailing Address"
            placeholder="e.g. 725 Fifth Ave, Apt 24B, New York, NY 10022"
            value={formData.mailingAddress}
            onChange={(e) => setFormData({ ...formData, mailingAddress: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-2">
              <Input
                label="Owner Login Password *"
                type="text"
                placeholder="Set password (e.g. demo123 or Pass@123)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Admin sets this password. Owner will sign in with their email and this password."
              />
            </div>
            <div>
              <Select
                label="Initial Status"
                options={['Active', 'Pending Setup']}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <Select
              label="Assign Primary Property"
              options={allProperties.length > 0 ? allProperties.map((p) => p.name).filter(Boolean) : ['General Portfolio']}
              value={formData.assignedProperty}
              onChange={(e) => setFormData({ ...formData, assignedProperty: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* EDIT OWNER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={targetOwner ? `Edit Owner Profile · ${targetOwner.name}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Legal Owner / Entity Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Select
              label="Owner Entity Type"
              options={['Individual', 'LLC', 'Trust', 'Corporation']}
              value={formData.ownerType}
              onChange={(e) => setFormData({ ...formData, ownerType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Primary Contact Email (Login ID) *"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="U.S. Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="U.S. Registered Mailing Address"
            value={formData.mailingAddress}
            onChange={(e) => setFormData({ ...formData, mailingAddress: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-2">
              <Input
                label="Owner Login Password"
                type="text"
                placeholder="Leave blank to keep existing, or type new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Admin can change or reset the password for this owner."
              />
            </div>
            <div>
              <Select
                label="Account Status"
                options={['Active', 'Pending Setup']}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ARCHIVE / RESTORE MODAL */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title={targetOwner?.archived ? `Restore Owner · ${targetOwner?.name}` : `Archive Owner · ${targetOwner?.name}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className={targetOwner?.archived ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
              onClick={handleArchiveToggle}
            >
              {targetOwner?.archived ? 'Confirm Restore' : 'Confirm Archive'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">
                {targetOwner?.archived ? 'Restore Owner Account?' : 'Archive Owner Record?'}
              </p>
              <p className="mt-1">
                {targetOwner?.archived
                  ? `Restoring ${targetOwner?.name} will re-activate their entity for new property allocations and owner disbursements.`
                  : `Archiving ${targetOwner?.name} prevents new allocations while permanently keeping all historical ownership distributions, receipts, and IRS records safe.`}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
