import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase, UserCheck, Plus, Search, Eye, Edit2, Archive,
  RotateCcw, Download, CheckCircle2, AlertTriangle, KeyRound,
  ShieldCheck, Building2, Wrench, DollarSign, Phone, Mail, Clock
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
import { getManagers, addManager, updateManager, archiveManager } from '../../data/mockExtra';
import { getProperties } from '../../data/mockProperties';
import { formatUsd } from '../../utils/formatters';

const STATUS_FILTERS = ['All Statuses', 'Active', 'On Leave', 'Archived'];
const SPENDING_CAP_OPTIONS = [500, 1000, 1500, 2500, 5000];

export default function ManagerList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [managers, setManagers] = useState(() => getManagers());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [propertyFilter, setPropertyFilter] = useState('All Properties');

  useEffect(() => {
    apiClient.get('/managers').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        const savedRaw = localStorage.getItem('custom_managers');
        let localManagers = [];
        try {
          localManagers = savedRaw ? JSON.parse(savedRaw) : [];
        } catch { }

        const merged = items.map((serverMgr) => {
          const localMgr = localManagers.find(
            (lm) =>
              (lm.id && serverMgr.id && String(lm.id) === String(serverMgr.id)) ||
              (lm.email && serverMgr.email && lm.email.toLowerCase() === serverMgr.email.toLowerCase())
          );
          const serverProps = Array.isArray(serverMgr.properties) ? serverMgr.properties : [];
          const localProps = Array.isArray(localMgr?.properties) ? localMgr.properties : [];
          const finalProps = serverProps.length > 0 ? serverProps : localProps;

          return {
            ...serverMgr,
            ...localMgr,
            id: serverMgr.id || localMgr?.id,
            name: serverMgr.name || localMgr?.name,
            email: serverMgr.email || localMgr?.email,
            password: localMgr?.password || '123456',
            properties: finalProps,
          };
        });

        setManagers(merged);
        localStorage.setItem('custom_managers', JSON.stringify(merged));
      }
    }).catch(() => { });
  }, []);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => searchParams.get('add') === 'true');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [targetManager, setTargetManager] = useState(null);

  const allProperties = useMemo(() => getProperties().filter((p) => !p.archived), []);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    spendingCap: 1000,
    employmentType: 'Full-Time',
    shift: 'Day (8 AM–5 PM)',
    status: 'Active',
    assignedProperties: ['Sunrise Residency'],
  });

  const refreshManagers = () => {
    setManagers(getManagers());
  };

  const filteredManagers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (managers || []).filter(Boolean).filter((m) => {
      if (statusFilter !== 'All Statuses') {
        if (statusFilter === 'Archived' && !m.archived) return false;
        if (statusFilter !== 'Archived' && (m.archived || m.status !== statusFilter)) return false;
      }
      if (propertyFilter !== 'All Properties') {
        const propNames = (m.properties || []).map((p) => (typeof p === 'object' && p !== null ? p.name : String(p)));
        if (!propNames.includes(propertyFilter)) return false;
      }
      if (q) {
        const matchesName = m.name?.toLowerCase().includes(q);
        const matchesEmail = m.email?.toLowerCase().includes(q);
        const matchesPhone = m.phone?.toLowerCase().includes(q);
        const matchesProps = Array.isArray(m.properties) && m.properties.some((p) => {
          const str = typeof p === 'object' && p !== null ? p.name : String(p);
          return str.toLowerCase().includes(q);
        });
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesProps) return false;
      }
      return true;
    });
  }, [managers, searchTerm, statusFilter, propertyFilter]);

  // Aggregate stats
  const safeManagers = (managers || []).filter(Boolean);
  const activeManagers = safeManagers.filter((m) => !m.archived);
  const totalAssignedProperties = activeManagers.reduce((s, m) => s + (m.properties?.length || 0), 0);
  const totalActiveWorkOrders = activeManagers.reduce((s, m) => s + (Number(m.activeWorkOrders) || 0), 0);
  const totalSpendingCaps = activeManagers.reduce((s, m) => s + (Number(m.spendingCap) || 0), 0);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      spendingCap: 1000,
      employmentType: 'Full-Time',
      shift: 'Day (8 AM–5 PM)',
      status: 'Active',
      assignedProperties: [allProperties[0]?.name || 'Sunrise Residency'],
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (mgr) => {
    setTargetManager(mgr);
    setFormData({
      name: mgr.name || '',
      email: mgr.email || '',
      password: mgr.password || '',
      phone: mgr.phone || '',
      spendingCap: mgr.spendingCap || 1000,
      employmentType: mgr.employmentType || 'Full-Time',
      shift: mgr.shift || 'Day (8 AM–5 PM)',
      status: mgr.status || 'Active',
      assignedProperties: mgr.properties || [],
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      return toast.error('Manager Name and Email are required.');
    }
    if (!formData.password || formData.password.trim().length < 4) {
      return toast.error('Please create a login password for this manager (minimum 4 characters).');
    }

    addManager({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
      phone: formData.phone.trim(),
      spendingCap: Number(formData.spendingCap) || 1000,
      employmentType: formData.employmentType,
      shift: formData.shift,
      status: formData.status,
      properties: formData.assignedProperties,
      activeWorkOrders: 0,
      attendance: 100,
      rating: 5.0,
    });

    try {
      const savedProps = localStorage.getItem('custom_properties');
      if (savedProps && formData.assignedProperties.length > 0) {
        const propList = JSON.parse(savedProps);
        const assignedSet = new Set(formData.assignedProperties.map((p) => String(p).trim().toLowerCase()));
        let changed = false;
        const updatedProps = propList.map((p) => {
          const pName = (p.name || '').trim().toLowerCase();
          if (assignedSet.has(pName)) {
            changed = true;
            return { ...p, manager: formData.name.trim() };
          }
          return p;
        });
        if (changed) {
          localStorage.setItem('custom_properties', JSON.stringify(updatedProps));
        }
      }
    } catch {
      // ignore
    }

    refreshManagers();
    setIsAddModalOpen(false);
    toast.success(`Manager ${formData.name} created! They can now log in with their email and password.`);
  };

  const handleSaveEdit = () => {
    if (!targetManager) return;
    if (!formData.name.trim() || !formData.email.trim()) {
      return toast.error('Manager Name and Email are required.');
    }

    updateManager(targetManager.id, {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password ? formData.password.trim() : (targetManager.password || 'demo123'),
      phone: formData.phone.trim(),
      spendingCap: Number(formData.spendingCap) || 1000,
      employmentType: formData.employmentType,
      shift: formData.shift,
      status: formData.status,
      properties: formData.assignedProperties,
    });

    try {
      const savedProps = localStorage.getItem('custom_properties');
      if (savedProps) {
        const propList = JSON.parse(savedProps);
        const assignedSet = new Set(formData.assignedProperties.map((p) => String(p).trim().toLowerCase()));
        let changed = false;
        const updatedProps = propList.map((p) => {
          const pName = (p.name || '').trim().toLowerCase();
          const pMgr = (p.manager || '').trim().toLowerCase();
          const oldMgr = (targetManager.name || '').trim().toLowerCase();
          if (assignedSet.has(pName)) {
            if (p.manager !== formData.name.trim()) {
              changed = true;
              return { ...p, manager: formData.name.trim() };
            }
          } else if (pMgr === oldMgr) {
            changed = true;
            return { ...p, manager: '' };
          }
          return p;
        });
        if (changed) {
          localStorage.setItem('custom_properties', JSON.stringify(updatedProps));
        }
      }
    } catch {
      // ignore
    }

    refreshManagers();
    setIsEditModalOpen(false);
    toast.success(`Manager ${formData.name} updated successfully.`);
  };

  const handleConfirmArchive = () => {
    if (!targetManager) return;
    const willArchive = !targetManager.archived;
    archiveManager(targetManager.id, willArchive);
    refreshManagers();
    setIsArchiveModalOpen(false);
    toast.success(
      willArchive
        ? `${targetManager.name} deactivated & archived.`
        : `${targetManager.name} restored to active status.`
    );
  };

  const togglePropertyAssignment = (propName) => {
    setFormData((prev) => {
      const exists = prev.assignedProperties.includes(propName);
      if (exists) {
        return {
          ...prev,
          assignedProperties: prev.assignedProperties.filter((p) => p !== propName),
        };
      } else {
        return {
          ...prev,
          assignedProperties: [...prev.assignedProperties, propName],
        };
      }
    });
  };

  const propertyFilterOptions = useMemo(() => {
    return ['All Properties', ...allProperties.map((p) => p.name)];
  }, [allProperties]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Property Managers & Site Operations"
        subtitle="Manage licensed property managers, building portfolio assignments, and approval spending caps."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Managers' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={Download}
              size="sm"
              onClick={() => toast.success('Manager roster exported to CSV.')}
            >
              Export Roster
            </Button>
            <Button icon={Plus} size="sm" onClick={handleOpenAdd}>
              Add Manager
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Active Managers"
          value={activeManagers.length}
          change={activeManagers.length > 0 ? 100 : 0}
          changeLabel="Assigned across portfolio"
          icon={Briefcase}
          color="blue"
        />
        <StatCard
          title="Assigned Buildings"
          value={totalAssignedProperties}
          change={4.2}
          changeLabel="Across all active managers"
          icon={Building2}
          color="purple"
        />
        <StatCard
          title="Active Work Orders"
          value={totalActiveWorkOrders}
          change={-2.1}
          changeLabel="Under field supervision"
          icon={Wrench}
          color="green"
        />
        <StatCard
          title="Total Spending Caps"
          value={formatUsd(totalSpendingCaps)}
          change={0}
          changeLabel="Discretionary threshold"
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Main Table Card */}
      <Card padding="p-0">
        <CardHeader
          title="Licensed Property Managers Roster"
          subtitle={`${filteredManagers.length} manager records registered in system`}
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Property Filter */}
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer max-w-[180px]"
            >
              {propertyFilterOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
              <tr>
                <th className="py-3 px-4">Manager Name & Details</th>
                <th className="py-3 px-4">Contact & Shift</th>
                <th className="py-3 px-4">Assigned Properties</th>
                <th className="py-3 px-4">Approval Cap</th>
                <th className="py-3 px-4">Portal Login</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredManagers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Briefcase className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium text-gray-600">No property managers found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Try adjusting your search criteria or add a new manager.
                    </p>
                    <div className="mt-4">
                      <Button size="sm" icon={Plus} onClick={handleOpenAdd}>
                        Add First Manager
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredManagers.map((mgr) => {
                  return (
                    <tr
                      key={mgr.id}
                      className={`hover:bg-gray-50/80 transition-colors ${mgr.archived ? 'bg-gray-50/40 opacity-70' : ''
                        }`}
                    >
                      {/* Name & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={mgr.name} size="sm" />
                          <div>
                            <p
                              className="font-bold text-gray-900 hover:text-indigo-600 cursor-pointer transition-colors"
                              onClick={() => navigate(`/managers/${mgr.id}`)}
                            >
                              {mgr.name}
                            </p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <span>{mgr.employmentType || 'Full-Time'}</span>
                              <span>·</span>
                              <span className="text-amber-600 font-medium">{mgr.rating || '5.0'} ★</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Shift */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="text-gray-900 font-medium flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {mgr.email}
                          </p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {mgr.phone || '—'}
                          </p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {mgr.shift || 'Day (8 AM–5 PM)'}
                          </p>
                        </div>
                      </td>

                      {/* Assigned Properties */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Array.isArray(mgr.properties) && mgr.properties.length > 0 ? (
                            mgr.properties.map((prop, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-[10px]"
                              >
                                <Building2 className="w-2.5 h-2.5 text-indigo-500" />
                                {typeof prop === 'object' && prop !== null ? prop.name : String(prop)}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">No assigned properties</span>
                          )}
                        </div>
                      </td>

                      {/* Approval Cap */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-gray-900">{formatUsd(mgr.spendingCap || 1000)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">per ticket cap</p>
                        </div>
                      </td>

                      {/* Portal Login */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <KeyRound className="w-2.5 h-2.5 text-emerald-600" />
                          Password Active
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {mgr.archived ? (
                          <Badge variant="danger" size="sm">Archived</Badge>
                        ) : mgr.status === 'Active' ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">{mgr.status || 'On Leave'}</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View Manager Details"
                            onClick={() => navigate(`/managers/${mgr.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Manager"
                            onClick={() => handleOpenEdit(mgr)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={mgr.archived ? 'Restore Manager' : 'Deactivate / Archive Manager'}
                            onClick={() => {
                              setTargetManager(mgr);
                              setIsArchiveModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mgr.archived
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                          >
                            {mgr.archived ? (
                              <RotateCcw className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD MANAGER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Property Manager"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleSaveAdd}>
              Create Manager Profile
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 leading-relaxed">
            <strong>MANAGER CREDENTIALS & ACCESS:</strong> Admin creates the manager account, sets their login password, and assigns the properties they oversee. The manager can immediately sign in to the Manager Workspace using their email and this password.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Manager Full Name *"
              placeholder="e.g. David Brooks or Sarah Jenkins"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Primary Email (Login ID) *"
              type="email"
              placeholder="e.g. manager@rentlock.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Manager Login Password *"
              type="text"
              placeholder="Set password (e.g. demo123 or Pass@123)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              helperText="Manager will use this password to sign into the Manager Workspace."
            />
            <Input
              label="Phone Number"
              placeholder="+1 (718) 555-0192"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <Select
                label="Spending Approval Cap"
                options={SPENDING_CAP_OPTIONS.map((c) => `$${c}`)}
                value={`$${formData.spendingCap}`}
                onChange={(e) => setFormData({ ...formData, spendingCap: Number(e.target.value.replace('$', '')) || 1000 })}
                helperText="Work orders exceeding this cap require Admin approval."
              />
            </div>
            <div>
              <Select
                label="Employment Type"
                options={['Full-Time', 'Part-Time', 'Contract']}
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Initial Status"
                options={['Active', 'On Leave']}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Assign Managed Properties
            </label>
            <p className="text-[11px] text-gray-400 mb-2.5">
              Select all buildings this property manager is authorized to supervise:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-xl bg-gray-50/50">
              {allProperties.map((prop) => {
                const isSelected = formData.assignedProperties.includes(prop.name);
                return (
                  <label
                    key={prop.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${isSelected
                      ? 'bg-indigo-50 border border-indigo-200 font-medium text-indigo-900'
                      : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePropertyAssignment(prop.name)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="truncate">{prop.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* EDIT MANAGER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={targetManager ? `Edit Manager Profile · ${targetManager.name}` : ''}
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
              label="Manager Full Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Primary Email (Login ID) *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Reset Manager Password"
              type="text"
              placeholder="Leave blank to keep existing, or type new password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              helperText="Admin can reset the login password for this manager."
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <Select
                label="Spending Approval Cap"
                options={SPENDING_CAP_OPTIONS.map((c) => `$${c}`)}
                value={`$${formData.spendingCap}`}
                onChange={(e) => setFormData({ ...formData, spendingCap: Number(e.target.value.replace('$', '')) || 1000 })}
              />
            </div>
            <div>
              <Select
                label="Employment Type"
                options={['Full-Time', 'Part-Time', 'Contract']}
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Account Status"
                options={['Active', 'On Leave']}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Assigned Properties
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-xl bg-gray-50/50">
              {allProperties.map((prop) => {
                const isSelected = formData.assignedProperties.includes(prop.name);
                return (
                  <label
                    key={prop.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${isSelected
                      ? 'bg-indigo-50 border border-indigo-200 font-medium text-indigo-900'
                      : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePropertyAssignment(prop.name)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="truncate">{prop.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* ARCHIVE / RESTORE CONFIRMATION MODAL */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title={targetManager?.archived ? 'Restore Manager Profile' : 'Deactivate / Archive Manager'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={targetManager?.archived ? 'primary' : 'danger'}
              onClick={handleConfirmArchive}
            >
              {targetManager?.archived ? 'Confirm Restore' : 'Confirm Deactivate'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-xs text-gray-600">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${targetManager?.archived
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-rose-50 text-rose-600'
              }`}
          >
            {targetManager?.archived ? (
              <RotateCcw className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {targetManager?.archived
                ? `Restore access for ${targetManager?.name}?`
                : `Deactivate manager account for ${targetManager?.name}?`}
            </p>
            <p className="mt-1 text-gray-500 leading-relaxed">
              {targetManager?.archived
                ? 'This manager will be reactivated, restoring their ability to log into the Manager Workspace and supervise assigned properties.'
                : 'Deactivating this manager prevents portal login. Their assigned properties can be reassigned to other managers.'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

