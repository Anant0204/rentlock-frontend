import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Search, Plus, Lock, Eye, MessageSquare, FileText, Wrench, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import { useAuth } from '../../context/AuthContext';
import { getUserEffectivePermissions } from '../../data/adminPortalStore';
import { formatUsd } from '../../utils/formatters';
import {
  getManagerWorkspaceState,
  addManagerTenant,
  addTenantPrivateNote,
} from '../../data/managerWorkspaceData';

export default function ManagerTenants() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [leaseFilter, setLeaseFilter] = useState('Active');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    apiClient.get('/tenants?limit=100').then((res) => {
      const liveTenants = res?.items || res;
      if (Array.isArray(liveTenants) && liveTenants.length > 0) {
        setState((prev) => ({
          ...prev,
          tenants: liveTenants.map((t) => ({
            id: String(t.id),
            name: t.name,
            email: t.email,
            phone: t.mobile || t.phone,
            propertyId: String(t.propertyId || 'sunrise-residency'),
            propertyName: t.propertyName || 'Sunrise Residency',
            unit: t.unitNumber || 'A-204',
            leaseStatus: t.status || 'Active',
            leaseTerm: `${t.moveInDate ? t.moveInDate.slice(0, 10) : '2025-01-01'} - ${t.leaseEnd ? t.leaseEnd.slice(0, 10) : '2026-12-31'}`,
            monthlyRent: Number(t.monthlyRent || t.rent || 1950),
            balanceDue: Number(t.dueAmount || 0),
            privateNotes: t.privateNotes || '',
          })),
        }));
      }
    }).catch(() => {});
  }, []);

  // Effective Granular Permissions from Admin RBAC Store
  const effectivePerms = useMemo(() => {
    return getUserEffectivePermissions(user || 'sarah.jenkins@rentlock.com');
  }, [user]);

  const canAddTenants = effectivePerms.canAddTenants;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    propertyId: state.properties[0]?.id || '',
    unit: '',
    leaseTerm: '12/01/26 - 11/30/27',
    monthlyRent: '2000',
  });

  const activeHouseholdsCount = useMemo(
    () => state.properties.reduce((s, p) => s + p.occupiedUnits, 0),
    [state.properties]
  );

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.tenants.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.unit.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q);
      const matchesProp = !propertyFilter || t.propertyId === propertyFilter;
      const matchesLease = !leaseFilter || t.leaseStatus === leaseFilter;
      return matchesSearch && matchesProp && matchesLease;
    });
  }, [state.tenants, search, propertyFilter, leaseFilter]);

  const selectedTenant = useMemo(
    () => state.tenants.find((t) => t.id === selectedTenantId) || null,
    [state.tenants, selectedTenantId]
  );

  const tenantMessages = useMemo(() => {
    if (!selectedTenant) return [];
    return state.threads.filter(
      (th) =>
        th.contactName.toLowerCase() === selectedTenant.name.toLowerCase() ||
        th.fullPropertyUnit.includes(selectedTenant.unit)
    );
  }, [state.threads, selectedTenant]);

  const tenantWorkOrders = useMemo(() => {
    if (!selectedTenant) return [];
    return state.workOrders.filter(
      (wo) =>
        wo.propertyId === selectedTenant.propertyId &&
        wo.unit.toLowerCase() === selectedTenant.unit.toLowerCase()
    );
  }, [state.workOrders, selectedTenant]);

  const handleAddTenant = (e) => {
    e.preventDefault();
    if (!canAddTenants) {
      toast.error('Action Restricted: Your manager account does not have permission to enroll tenants per Admin RBAC policy.');
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.unit.trim()) {
      toast.error('Name, email, and unit are required.');
      return;
    }
    const updated = addManagerTenant({
      ...form,
      password: form.password?.trim() || 'demo123',
    });
    setState(updated);
    setIsAddOpen(false);
    setForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      propertyId: state.properties[0]?.id || '',
      unit: '',
      leaseTerm: '12/01/26 - 11/30/27',
      monthlyRent: '2000',
    });
    toast.success('Resident added with login credentials (time-stamped)');
  };

  const handleAddPrivateNote = (e) => {
    e.preventDefault();
    if (!selectedTenant || !noteInput.trim()) return;
    const updated = addTenantPrivateNote(selectedTenant.id, noteInput);
    setState(updated);
    setNoteInput('');
    toast.success('Internal staff note saved (time-stamped)');
  };

  return (
    <div className="space-y-5 pb-6">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / ASSIGNED PROPERTIES"
        properties={state.properties}
        selectedPropertyId={propertyFilter}
        onSelectProperty={setPropertyFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Tenant directory &amp; household records</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* RBAC Governance Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-gray-700">RBAC Governance:</span>
            <Badge variant={canAddTenants ? 'success' : 'warning'}>
              {canAddTenants ? 'Enrollment Allowed' : 'View-Only Mode'}
            </Badge>
          </div>

          {canAddTenants ? (
            <Button variant="primary" icon={Plus} onClick={() => setIsAddOpen(true)}>
              Add tenant
            </Button>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 text-xs font-semibold cursor-not-allowed select-none"
              title="Tenant enrollment disabled by Robert King (Admin) under Settings > 4-Account Access & RBAC"
            >
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Add Resident (Locked by RBAC)</span>
            </div>
          )}
        </div>
      </div>

      {!canAddTenants && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">Admin RBAC Restriction: Tenant Enrollment Disabled</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Your manager account ({user?.name || 'Sarah Jenkins'}) has been assigned <strong>View-Only</strong> rights for resident records. To enable adding tenants, update this permission in <strong>Platform Settings &gt; 4-Account Access &amp; RBAC</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-xs font-bold text-indigo-700 underline hover:text-indigo-900 shrink-0 cursor-pointer"
          >
            Manage in Admin RBAC &rarr;
          </button>
        </div>
      )}

      <Card padding="p-6" className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Tenants in your assigned properties</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Search a resident, open their profile, or contact them about a lease or work order
          </p>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, unit, email, or phone"
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100 outline-none cursor-pointer"
            >
              <option value="">All properties</option>
              {state.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={leaseFilter}
              onChange={(e) => setLeaseFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 outline-none cursor-pointer"
            >
              <option value="Active">Active leases</option>
              <option value="">All leases</option>
            </select>
          </div>

          <span className="text-xs font-semibold text-gray-500">
            {activeHouseholdsCount} active households
          </span>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">TENANT / CONTACT</th>
                <th className="py-3 px-4">PROPERTY / UNIT</th>
                <th className="py-3 px-4">LEASE TERM</th>
                <th className="py-3 px-4">RENT STATUS</th>
                <th className="py-3 px-4">LAST ACTIVITY</th>
                <th className="py-3 px-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-gray-400">
                    No matching tenants in your assigned properties.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.email}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-800">{tenant.propertyName}</p>
                      <p className="text-xs text-gray-500">{tenant.unit}</p>
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-gray-600">
                      {tenant.leaseTerm}
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={
                          tenant.rentStatus.startsWith('Past due')
                            ? 'danger'
                            : tenant.balance > 0
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {tenant.rentStatus}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600">{tenant.lastActivity}</td>
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedTenantId(tenant.id)}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Open profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Privacy Rule Callout */}
        <div className="rounded-xl bg-emerald-50 border border-emerald-200/70 px-4 py-3">
          <p className="text-xs font-bold text-emerald-700">Privacy rule</p>
          <p className="text-xs text-emerald-900 mt-0.5">
            Tenant profiles are limited to assigned properties. Keep private notes internal; tenant-visible messages and attachments are clearly labeled.
          </p>
        </div>
      </Card>

      <Card gradient padding="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          TENANT PROFILE
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Contact details, household members, lease dates, ledger status, documents, messages, and maintenance history live in one resident record.
        </p>
      </Card>

      {/* Resident Profile Drawer */}
      <Drawer
        isOpen={!!selectedTenant}
        onClose={() => setSelectedTenantId(null)}
        title={selectedTenant ? `${selectedTenant.name} · ${selectedTenant.unit}` : ''}
        width="w-full max-w-2xl"
      >
        {selectedTenant && (
          <div className="space-y-6">
            {/* Contact & Lease Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Contact details
                </p>
                <p className="font-bold text-gray-900 mt-1">{selectedTenant.name}</p>
                <p className="text-xs text-gray-600">{selectedTenant.email}</p>
                <p className="text-xs text-gray-600">{selectedTenant.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Property & Lease
                </p>
                <p className="font-bold text-gray-900 mt-1">
                  {selectedTenant.propertyName} · {selectedTenant.unit}
                </p>
                <p className="text-xs text-gray-600">Term: {selectedTenant.leaseTerm}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Household ({selectedTenant.householdMembers.length}):{' '}
                  {selectedTenant.householdMembers.join(', ')}
                </p>
              </div>
            </div>

            {/* Ledger Status */}
            <div className="p-4 rounded-2xl border border-gray-100 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Ledger status (USD)
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] text-gray-500">Monthly rent</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {formatUsd(selectedTenant.monthlyRent, 2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] text-gray-500">Paid</p>
                  <p className="font-bold text-emerald-600 mt-0.5">
                    {formatUsd(selectedTenant.paidAmount, 2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] text-gray-500">Balance</p>
                  <p className={`font-bold mt-0.5 ${selectedTenant.balance > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {formatUsd(selectedTenant.balance, 2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Private Notes (Staff-only) */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  INTERNAL STAFF NOTES (Not visible to tenant)
                </p>
              </div>
              <form onSubmit={handleAddPrivateNote} className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add internal note (time-stamped)..."
                  className="flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400"
                />
                <Button type="submit" size="xs" variant="warning">
                  Save note
                </Button>
              </form>
              <div className="space-y-2">
                {(selectedTenant.privateNotes || []).length === 0 ? (
                  <p className="text-xs text-amber-700/70">No internal notes recorded.</p>
                ) : (
                  selectedTenant.privateNotes.map((n) => (
                    <div key={n.id} className="bg-white/80 rounded-xl px-3 py-2 text-xs border border-amber-100">
                      <p className="text-gray-800">{n.text}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {n.author} · {n.createdAt}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tenant-Visible Messages & Attachments */}
            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  TENANT-VISIBLE MESSAGES & DOCUMENTS
                </p>
                <Button
                  size="xs"
                  variant="primary"
                  icon={MessageSquare}
                  onClick={() => navigate('/manager/messages')}
                >
                  Message tenant
                </Button>
              </div>
              <div className="space-y-2">
                {(selectedTenant.documents || []).map((doc) => (
                  <div key={doc} className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-xl border border-indigo-100">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-medium text-gray-700">{doc}</span>
                    <Badge variant="primary" className="ml-auto text-[10px]">
                      Tenant-visible
                    </Badge>
                  </div>
                ))}
                {tenantMessages.map((th) => (
                  <div key={th.id} className="text-xs bg-white px-3 py-2 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <span className="font-medium text-gray-700">{th.preview}</span>
                    <span className="text-[10px] text-gray-400">{th.timeAgo}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance History */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Maintenance history
              </p>
              {tenantWorkOrders.length === 0 ? (
                <p className="text-xs text-gray-400">No work orders for this unit.</p>
              ) : (
                tenantWorkOrders.map((wo) => (
                  <div
                    key={wo.id}
                    onClick={() => navigate(`/manager/work-orders?wo=${wo.id}`)}
                    className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-800">{wo.id} · {wo.title}</p>
                      <p className="text-gray-500">{wo.openedAt}</p>
                    </div>
                    <Badge variant={wo.status === 'Closed' ? 'success' : 'warning'}>{wo.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Tenant Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add tenant to assigned property"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Save} onClick={handleAddTenant}>
              Save tenant
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddTenant} className="space-y-4">
          <Select
            label="Assigned property"
            options={state.properties.map((p) => ({ value: p.id, label: p.name }))}
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full name"
              required
              placeholder="e.g. Jordan Hayes"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Phone"
              placeholder="555-010-2200"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              required
              type="email"
              placeholder="jordan@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Tenant Login Password"
              required
              type="password"
              placeholder="Set password (e.g. demo123)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              helperText="Resident uses this password to log into Tenant Portal."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Unit"
              required
              placeholder="e.g. A-202"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <Input
              label="Monthly rent ($)"
              type="number"
              value={form.monthlyRent}
              onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
            />
          </div>
          <Input
            label="Lease term"
            value={form.leaseTerm}
            onChange={(e) => setForm({ ...form, leaseTerm: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}

