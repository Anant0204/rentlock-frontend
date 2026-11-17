import { useState, useMemo, useEffect } from 'react';
import {
  KeyRound, Plus, Search, ShieldCheck, User, Building2,
  Clock, Phone, Mail, CheckCircle2, Lock, Trash2, LayoutGrid,
  List, AlertTriangle, Shield
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
import { getStaff, addStaff, saveStaff, deleteStaff } from '../../data/mockOperations';

const TABS = [
  { id: 'directory', label: 'Staff Directory & Attendance' },
  { id: 'fobs', label: 'Key Fobs & Master Keys' },
  { id: 'clearance', label: 'Access Clearance Matrix' },
];

export default function StaffList() {
  const [staff, setStaff] = useState(() => getStaff());
  const [activeTab, setActiveTab] = useState('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);

  useEffect(() => {
    apiClient.get('/operations/staff').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setStaff(items);
        localStorage.setItem('custom_staff', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  // Form State
  const [form, setForm] = useState({
    name: '',
    role: 'Maintenance Specialist',
    department: 'Facilities & Repairs',
    phone: '',
    email: '',
    assignedProperty: 'Sunrise Residency & Portfolio',
    shift: 'Mon–Fri · 8:00 AM – 4:30 PM',
    keyFobId: 'FOB-2840',
    clearanceLevel: 'Standard Maintenance & Common Areas',
    activeKeys: 'Unit Lockbox & Utility Key Set',
    status: 'On Duty',
    backgroundCheck: 'Verified (FDNY / Background Clear)',
  });

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const q = searchTerm.toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.keyFobId.toLowerCase().includes(q) ||
        s.clearanceLevel.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q)
      );
    });
  }, [staff, searchTerm]);

  const stats = useMemo(() => {
    const total = staff.length;
    const onDuty = staff.filter((s) => s.status === 'On Duty' || s.status === 'Active').length;
    const masterClearance = staff.filter((s) => (s.clearanceLevel || '').includes('Master')).length;
    const fobsCount = staff.filter((s) => s.keyFobId).length;
    return { total, onDuty, masterClearance, fobsCount };
  }, [staff]);

  const handleToggleStatus = (staffId) => {
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
    if (nextStatus === 'On Duty') {
      toast.success(`${staffName} marked On Duty (Ready for Work Orders).`);
    } else {
      toast.success(`${staffName} marked Off Duty.`);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      name: '',
      role: 'Maintenance Specialist',
      department: 'Facilities & Repairs',
      phone: '+1 (555) 010-0000',
      email: '',
      assignedProperty: 'Sunrise Residency & Portfolio',
      shift: 'Mon–Fri · 8:00 AM – 4:30 PM',
      keyFobId: `FOB-${Math.floor(1000 + (staff.length + 1) * 211)}`,
      clearanceLevel: 'Standard Maintenance & Common Areas',
      activeKeys: 'Unit Lockbox & Utility Key Set',
      status: 'On Duty',
      backgroundCheck: 'Verified',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Staff name and email are required.');
      return;
    }
    const updated = addStaff({
      name: form.name.trim(),
      role: form.role.trim(),
      department: form.department.trim(),
      phone: form.phone.trim() || '+1 (555) 010-0000',
      email: form.email.trim(),
      assignedProperty: form.assignedProperty,
      shift: form.shift,
      keyFobId: form.keyFobId,
      clearanceLevel: form.clearanceLevel,
      activeKeys: form.activeKeys,
      status: form.status,
      backgroundCheck: form.backgroundCheck,
    });
    setStaff(updated);
    setIsAddModalOpen(false);
    toast.success(`Staff member ${form.name} enrolled with key fob ${form.keyFobId}!`);
  };

  const handleDeleteStaff = () => {
    if (!staffToDelete) return;
    const updated = deleteStaff(staffToDelete.id);
    setStaff(updated);
    if (selectedStaff?.id === staffToDelete.id) {
      setSelectedStaff(null);
    }
    toast.success(`Staff member "${staffToDelete.name}" removed.`);
    setIsDeleteOpen(false);
    setStaffToDelete(null);
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
          title="Key Fobs Issued"
          value={stats.fobsCount}
          subtitle="Encrypted RFID access"
          icon={KeyRound}
          color="indigo"
        />
        <StatCard
          title="Master Key Holders"
          value={stats.masterClearance}
          subtitle="Full facility pass"
          icon={Lock}
          color="purple"
        />
        <StatCard
          title="Vetting & Security"
          value="100%"
          subtitle="Background verified"
          icon={ShieldCheck}
          color="green"
        />
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Grid/Table Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff, role, fob #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {activeTab === 'directory' && (
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
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* TAB 1: STAFF DIRECTORY & ATTENDANCE            */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        filtered.length === 0 ? (
          <Card>
            <div className="py-12 text-center space-y-3">
              <User className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No staff members found matching search.</p>
              <Button size="sm" variant="secondary" onClick={() => setSearchTerm('')}>
                Reset Search
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
                          <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">{s.role}</p>
                          <p className="text-[10px] text-gray-400">{s.department}</p>
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
                    <div className="mt-3.5 p-3 bg-gray-50/80 rounded-xl space-y-1.5 text-xs border border-gray-100">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-[11px]">{s.shift}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{s.assignedProperty}</span>
                      </div>
                    </div>

                    {/* Key Fob & Clearance */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl border border-gray-200 bg-white space-y-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Key Fob #</span>
                        <span className="font-mono font-bold text-amber-700 flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-500" />
                          {s.keyFobId}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl border border-gray-200 bg-white space-y-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Clearance</span>
                        <span className="font-bold text-gray-800 truncate block">
                          {(s.clearanceLevel || '').includes('Master') ? 'Master Access' : 'Standard Access'}
                        </span>
                      </div>
                    </div>

                    {/* Contact Links */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                      <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold text-[11px]">
                        <Phone className="w-3 h-3" />
                        <span>{s.phone}</span>
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
                    <th className="py-3.5 px-4 text-left">Role &amp; Department</th>
                    <th className="py-3.5 px-4 text-left">Shift Schedule</th>
                    <th className="py-3.5 px-4 text-left">Key Fob &amp; Clearance</th>
                    <th className="py-3.5 px-4 text-left">Shift Status &amp; Vetting</th>
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
                          <div className="font-semibold text-gray-900 text-xs">{s.role}</div>
                          <div className="text-gray-500 text-[11px] mt-0.5">{s.department}</div>
                          <div className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span>{s.assignedProperty}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-gray-800 font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{s.shift}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-gray-900 font-bold flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            <span>{s.keyFobId}</span>
                          </div>
                          <div className="mt-1">
                            <Badge
                              variant={(s.clearanceLevel || '').includes('Master') ? 'danger' : 'primary'}
                              className="text-[10px]"
                            >
                              {s.clearanceLevel}
                            </Badge>
                          </div>
                          <div className="text-gray-500 text-[10px] mt-1">
                            {s.activeKeys}
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
                          <div className="text-emerald-700 font-medium text-[10px] flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{s.backgroundCheck}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
        )
      )}

      {/* ────────────────────────────────────────────── */}
      {/* TAB 2: KEY FOBS & MASTER KEYS                  */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'fobs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <Card key={s.id} className="p-4 space-y-3 border-l-4 border-l-amber-500">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-amber-700 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>{s.keyFobId}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                    {s.name}
                  </h4>
                  <p className="text-xs text-gray-500">{s.role}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    s.status === 'On Duty'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl space-y-2 text-xs border border-gray-100">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Clearance</span>
                  <span className="font-semibold text-gray-800">
                    {s.clearanceLevel}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Physical Keys Issued</span>
                  <span className="font-medium text-gray-700">
                    {s.activeKeys}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Assigned Facility</span>
                  <span className="font-medium text-gray-700">
                    {s.assignedProperty}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active &amp; Paired
                </span>
                <button
                  type="button"
                  onClick={() => toast.success(`Audit log exported for ${s.keyFobId}`)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                >
                  View Scan Log →
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────── */}
      {/* TAB 3: ACCESS CLEARANCE MATRIX                 */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'clearance' && (
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Facility Security &amp; Door Clearance Matrix
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Defines which electronic doors, lockboxes, and mechanical service rooms each staff tier can access.
            </p>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-3">Role Tier</th>
                  <th className="py-3 px-3">Lobby &amp; Intercom</th>
                  <th className="py-3 px-3">Package Room</th>
                  <th className="py-3 px-3">Common Amenities</th>
                  <th className="py-3 px-3">Boiler &amp; Roof</th>
                  <th className="py-3 px-3">Tenant Unit Lockbox</th>
                  <th className="py-3 px-3">Security CCTV Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <tr className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 font-bold text-gray-900">Admin &amp; Executive</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 font-bold text-gray-900">Lead Maintenance</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-amber-700 font-bold">✓ Work Order Key</td>
                  <td className="py-2.5 px-3 text-gray-400">✗ No Access</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 font-bold text-gray-900">Front Desk Concierge</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-gray-400">✗ No Access</td>
                  <td className="py-2.5 px-3 text-gray-400">✗ No Access</td>
                  <td className="py-2.5 px-3 text-gray-400">✗ No Access</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 font-bold text-gray-900">On-Site Security</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Perimeter</td>
                  <td className="py-2.5 px-3 text-gray-400">✗ Emergency Only</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">✓ Full</td>
                </tr>
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
              placeholder="e.g. Facilities Technician"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Department"
              value={form.department}
              options={['Facilities & Repairs', 'Resident Services', 'Building Safety', 'Operations & Cleaning']}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
            <Input
              label="Assigned Shift Schedule"
              placeholder="e.g. Mon–Fri · 8:00 AM – 4:30 PM"
              value={form.shift}
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+1 (555) 010-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email Address *"
              required
              type="email"
              placeholder="hector@rentlock.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Key Fob RFID Tag #"
              value={form.keyFobId}
              onChange={(e) => setForm({ ...form, keyFobId: e.target.value })}
            />
            <Select
              label="Access Clearance Tier"
              value={form.clearanceLevel}
              options={[
                'All-Building Master Clearance',
                'Standard Maintenance & Common Areas',
                'Lobby, Packages & Amenities',
                'Perimeter, Gates & Surveillance',
              ]}
              onChange={(e) => setForm({ ...form, clearanceLevel: e.target.value })}
            />
          </div>

          <Input
            label="Physical Keys Issued"
            placeholder="e.g. Master Key Set #1 (Boiler, Roof, Units)"
            value={form.activeKeys}
            onChange={(e) => setForm({ ...form, activeKeys: e.target.value })}
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
              <p className="text-indigo-800 text-[11px]">{selectedStaff.department} · {selectedStaff.assignedProperty}</p>
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
