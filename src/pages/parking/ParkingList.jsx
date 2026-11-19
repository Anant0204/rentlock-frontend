import { useState, useMemo, useEffect } from 'react';
import {
  Car, Plus, Search, CheckCircle2, Zap, Shield, User,
  DollarSign, Clock, AlertTriangle, FileText, Building2,
  Trash2, LayoutGrid, List, Check, Tag
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
import { formatUsd } from '../../utils/formatters';
import {
  getParkingStalls,
  assignParkingStall,
  addParkingStall,
  deleteParkingStall
} from '../../data/mockOperations';
import { getTenants } from '../../data/mockTenants';
import { getProperties } from '../../data/mockProperties';

const TABS = [
  { id: 'all', label: 'All Stalls' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'vacant', label: 'Available / Vacant' },
  { id: 'ev', label: 'EV Charging' },
  { id: 'visitor', label: 'Visitor Stalls' },
];

export default function ParkingList() {
  const [stalls, setStalls] = useState(() => getParkingStalls());
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAddStallOpen, setIsAddStallOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [selectedStall, setSelectedStall] = useState(null);
  const [stallToDelete, setStallToDelete] = useState(null);
  const [stallToRelease, setStallToRelease] = useState(null);

  const [properties, setProperties] = useState(() => getProperties());
  const [tenants, setTenants] = useState(() => getTenants());

  useEffect(() => {
    apiClient.get('/operations/parking').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setStalls(items);
        localStorage.setItem('custom_parking_stalls', JSON.stringify(items));
      }
    }).catch(() => {});

    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setProperties(items);
      }
    }).catch(() => {});

    apiClient.get('/tenants?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setTenants(items);
      }
    }).catch(() => {});
  }, []);

  // Compute available properties dynamically from properties list, tenants, and stalls
  const propertyOptions = useMemo(() => {
    const map = new Map();
    properties.forEach((p) => {
      if (p?.name) map.set(p.name, { id: p.id, name: p.name });
    });
    tenants.forEach((t) => {
      if (t?.propertyName && !map.has(t.propertyName)) {
        map.set(t.propertyName, { id: t.propertyId || t.propertyName, name: t.propertyName });
      }
    });
    stalls.forEach((s) => {
      if (s?.propertyName && !map.has(s.propertyName)) {
        map.set(s.propertyName, { id: s.propertyId || s.propertyName, name: s.propertyName });
      }
    });
    const list = Array.from(map.values());
    return list.length > 0 ? list : [{ id: 1, name: 'Sunrise Residency' }];
  }, [properties, tenants, stalls]);

  // Form State for Assigning a Stall
  const [form, setForm] = useState({
    propertyName: '',
    propertyId: '',
    tenantId: '',
    assignedResident: '',
    unitNumber: '',
    vehicle: '',
    licensePlate: '',
    permitTag: '',
    monthlyFee: '',
    isManualResident: false,
  });

  // Filter tenants belonging to selected property/building
  const buildingTenants = useMemo(() => {
    if (!form.propertyName) return tenants;
    const propNameLower = form.propertyName.toLowerCase();
    const filtered = tenants.filter((t) => {
      if (!t) return false;
      if (t.propertyName && t.propertyName.toLowerCase() === propNameLower) return true;
      if (form.propertyId && String(t.propertyId) === String(form.propertyId)) return true;
      return false;
    });
    return filtered;
  }, [tenants, form.propertyName, form.propertyId]);

  // Form State for Adding a New Stall
  const [addForm, setAddForm] = useState({
    spotNumber: '',
    propertyName: '',
    lotLocation: '',
    spotType: 'Standard Covered',
    monthlyFee: '',
  });

  const filtered = useMemo(() => {
    return stalls.filter((s) => {
      if (activeTab === 'assigned' && !s.assignedResident) return false;
      const spotType = s.spotType || s.stallType || '';
      if (activeTab === 'vacant' && (s.assignedResident || s.assignedTenantId)) return false;
      if (activeTab === 'ev' && !spotType.includes('EV')) return false;
      if (activeTab === 'visitor' && !spotType.includes('Visitor')) return false;

      const q = searchTerm.toLowerCase();
      if (!q) return true;
      return (
        (s.spotNumber || s.stallNumber || '').toLowerCase().includes(q) ||
        (s.assignedResident && s.assignedResident.toLowerCase().includes(q)) ||
        (s.licensePlate || s.assignedVehiclePlate || '').toLowerCase().includes(q) ||
        (s.unitNumber || '').toLowerCase().includes(q) ||
        (s.propertyName || '').toLowerCase().includes(q) ||
        spotType.toLowerCase().includes(q)
      );
    });
  }, [stalls, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const total = stalls.length;
    const assigned = stalls.filter((s) => (s.assignedResident || s.assignedTenantId) && !(s.spotType || s.stallType || '').includes('Visitor')).length;
    const vacant = stalls.filter((s) => !s.assignedResident && !s.assignedTenantId).length;
    const evCount = stalls.filter((s) => (s.spotType || s.stallType || '').includes('EV')).length;
    return { total, assigned, vacant, evCount };
  }, [stalls]);

  const handleOpenAssign = (stall) => {
    setSelectedStall(stall);
    const initialPropName = stall.propertyName || propertyOptions[0]?.name || '';
    const initialProp = propertyOptions.find((p) => p.name.toLowerCase() === (initialPropName || '').toLowerCase()) || propertyOptions[0];

    const isAssigned = Boolean(stall.assignedResident && stall.assignedResident.trim() && stall.assignedResident !== 'Unassigned');

    let matchedTenant = null;
    if (isAssigned) {
      matchedTenant = tenants.find(
        (t) =>
          (stall.assignedTenantId && String(t.id) === String(stall.assignedTenantId)) ||
          (t.name && t.name.toLowerCase() === stall.assignedResident.toLowerCase())
      );
    }

    setForm({
      propertyName: stall.propertyName || initialProp?.name || '',
      propertyId: stall.propertyId || initialProp?.id || '',
      tenantId: matchedTenant ? String(matchedTenant.id) : (stall.assignedTenantId ? String(stall.assignedTenantId) : ''),
      assignedResident: isAssigned ? stall.assignedResident : '',
      unitNumber: isAssigned && stall.unitNumber && stall.unitNumber !== 'Unassigned'
        ? stall.unitNumber
        : (matchedTenant?.unitNumber || matchedTenant?.unit?.unitNumber || ''),
      vehicle: isAssigned && stall.vehicle && stall.vehicle !== '—'
        ? stall.vehicle
        : (matchedTenant?.vehicle || matchedTenant?.vehicleModel || ''),
      licensePlate: isAssigned && stall.licensePlate && stall.licensePlate !== '—'
        ? stall.licensePlate
        : (matchedTenant?.licensePlate || matchedTenant?.vehiclePlate || ''),
      permitTag: isAssigned && stall.permitTag && stall.permitTag !== '—'
        ? stall.permitTag
        : '',
      monthlyFee: stall.monthlyFee !== undefined && stall.monthlyFee !== null && stall.monthlyFee !== ''
        ? String(stall.monthlyFee)
        : '',
      isManualResident: isAssigned && !matchedTenant,
    });
    setIsAssignOpen(true);
  };

  const handlePropertyChange = (newPropName) => {
    const prop = propertyOptions.find((p) => p.name === newPropName);
    setForm((prev) => ({
      ...prev,
      propertyName: newPropName,
      propertyId: prop?.id || '',
      tenantId: '',
      assignedResident: '',
      unitNumber: '',
      vehicle: '',
      licensePlate: '',
      permitTag: '',
      isManualResident: false,
    }));
  };

  const handleTenantChange = (selectedValue) => {
    if (selectedValue === '__manual__' || selectedValue === '__none__' || !selectedValue) {
      setForm((prev) => ({
        ...prev,
        tenantId: '',
        assignedResident: '',
        unitNumber: '',
        vehicle: '',
        licensePlate: '',
        isManualResident: selectedValue === '__manual__',
      }));
      return;
    }

    const chosenTenant = buildingTenants.find(
      (t) => String(t.id) === String(selectedValue) || t.name === selectedValue
    );
    if (chosenTenant) {
      setForm((prev) => ({
        ...prev,
        tenantId: String(chosenTenant.id),
        assignedResident: chosenTenant.name || '',
        unitNumber: chosenTenant.unitNumber || chosenTenant.unit?.unitNumber || '',
        vehicle: chosenTenant.vehicle || chosenTenant.vehicleModel || '',
        licensePlate: chosenTenant.licensePlate || chosenTenant.vehiclePlate || '',
        isManualResident: false,
      }));
    }
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!form.assignedResident.trim() || !form.licensePlate.trim()) {
      toast.error('Resident name and vehicle license plate are required.');
      return;
    }
    const updated = assignParkingStall(selectedStall.id, {
      propertyName: form.propertyName,
      propertyId: form.propertyId,
      tenantId: form.tenantId || null,
      assignedResident: form.assignedResident.trim(),
      unitNumber: form.unitNumber.trim(),
      vehicle: form.vehicle.trim(),
      licensePlate: form.licensePlate.trim(),
      permitTag: form.permitTag.trim(),
      monthlyFee: Number(form.monthlyFee) || 0,
    });
    setStalls(updated);
    setIsAssignOpen(false);
    toast.success(`Stall ${selectedStall.spotNumber} assigned to ${form.assignedResident}!`);
  };

  const handleConfirmRelease = () => {
    if (!stallToRelease) return;
    const updated = assignParkingStall(stallToRelease.id, {
      assignedResident: null,
      unitNumber: 'Unassigned',
      vehicle: '—',
      licensePlate: '—',
      permitTag: '—',
    });
    setStalls(updated);
    toast.success(`Stall ${stallToRelease.spotNumber} released and marked vacant.`);
    setIsReleaseOpen(false);
    setStallToRelease(null);
  };

  const handleAddStallSubmit = (e) => {
    e.preventDefault();
    if (!addForm.spotNumber.trim()) {
      toast.error('Spot number is required (e.g. P-109).');
      return;
    }
    const updated = addParkingStall(addForm);
    setStalls(updated);
    setIsAddStallOpen(false);
    setAddForm({
      spotNumber: '',
      lotLocation: 'Sub-Level 1 (North Garage)',
      spotType: 'Standard Covered',
      monthlyFee: '150',
    });
    toast.success(`Parking stall ${addForm.spotNumber} created successfully!`);
  };

  const handleDeleteStall = () => {
    if (!stallToDelete) return;
    const updated = deleteParkingStall(stallToDelete.id);
    setStalls(updated);
    toast.success(`Stall ${stallToDelete.spotNumber} deleted.`);
    setIsDeleteOpen(false);
    setStallToDelete(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Parking Management"
        subtitle="Manage assigned resident stalls, EV charging spots, and visitor parking passes."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Parking' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={Plus}
              size="sm"
              onClick={() => setIsAddStallOpen(true)}
            >
              Add New Spot
            </Button>
            <Button
              icon={Car}
              size="sm"
              onClick={() => {
                const vacantStall = stalls.find((s) => !s.assignedResident) || stalls[0];
                handleOpenAssign(vacantStall);
              }}
            >
              Assign Stall
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Parking Stalls"
          value={stats.total}
          subtitle="Garage & surface spots"
          icon={Car}
          color="indigo"
        />
        <StatCard
          title="Assigned Stalls"
          value={stats.assigned}
          subtitle="Active tenant permits"
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          title="Available Spots"
          value={stats.vacant}
          subtitle="Ready for immediate lease"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="EV Charging Spots"
          value={stats.evCount}
          subtitle="Level 2 EV stations"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Control Bar: Filter Pills, Search Bar, and View Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search stall #, plate, resident, unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-gray-800"
            />
          </div>

          {/* Cards / Table View Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl self-end sm:self-auto">
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

        {/* Filter Pills with Live Counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {TABS.map((tab) => {
            let count = stalls.length;
            if (tab.id === 'assigned') count = stalls.filter((s) => s.assignedResident || s.assignedTenantId).length;
            if (tab.id === 'vacant') count = stalls.filter((s) => !s.assignedResident && !s.assignedTenantId).length;
            if (tab.id === 'ev') count = stalls.filter((s) => (s.spotType || s.stallType || '').includes('EV')).length;
            if (tab.id === 'visitor') count = stalls.filter((s) => (s.spotType || s.stallType || '').includes('Visitor')).length;

            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center space-y-3">
            <Car className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">No parking stalls match the selected filter.</p>
            <Button size="sm" variant="secondary" onClick={() => { setSearchTerm(''); setActiveTab('all'); }}>
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW - Visual, Intuitive Parking Slots */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {filtered.map((s) => {
            const isAssigned = Boolean(s.assignedResident || s.assignedTenantId);
            const spotType = s.spotType || s.stallType || '';
            const isEv = spotType.includes('EV');
            const isVisitor = spotType.includes('Visitor');
            const isHandicap = spotType.includes('Handicap');

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between p-4 space-y-3.5 shadow-xs hover:shadow-md ${
                  isAssigned
                    ? 'border-gray-200/90 hover:border-indigo-300'
                    : 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20 hover:border-emerald-300'
                }`}
              >
                {/* Stall Header: Spot #, Badges, Delete Button */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold border ${
                          isEv
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : isVisitor
                            ? 'bg-purple-50 text-purple-600 border-purple-200'
                            : isHandicap
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}
                      >
                        {isEv ? (
                          <Zap className="w-4 h-4" />
                        ) : isVisitor ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <Car className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-base tracking-tight">{s.spotNumber}</h3>
                        <p className="text-[11px] text-gray-500 font-medium leading-none mt-0.5">{s.spotType}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isAssigned
                            ? isVisitor
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isAssigned ? (isVisitor ? 'Visitor' : 'Assigned') : 'Available'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setStallToDelete(s);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1 rounded-md text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Stall"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Location & Building subtitle */}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2 font-medium">
                    <span className="truncate">🏢 {s.propertyName || 'Sunrise Residency'}</span>
                    <span>·</span>
                    <span className="truncate">📍 {s.lotLocation}</span>
                  </div>

                  {/* Stall Content: Vacant vs Occupied */}
                  {isAssigned ? (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Resident</span>
                        <div className="flex items-center justify-between">
                          <strong className="text-gray-900">{s.assignedResident}</strong>
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Unit {s.unitNumber}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-gray-200/70">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Vehicle</span>
                        <p className="text-gray-800 font-medium truncate">{s.vehicle}</p>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700 font-bold">
                            {s.licensePlate}
                          </span>
                          <span className="text-gray-500 font-mono text-[10px]">{s.permitTag}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-4 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200 text-center space-y-1">
                      <p className="text-xs font-bold text-emerald-800">Spot is Vacant</p>
                      <p className="text-[11px] text-emerald-600">Ready to assign to a resident vehicle or visitor pass</p>
                    </div>
                  )}

                  {/* Fee Row */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-500 font-medium">Monthly Charge</span>
                    <strong className="text-gray-900 font-black">
                      {s.monthlyFee > 0 ? `${formatUsd(s.monthlyFee)}/mo` : 'Free / Included'}
                    </strong>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-gray-100">
                  {isAssigned ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        className="flex-1"
                        variant="secondary"
                        onClick={() => handleOpenAssign(s)}
                      >
                        Reassign
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setStallToRelease(s);
                          setIsReleaseOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Vacate
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      icon={Plus}
                      onClick={() => handleOpenAssign(s)}
                    >
                      Assign Stall
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW - Clean, spacious, and readable */
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-5">Stall / Spot #</th>
                  <th className="py-3.5 px-4">Location &amp; Type</th>
                  <th className="py-3.5 px-4">Resident &amp; Unit</th>
                  <th className="py-3.5 px-4">Vehicle &amp; License Plate</th>
                  <th className="py-3.5 px-4">Permit</th>
                  <th className="py-3.5 px-4">Monthly Fee</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((s) => {
                  const isAssigned = Boolean(s.assignedResident);
                  const isEv = s.spotType.includes('EV');

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Stall # */}
                      <td className="py-3.5 px-5 font-bold text-gray-900">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold border ${
                              isEv
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}
                          >
                            {isEv ? <Zap className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                          </div>
                          <span className="text-sm font-black text-gray-900">{s.spotNumber}</span>
                        </div>
                      </td>

                      {/* Location & Type */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-800">{s.spotType}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{s.propertyName || 'Sunrise Residency'} · {s.lotLocation}</p>
                      </td>

                      {/* Resident & Unit */}
                      <td className="py-3.5 px-4">
                        {isAssigned ? (
                          <div>
                            <p className="font-bold text-gray-900">{s.assignedResident}</p>
                            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Unit {s.unitNumber}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Vehicle & Plate */}
                      <td className="py-3.5 px-4">
                        {isAssigned ? (
                          <div>
                            <p className="font-semibold text-gray-800">{s.vehicle}</p>
                            <p className="text-[11px] text-gray-500 font-mono mt-0.5">{s.licensePlate}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Permit */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px]">
                          {s.permitTag}
                        </span>
                      </td>

                      {/* Monthly Fee */}
                      <td className="py-3.5 px-4 font-bold text-gray-900 text-sm">
                        {s.monthlyFee > 0 ? formatUsd(s.monthlyFee) : 'Free / Included'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isAssigned
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isAssigned ? 'Assigned' : 'Available'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant={isAssigned ? 'secondary' : 'primary'}
                            onClick={() => handleOpenAssign(s)}
                          >
                            {isAssigned ? 'Reassign' : 'Assign'}
                          </Button>
                          {isAssigned && (
                            <button
                              type="button"
                              onClick={() => {
                                setStallToRelease(s);
                                setIsReleaseOpen(true);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              Vacate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setStallToDelete(s);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Stall"
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
      {/* 1. ASSIGN / REASSIGN STALL MODAL               */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Assign Parking Stall · ${selectedStall?.spotNumber || ''}`}
        size="md"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleAssignSubmit}>
              Confirm Assignment
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-indigo-950">Spot: {selectedStall?.spotNumber}</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {selectedStall?.spotType}
              </span>
            </div>
            <p className="text-indigo-800 text-[11px]">Location: {selectedStall?.lotLocation}</p>
          </div>

          {/* Building / Property & Resident / Tenant Cascading Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Building / Property *"
              required
              value={form.propertyName}
              options={[
                { value: '', label: 'Select Property...' },
                ...propertyOptions.map((p) => ({ value: p.name, label: p.name })),
              ]}
              onChange={(e) => handlePropertyChange(e.target.value)}
            />
            <Select
              label="Resident / Tenant *"
              required
              value={form.isManualResident ? '__manual__' : (form.tenantId || form.assignedResident || '')}
              options={[
                { value: '', label: 'Select Resident / Tenant...' },
                ...buildingTenants.map((t) => ({
                  value: String(t.id || t.name),
                  label: `${t.name} (Unit ${t.unitNumber || t.unit?.unitNumber || 'N/A'})`,
                })),
                ...(buildingTenants.length === 0 ? [{ value: '__none__', label: 'No residents in this property' }] : []),
                { value: '__manual__', label: '+ Enter Custom / Non-Resident Manually' },
              ]}
              onChange={(e) => handleTenantChange(e.target.value)}
            />
          </div>

          {/* If a registered resident is selected, show an auto-filled confirmation pill */}
          {!form.isManualResident && form.assignedResident && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Resident: <strong className="font-semibold text-emerald-950">{form.assignedResident}</strong>
                  {form.unitNumber && (
                    <> · Auto-filled Unit: <strong className="font-semibold text-emerald-950">{form.unitNumber}</strong></>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isManualResident: true }))}
                className="text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
              >
                Edit name/unit
              </button>
            </div>
          )}

          {/* If manual mode, show editable Resident Name and Unit Number inputs */}
          {form.isManualResident && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Assigned Resident Name *"
                required
                placeholder="e.g. Jordan Hayes"
                value={form.assignedResident}
                onChange={(e) => setForm({ ...form, assignedResident: e.target.value })}
              />
              <Input
                label="Unit Number *"
                required
                placeholder="e.g. Unit 2A"
                value={form.unitNumber}
                onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
              />
            </div>
          )}

          {/* If resident from dropdown is selected, show Unit Number input (editable) */}
          {!form.isManualResident && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Assigned Resident"
                placeholder="Select resident above or enter manually"
                value={form.assignedResident}
                readOnly
                className="bg-gray-50 text-gray-700"
              />
              <Input
                label="Unit Number *"
                required
                placeholder="e.g. Unit 2A"
                value={form.unitNumber}
                onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
                helperText={form.unitNumber ? "Auto-filled from tenant record" : undefined}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Vehicle (Make, Model, Color) *"
              required
              placeholder="e.g. Toyota Camry (Black)"
              value={form.vehicle}
              onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
            />
            <Input
              label="License Plate Number *"
              required
              placeholder="e.g. NY · KJH-9021"
              value={form.licensePlate}
              onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Parking Permit Tag #"
              placeholder="e.g. PRM-2026-003"
              value={form.permitTag}
              onChange={(e) => setForm({ ...form, permitTag: e.target.value })}
            />
            <Input
              label="Monthly Fee ($/mo)"
              type="number"
              placeholder="e.g. 150"
              value={form.monthlyFee}
              onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* 2. ADD NEW PARKING STALL MODAL                 */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddStallOpen}
        onClose={() => setIsAddStallOpen(false)}
        title="Add New Parking Stall"
        size="md"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddStallOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStallSubmit}>
              Create Stall
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddStallSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Spot Number *"
              required
              placeholder="e.g. P-109 or P-EV-03"
              value={addForm.spotNumber}
              onChange={(e) => setAddForm({ ...addForm, spotNumber: e.target.value })}
            />
            <Select
              label="Spot Type"
              value={addForm.spotType}
              options={['Standard Covered', 'EV Charging Level 2', 'Visitor Reserved', 'Handicap Accessible', 'Open Surface']}
              onChange={(e) => setAddForm({ ...addForm, spotType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Building / Property"
              value={addForm.propertyName}
              options={propertyOptions.map((p) => ({ value: p.name, label: p.name }))}
              onChange={(e) => setAddForm({ ...addForm, propertyName: e.target.value })}
            />
            <Input
              label="Garage / Lot Location"
              placeholder="e.g. Sub-Level 1 (North Garage)"
              value={addForm.lotLocation}
              onChange={(e) => setAddForm({ ...addForm, lotLocation: e.target.value })}
            />
          </div>

          <div>
            <Input
              label="Default Monthly Fee ($)"
              type="number"
              placeholder="e.g. 150"
              value={addForm.monthlyFee}
              onChange={(e) => setAddForm({ ...addForm, monthlyFee: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* 3. RELEASE / VACATE CONFIRMATION MODAL         */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
        title="Vacate Parking Stall"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsReleaseOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleConfirmRelease}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer"
            >
              Confirm Vacate
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-gray-700">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Vacate stall {stallToRelease?.spotNumber}?</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                This will unassign <strong>{stallToRelease?.assignedResident}</strong> (Unit {stallToRelease?.unitNumber}) and mark the spot as available.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* 4. DELETE STALL CONFIRMATION MODAL             */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Parking Stall"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDeleteStall}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Stall</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-gray-700">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to remove stall {stallToDelete?.spotNumber}?</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                This will delete the parking stall permanently from the property building layout.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
