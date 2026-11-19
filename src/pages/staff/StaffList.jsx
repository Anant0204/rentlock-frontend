import { useState, useMemo, useEffect } from 'react';
import {
  KeyRound, Plus, Search, ShieldCheck, User, Building2,
  Clock, Phone, Mail, CheckCircle2, Lock, Trash2, LayoutGrid,
  List, AlertTriangle, Shield, Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import apiClient from '../../services/apiClient';
import { getStaff, addStaff, updateStaff, saveStaff, deleteStaff } from '../../data/mockOperations';
import { getProperties } from '../../data/mockProperties';

export default function StaffList() {
  const [staff, setStaff] = useState(() => getStaff());
  const [properties, setProperties] = useState(() => {
    return getProperties().filter((p) => !p.archived);
  });
  const [statusFilter, setStatusFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffToEdit, setStaffToEdit] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);

  // Helper to reliably resolve staff assigned property name
  const getStaffProperty = (s) => {
    if (!s) return 'General Portfolio';
    if (s.assignedProperty && s.assignedProperty !== 'General Portfolio' && s.assignedProperty !== 'Sunrise Residency & Portfolio') {
      return s.assignedProperty;
    }
    if (s.propertyName && s.propertyName !== 'General Portfolio' && s.propertyName !== 'Sunrise Residency & Portfolio') {
      return s.propertyName;
    }
    if (s.property?.name) {
      return s.property.name;
    }
    if (s.propertyId) {
      const match = properties.find((p) => String(p.id) === String(s.propertyId));
      if (match?.name) return match.name;
    }
    if (s.assignedProperty) return s.assignedProperty;
    if (s.propertyName) return s.propertyName;
    return properties[0]?.name || 'General Portfolio';
  };

  useEffect(() => {
    // 1. Fetch live properties from backend for dropdown
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        const active = items.filter((p) => !p.archived);
        if (active.length > 0) {
          setProperties(active);
          try {
            localStorage.setItem('custom_properties', JSON.stringify(active));
          } catch {}
        }
      }
    }).catch(() => {});

    // 2. Fetch live staff from backend
    apiClient.get('/operations/staff').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        const local = getStaff();
        const mergedMap = new Map();
        items.forEach((item) => mergedMap.set(String(item.id), item));
        local.forEach((item) => {
          if (!mergedMap.has(String(item.id))) {
            mergedMap.set(String(item.id), item);
          }
        });
        const combined = Array.from(mergedMap.values());
        setStaff(combined);
        saveStaff(combined);
      }
    }).catch(() => {});
  }, []);

  // Form State - Empty initial values so only placeholders show
  const [form, setForm] = useState({
    name: '',
    role: '',
    department: '',
    phone: '',
    email: '',
    propertyId: '',
    assignedProperty: '',
    shift: '',
    keyFobId: '',
    activeKeys: '',
    status: 'On Duty',
    backgroundCheck: 'Verified (FDNY / Background Clear)',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    department: '',
    phone: '',
    email: '',
    propertyId: '',
    assignedProperty: '',
    shift: '',
    keyFobId: '',
    activeKeys: '',
  });

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const q = searchTerm.trim().toLowerCase();
      const propName = getStaffProperty(s);

      // Status Filter
      if (statusFilter !== 'All' && s.status !== statusFilter) {
        return false;
      }

      // Property Filter
      if (propertyFilter !== 'All') {
        if (propName !== propertyFilter && String(s.propertyId) !== String(propertyFilter)) {
          return false;
        }
      }

      // Search Query
      if (!q) return true;
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.role || s.roleTitle || '').toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        propName.toLowerCase().includes(q)
      );
    });
  }, [staff, searchTerm, statusFilter, propertyFilter, properties]);

  const stats = useMemo(() => {
    const total = staff.length;
    const onDuty = staff.filter((s) => s.status === 'On Duty' || s.status === 'Active').length;
    const propertiesCount = new Set(staff.map((s) => getStaffProperty(s))).size;
    const fobsCount = staff.filter((s) => s.keyFobId).length;
    return { total, onDuty, propertiesCount, fobsCount };
  }, [staff, properties]);

  const handleToggleStatus = async (staffId) => {
    let nextStatus = '';
    let staffName = '';
    const updated = staff.map((s) => {
      if (s.id === staffId) {
        nextStatus = s.status === 'On Duty' ? 'Off Duty' : 'On Duty';
        staffName = s.name;
        return { ...s, status: nextStatus };
      }
      return s;
    });
    setStaff(updated);
    saveStaff(updated);

    if (typeof staffId === 'number' || (!isNaN(Number(staffId)) && !String(staffId).startsWith('STF-'))) {
      try {
        await apiClient.patch(`/operations/staff/${staffId}/shift`, {
          shiftStatus: nextStatus === 'On Duty' ? 'On_Duty' : 'Off_Duty',
        });
      } catch (err) {
        console.warn('Could not sync shift status with backend:', err);
      }
    }

    if (nextStatus === 'On Duty') {
      toast.success(`${staffName} marked On Duty (Ready for Work Orders).`);
    } else {
      toast.success(`${staffName} marked Off Duty.`);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      name: '',
      role: '',
      department: '',
      phone: '',
      email: '',
      propertyId: '',
      assignedProperty: '',
      shift: '',
      keyFobId: '',
      activeKeys: '',
      status: 'On Duty',
      backgroundCheck: 'Verified (FDNY / Background Clear)',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Staff name is required.');
      return;
    }
    if (!form.role.trim()) {
      toast.error('Role / Title is required.');
      return;
    }
    if (!form.propertyId) {
      toast.error('Please select an assigned property.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Valid email address is required.');
      return;
    }

    const assignedPropObj = properties.find(
      (p) => String(p.id) === String(form.propertyId) || p.name === form.assignedProperty
    );
    const resolvedPropertyName = assignedPropObj ? assignedPropObj.name : (form.assignedProperty || 'General Portfolio');

    const newStaffData = {
      propertyId: assignedPropObj ? Number(assignedPropObj.id) : Number(form.propertyId),
      assignedProperty: resolvedPropertyName,
      propertyName: resolvedPropertyName,
      name: form.name.trim(),
      role: form.role.trim(),
      roleTitle: form.role.trim(),
      department: form.department || 'Facilities & Repairs',
      phone: form.phone.trim() || '—',
      email: form.email.trim(),
      shift: form.shift.trim() || 'Day (8 AM–5 PM)',
      keyFobId: form.keyFobId.trim() || `FOB-${Math.floor(1000 + Math.random() * 9000)}`,
      fobKeyId: form.keyFobId.trim() || undefined,
      activeKeys: form.activeKeys.trim() || 'Unit Lockbox & Utility Key Set',
      clearanceLevel: 'Standard Access',
      status: 'On Duty',
      backgroundCheck: 'Verified (FDNY / Background Clear)',
    };

    try {
      const updated = await addStaff(newStaffData);
      setStaff(updated);
      setIsAddModalOpen(false);
      toast.success(`Staff member "${newStaffData.name}" enrolled successfully for ${resolvedPropertyName}!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to enroll staff member.');
    }
  };

  const handleOpenEdit = (staffMember) => {
    setStaffToEdit(staffMember);
    const assignedPropName = getStaffProperty(staffMember);
    const matchedProp = properties.find(
      (p) => String(p.id) === String(staffMember.propertyId) || p.name === assignedPropName
    );
    setEditForm({
      name: staffMember.name || '',
      role: staffMember.role || staffMember.roleTitle || '',
      department: staffMember.department || 'Facilities & Repairs',
      phone: staffMember.phone && staffMember.phone !== '—' ? staffMember.phone : '',
      email: staffMember.email || '',
      propertyId: matchedProp?.id ? String(matchedProp.id) : (staffMember.propertyId ? String(staffMember.propertyId) : ''),
      assignedProperty: assignedPropName,
      shift: staffMember.shift && staffMember.shift !== 'Off Duty' ? staffMember.shift : 'Day (8 AM–5 PM)',
      keyFobId: staffMember.keyFobId || '',
      activeKeys: staffMember.activeKeys || 'Unit Lockbox & Utility Key Set',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Staff name is required.');
      return;
    }
    if (!editForm.role.trim()) {
      toast.error('Role / Title is required.');
      return;
    }
    if (!editForm.propertyId) {
      toast.error('Please select an assigned property.');
      return;
    }
    if (!editForm.email.trim()) {
      toast.error('Valid email address is required.');
      return;
    }

    const assignedPropObj = properties.find(
      (p) => String(p.id) === String(editForm.propertyId) || p.name === editForm.assignedProperty
    );
    const resolvedPropertyName = assignedPropObj ? assignedPropObj.name : (editForm.assignedProperty || 'General Portfolio');

    const updatedData = {
      propertyId: assignedPropObj ? Number(assignedPropObj.id) : Number(editForm.propertyId),
      assignedProperty: resolvedPropertyName,
      propertyName: resolvedPropertyName,
      name: editForm.name.trim(),
      role: editForm.role.trim(),
      roleTitle: editForm.role.trim(),
      department: editForm.department || 'Facilities & Repairs',
      phone: editForm.phone.trim() || '—',
      email: editForm.email.trim(),
      shift: editForm.shift.trim() || 'Day (8 AM–5 PM)',
      keyFobId: editForm.keyFobId.trim() || staffToEdit.keyFobId || '—',
      fobKeyId: editForm.keyFobId.trim() || staffToEdit.keyFobId || undefined,
      activeKeys: editForm.activeKeys.trim() || 'Unit Lockbox & Utility Key Set',
    };

    try {
      const updatedList = await updateStaff(staffToEdit.id, updatedData);
      setStaff(updatedList);
      if (selectedStaff?.id === staffToEdit.id) {
        setSelectedStaff((prev) => ({ ...prev, ...updatedData }));
      }
      setIsEditModalOpen(false);
      setStaffToEdit(null);
      toast.success(`Staff member "${updatedData.name}" updated successfully!`);
    } catch (err) {
      console.error('Update staff error:', err);
      toast.error('Failed to update staff member.');
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      const updated = await deleteStaff(staffToDelete.id);
      setStaff(updated);
      if (selectedStaff?.id === staffToDelete.id) {
        setSelectedStaff(null);
      }
      toast.success(`Staff member "${staffToDelete.name}" removed.`);
    } catch (err) {
      console.error('Delete staff failed:', err);
      toast.error('Failed to remove staff member.');
    } finally {
      setIsDeleteOpen(false);
      setStaffToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Staff & Access Control"
        subtitle="Manage building personnel, shift attendance, electronic key fobs, and security clearance."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Staff & Access' }]}
        actions={
          <Button icon={Plus} size="sm" onClick={handleOpenAdd}>
            Add Staff Member
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Staff On Duty"
          value={`${stats.onDuty} of ${stats.total}`}
          subtitle="Currently on site"
          icon={User}
          color="blue"
        />
        <StatCard
          title="Assigned Properties"
          value={stats.propertiesCount}
          subtitle="Covered locations"
          icon={Building2}
          color="indigo"
        />
        <StatCard
          title="Key Fobs / RFID"
          value={stats.fobsCount}
          subtitle="Active credentials"
          icon={KeyRound}
          color="purple"
        />
        <StatCard
          title="Total Personnel"
          value={stats.total}
          subtitle="Staff roster"
          icon={ShieldCheck}
          color="green"
        />
      </div>

      {/* Search, Filter & View Controls (Replaces Tab Bar) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Pills & Property Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'On Duty', 'Off Duty'].map((st) => {
              const count = st === 'All' ? staff.length : staff.filter((s) => s.status === st).length;
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}

            {properties.length > 0 && (
              <div className="ml-1">
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search & Grid/Table Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff, role, property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* STAFF DIRECTORY                                */}
      {/* ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center space-y-3">
            <User className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">No staff members found matching search or filter.</p>
            <Button size="sm" variant="secondary" onClick={() => { setSearchTerm(''); setStatusFilter('All'); setPropertyFilter('All'); }}>
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const isOnDuty = s.status === 'On Duty';

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-5 space-y-4"
              >
                <div>
                  {/* Header: Avatar, Name, Role, Delete button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-sm">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-snug">{s.name}</h3>
                        <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">{s.role || s.roleTitle}</p>
                        <p className="text-[10px] text-gray-400">{s.department || 'Facilities & Repairs'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isOnDuty
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {isOnDuty ? '● On Duty' : '○ Off Duty'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Staff Member"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStaffToDelete(s);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Staff"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Shift & Property */}
                  <div className="mt-3.5 p-3 bg-gray-50/80 rounded-xl space-y-2 text-xs border border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium text-[11px]">{s.shift || 'Day (8 AM–5 PM)'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{getStaffProperty(s)}</span>
                    </div>
                  </div>

                  {/* Department & Key Fob */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl border border-gray-200 bg-white space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Department</span>
                      <span className="font-semibold text-gray-800 truncate block">
                        {s.department || 'Facilities & Repairs'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl border border-gray-200 bg-white space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Key Fob #</span>
                      <span className="font-mono font-bold text-amber-700 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-500" />
                        {s.keyFobId || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Links */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold text-[11px]">
                      <Phone className="w-3 h-3" />
                      <span>{s.phone || '—'}</span>
                    </a>
                    <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-[11px]">
                      <Mail className="w-3 h-3" />
                      <span>Email</span>
                    </a>
                  </div>
                </div>

                {/* Actions: Attendance Button + Details */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(s.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isOnDuty
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isOnDuty ? 'Mark Off Duty' : 'Mark On Duty'}</span>
                  </button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Edit2}
                    onClick={() => handleOpenEdit(s)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedStaff(s)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-left">Staff Member &amp; Contact</th>
                  <th className="py-3.5 px-4 text-left">Role &amp; Assigned Property</th>
                  <th className="py-3.5 px-4 text-left">Shift Schedule</th>
                  <th className="py-3.5 px-4 text-left">Key Fob #</th>
                  <th className="py-3.5 px-4 text-left">Shift Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((s) => {
                  const isOnDuty = s.status === 'On Duty';

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{s.name}</span>
                        </div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{s.email}</span>
                        </div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{s.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 text-xs">{s.role || s.roleTitle}</div>
                        <div className="text-gray-500 text-[11px] mt-0.5">{s.department || 'Facilities & Repairs'}</div>
                        <div className="text-indigo-700 font-bold text-xs mt-1 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{getStaffProperty(s)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{s.shift || 'Day (8 AM–5 PM)'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-gray-900 font-bold flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          <span>{s.keyFobId || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                              isOnDuty
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {isOnDuty ? '● On Duty' : '○ Off Duty'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={Edit2}
                            onClick={() => handleOpenEdit(s)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => setSelectedStaff(s)}
                          >
                            Details
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.id)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              isOnDuty
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isOnDuty ? 'Mark Off Duty' : 'Mark On Duty'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStaffToDelete(s);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────── */}
      {/* ADD STAFF MODAL                                */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Staff Member &amp; Provision Access"
        size="lg"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Enroll Staff Member
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Staff Full Name *"
              required
              placeholder="e.g. Hector Ramirez"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Role / Title *"
              required
              placeholder="e.g. Maintenance Specialist"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Assigned Property *"
              required
              placeholder="Select Property..."
              value={form.propertyId ? String(form.propertyId) : ''}
              options={properties.map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
              onChange={(e) => {
                const selected = properties.find((p) => String(p.id) === String(e.target.value));
                setForm({
                  ...form,
                  propertyId: selected ? selected.id : e.target.value,
                  assignedProperty: selected ? selected.name : '',
                });
              }}
            />
            <Select
              label="Department"
              placeholder="Select Department..."
              value={form.department}
              options={['Facilities & Repairs', 'Resident Services', 'Building Safety', 'Operations & Cleaning', 'Management & Admin']}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="e.g. +1 (555) 010-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email Address *"
              required
              type="email"
              placeholder="e.g. hector@rentlock.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Assigned Shift Schedule"
              placeholder="e.g. Mon–Fri · 8:00 AM – 4:30 PM"
              value={form.shift}
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
            />
            <Input
              label="Key Fob RFID Tag #"
              placeholder="e.g. FOB-1211 (Leave blank to auto-generate)"
              value={form.keyFobId}
              onChange={(e) => setForm({ ...form, keyFobId: e.target.value })}
            />
          </div>

          <Input
            label="Physical Keys Issued"
            placeholder="e.g. Unit Lockbox & Utility Key Set"
            value={form.activeKeys}
            onChange={(e) => setForm({ ...form, activeKeys: e.target.value })}
          />
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* EDIT STAFF MODAL                               */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setStaffToEdit(null);
        }}
        title={`Edit Staff Member · ${staffToEdit?.name || ''}`}
        size="lg"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setStaffToEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Staff Full Name *"
              required
              placeholder="e.g. Hector Ramirez"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Input
              label="Role / Title *"
              required
              placeholder="e.g. Maintenance Specialist"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Assigned Property *"
              required
              placeholder="Select Property..."
              value={editForm.propertyId ? String(editForm.propertyId) : ''}
              options={properties.map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
              onChange={(e) => {
                const selected = properties.find((p) => String(p.id) === String(e.target.value));
                setEditForm({
                  ...editForm,
                  propertyId: selected ? selected.id : e.target.value,
                  assignedProperty: selected ? selected.name : '',
                });
              }}
            />
            <Select
              label="Department"
              placeholder="Select Department..."
              value={editForm.department}
              options={['Facilities & Repairs', 'Resident Services', 'Building Safety', 'Operations & Cleaning', 'Management & Admin']}
              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="e.g. +1 (555) 010-0000"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Input
              label="Email Address *"
              required
              type="email"
              placeholder="e.g. hector@rentlock.com"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Assigned Shift Schedule"
              placeholder="e.g. Mon–Fri · 8:00 AM – 4:30 PM"
              value={editForm.shift}
              onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
            />
            <Input
              label="Key Fob RFID Tag #"
              placeholder="e.g. FOB-1211 (Leave blank to auto-generate)"
              value={editForm.keyFobId}
              onChange={(e) => setEditForm({ ...editForm, keyFobId: e.target.value })}
            />
          </div>

          <Input
            label="Physical Keys Issued"
            placeholder="e.g. Unit Lockbox & Utility Key Set"
            value={editForm.activeKeys}
            onChange={(e) => setEditForm({ ...editForm, activeKeys: e.target.value })}
          />
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* STAFF DETAILS MODAL                            */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedStaff)}
        onClose={() => setSelectedStaff(null)}
        title={`Staff Profile · ${selectedStaff?.name || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectedStaff(null)}>
              Close
            </Button>
            {selectedStaff && (
              <>
                <Button
                  variant="secondary"
                  icon={Edit2}
                  onClick={() => {
                    const cur = selectedStaff;
                    setSelectedStaff(null);
                    handleOpenEdit(cur);
                  }}
                >
                  Edit Profile
                </Button>
                <Button
                  onClick={() => {
                    handleToggleStatus(selectedStaff.id);
                    setSelectedStaff((prev) =>
                      prev ? { ...prev, status: prev.status === 'On Duty' ? 'Off Duty' : 'On Duty' } : null
                    );
                  }}
                >
                  {selectedStaff.status === 'On Duty' ? 'Mark Off Duty' : 'Mark On Duty'}
                </Button>
              </>
            )}
          </div>
        }
      >
        {selectedStaff && (
          <div className="space-y-4 text-xs text-gray-700">
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-indigo-950">{selectedStaff.name}</span>
                <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {selectedStaff.role}
                </span>
              </div>
              <p className="text-indigo-800 text-[11px] font-medium">{selectedStaff.department || 'Facilities & Repairs'} · {getStaffProperty(selectedStaff)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Current Attendance</span>
                <strong className={selectedStaff.status === 'On Duty' ? 'text-emerald-700 font-bold' : 'text-gray-600'}>
                  {selectedStaff.status === 'On Duty' ? '● On Duty on Site' : '○ Off Duty'}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Shift Timing</span>
                <span className="font-medium text-gray-800">{selectedStaff.shift}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Key Fob #</span>
                <span className="font-mono font-bold text-amber-700">{selectedStaff.keyFobId}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Clearance</span>
                <span className="font-semibold text-gray-800">{selectedStaff.clearanceLevel}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-gray-200">
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Physical Brass Keys Handed Out</span>
                <span className="font-medium text-gray-800">{selectedStaff.activeKeys}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Background Vetting: <strong>{selectedStaff.backgroundCheck}</strong></span>
            </div>
          </div>
        )}
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* DELETE STAFF CONFIRMATION MODAL                */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Staff Member"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDeleteStaff}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Staff</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-gray-700">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Remove staff member {staffToDelete?.name}?</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                This will unpair key fob <strong>{staffToDelete?.keyFobId}</strong> and revoke facility door clearance.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
