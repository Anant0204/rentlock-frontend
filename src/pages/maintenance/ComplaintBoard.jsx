import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, AlertTriangle, Clock, CheckCircle2, Plus, Calendar, ShieldCheck, DollarSign, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import Drawer from '../../components/ui/Drawer';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import apiClient from '../../services/apiClient';
import { mockComplaints } from '../../data/mockExtra';
import { getVendors, saveVendors } from '../../data/mockOperations';
import { getProperties } from '../../data/mockProperties';
import { getAdminPortalState, updateAdminPortalState } from '../../data/adminPortalStore';
import { MAINTENANCE_PIPELINE_STAGES } from '../../utils/constants';
import { formatUsd, formatDate } from '../../utils/formatters';
import { isDemoMode } from '../../data/appDataReset';

export default function ComplaintBoard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [workOrders, setWorkOrders] = useState(() => {
    const saved = localStorage.getItem('custom_work_orders_us');
    if (saved) {
      try { return JSON.parse(saved); } catch { return isDemoMode() ? mockComplaints : []; }
    }
    return isDemoMode() ? mockComplaints : [];
  });
  const [portalState, setPortalState] = useState(() => getAdminPortalState());
  const [selectedWO, setSelectedWO] = useState(null);
  const [isNewWOOpen, setIsNewWOOpen] = useState(false);
  const [isNewPMOpen, setIsNewPMOpen] = useState(false);
  const [isCreatingWO, setIsCreatingWO] = useState(false);

  const [propertiesList, setPropertiesList] = useState(() => getProperties().filter((p) => !p.archived));
  const [vendorsList, setVendorsList] = useState(() => getVendors());

  const availableVendors = useMemo(() => {
    return vendorsList.map((v) => (typeof v === 'string' ? v : v.name)).filter(Boolean);
  }, [vendorsList]);

  const vendorSelectOptions = useMemo(() => {
    if (availableVendors.length === 0) {
      return ['Unassigned', 'Internal Maintenance Staff'];
    }
    return ['Unassigned', ...availableVendors];
  }, [availableVendors]);

  const fetchWorkOrders = async () => {
    let localWOs = [];
    try {
      localWOs = JSON.parse(localStorage.getItem('custom_work_orders_us') || '[]');
    } catch {}

    try {
      const res = await apiClient.get('/maintenance?limit=100');
      const items = res?.items || res;
      if (Array.isArray(items)) {
        const liveIds = new Set(items.map((i) => String(i.ticketNumber || i.id)));
        const combined = [...items, ...localWOs.filter((l) => !liveIds.has(String(l.ticketNumber || l.id)))];
        const seen = new Set();
        const deduped = combined.filter((w) => {
          const key = ((w.description || w.title || '').trim()).toLowerCase();
          if (key.length > 5) {
            if (seen.has(key)) return false;
            seen.add(key);
          }
          return true;
        });
        setWorkOrders(deduped);
        localStorage.setItem('custom_work_orders_us', JSON.stringify(deduped));
      } else if (localWOs.length > 0) {
        setWorkOrders(localWOs);
      }
    } catch {
      if (localWOs.length > 0) setWorkOrders(localWOs);
    }
  };

  useEffect(() => {
    fetchWorkOrders();

    const handleWOChange = () => fetchWorkOrders();
    window.addEventListener('rentlock_work_orders_changed', handleWOChange);
    window.addEventListener('storage', handleWOChange);

    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setPropertiesList(items.filter((p) => !p.archived));
      }
    }).catch(() => {});

    const loadVendors = () => {
      apiClient.get('/operations/vendors').then((res) => {
        const items = res?.items || res;
        if (Array.isArray(items)) {
          setVendorsList(items);
          saveVendors(items);
        }
      }).catch(() => {});
    };

    loadVendors();
    window.addEventListener('rentlock_vendors_changed', loadVendors);

    return () => {
      window.removeEventListener('rentlock_work_orders_changed', handleWOChange);
      window.removeEventListener('storage', handleWOChange);
      window.removeEventListener('rentlock_vendors_changed', loadVendors);
    };
  }, []);

  const managerCap = portalState.settings?.managerApprovalCap || 1000;

  const [newWO, setNewWO] = useState({
    title: '',
    category: 'Plumbing',
    priority: 'Normal',
    propertyName: propertiesList[0]?.name || 'Sunrise Residency',
    unit: 'A-204',
    tenant: 'Rebecca Miller',
    assignedTo: 'Unassigned',
    estimatedCost: '450',
    scheduledWindow: '11/14/2026 · 10:00 AM',
  });

  // Keep newWO property in sync when properties load
  useEffect(() => {
    if (propertiesList.length > 0 && !propertiesList.some(p => p.name === newWO.propertyName)) {
      setNewWO(prev => ({ ...prev, propertyName: propertiesList[0].name }));
    }
  }, [propertiesList]);

  const [newPM, setNewPM] = useState({
    title: '',
    propertyName: propertiesList[0]?.name || 'Sunrise Residency',
    assignee: 'Unassigned',
    scheduleMode: 'Fixed Calendar Dates',
    frequency: 'Quarterly',
    nextDueDate: '2026-12-15',
    costCap: '600',
  });

  const persistWOs = (nextList) => {
    setWorkOrders(nextList);
    localStorage.setItem('custom_work_orders_us', JSON.stringify(nextList));
  };

  const stats = useMemo(() => {
    const open = workOrders.filter((w) => w.status !== 'Closed').length;
    const urgent = workOrders.filter((w) => w.priority === 'Urgent' || w.priority === 'High').length;
    const aboveCap = workOrders.filter((w) => (Number(w.estimatedCost) || 0) > managerCap && !w.adminApproved).length;
    const closed = workOrders.filter((w) => w.status === 'Closed').length;
    return { open, urgent, aboveCap, closed };
  }, [workOrders, managerCap]);

  const handleStageChange = (woId, nextStage) => {
    const updated = workOrders.map((w) => (w.id === woId ? { ...w, status: nextStage } : w));
    persistWOs(updated);
    if (selectedWO?.id === woId) setSelectedWO({ ...selectedWO, status: nextStage });
    toast.success(`${woId} moved to ${nextStage}.`);
  };

  const handleAdminApproveCap = (wo) => {
    const updated = workOrders.map((w) =>
      w.id === wo.id ? { ...w, adminApproved: true, status: 'Scheduled / Dispatched' } : w
    );
    persistWOs(updated);
    setSelectedWO({ ...wo, adminApproved: true, status: 'Scheduled / Dispatched' });
    updateAdminPortalState((prev) => ({
      ...prev,
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: formatDate(new Date().toISOString().slice(0, 10)),
          user: 'Robert King (Admin)',
          action: 'Approved Work Order Above Cap',
          target: `${wo.id} (${formatUsd(wo.estimatedCost)} > ${formatUsd(managerCap)})`,
          beforeAfter: 'Escalated -> Approved & Dispatched',
          reason: 'Admin spending authority approval recorded',
          effectiveDate: new Date().toISOString().slice(0, 10),
        },
        ...(prev.auditLogs || []),
      ],
    }));
    toast.success(`Admin approved ${wo.id} (${formatUsd(wo.estimatedCost)}) & dispatched ${wo.assignedTo}.`);
  };

  const handleCreateWO = async () => {
    if (!newWO.title.trim()) {
      toast.error('Work order summary is required.');
      return;
    }
    const cost = Number(newWO.estimatedCost) || 0;
    const selectedProp = propertiesList.find((p) => p.name === newWO.propertyName) || propertiesList[0];

    setIsCreatingWO(true);
    try {
      const payload = {
        propertyId: selectedProp?.id,
        propertyName: newWO.propertyName,
        unit: newWO.unit,
        unitId: selectedProp?.units?.find?.((u) => u.unitNumber === newWO.unit)?.id || null,
        title: newWO.title.trim(),
        description: newWO.title.trim(),
        category: newWO.category || 'General',
        priority: newWO.priority === 'Urgent' ? 'Emergency' : (newWO.priority === 'Normal' ? 'Medium' : newWO.priority),
        costEstimate: cost,
        estimatedCost: cost,
        assignedTo: newWO.assignedTo,
        tenant: newWO.tenant || 'Rebecca Miller',
      };

      const res = await apiClient.post('/maintenance', payload);
      const createdItem = res?.data || res;

      const nextWO = {
        id: createdItem?.ticketNumber || createdItem?.id || `WO-${320 + workOrders.length}`,
        dbId: createdItem?.dbId || createdItem?.id,
        ticketNumber: createdItem?.ticketNumber,
        title: newWO.title.trim(),
        category: newWO.category,
        priority: newWO.priority,
        propertyName: newWO.propertyName,
        unit: newWO.unit,
        tenant: newWO.tenant,
        assignedTo: newWO.assignedTo,
        estimatedCost: cost,
        scheduledWindow: newWO.scheduledWindow,
        adminApproved: cost <= managerCap,
        status: cost > managerCap ? 'Reviewed & Prioritized' : 'New',
        date: new Date().toISOString().slice(0, 10),
        ...createdItem,
      };

      persistWOs([nextWO, ...workOrders.filter((w) => w.id !== nextWO.id && w.ticketNumber !== nextWO.ticketNumber)]);
      setIsNewWOOpen(false);
      setNewWO((prev) => ({ ...prev, title: '' }));
      toast.success(`Created ${nextWO.id || nextWO.ticketNumber}.${cost > managerCap ? ' Escalated for Admin cap approval.' : ''}`);

      fetchWorkOrders();
    } catch (err) {
      console.warn('Backend API create ticket failed, falling back to local:', err?.message);
      const created = {
        id: `WO-${320 + workOrders.length}`,
        title: newWO.title.trim(),
        category: newWO.category,
        priority: newWO.priority,
        propertyName: newWO.propertyName,
        unit: newWO.unit,
        tenant: newWO.tenant,
        assignedTo: newWO.assignedTo,
        estimatedCost: cost,
        scheduledWindow: newWO.scheduledWindow,
        adminApproved: cost <= managerCap,
        status: cost > managerCap ? 'Reviewed & Prioritized' : 'New',
        date: new Date().toISOString().slice(0, 10),
      };
      persistWOs([created, ...workOrders]);
      setIsNewWOOpen(false);
      setNewWO((prev) => ({ ...prev, title: '' }));
      toast.success(`Created ${created.id}.${cost > managerCap ? ' Escalated for Admin cap approval.' : ''}`);
    } finally {
      setIsCreatingWO(false);
    }
  };

  const handleCreatePM = () => {
    if (!newPM.title.trim()) {
      toast.error('Preventive schedule title is required.');
      return;
    }
    const created = {
      id: `PM-0${(portalState.preventiveSchedules?.length || 3) + 1}`,
      ...newPM,
      costCap: Number(newPM.costCap) || 500,
      reminders: [30, 7],
      status: 'Scheduled',
    };
    const next = updateAdminPortalState((prev) => ({
      ...prev,
      preventiveSchedules: [created, ...(prev.preventiveSchedules || [])],
    }));
    setPortalState(next);
    setIsNewPMOpen(false);
    setNewPM({ ...newPM, title: '' });
    toast.success(`Preventive schedule ${created.id} created.`);
  };

  const woColumns = [
    { key: 'id', label: 'WO #', render: (_, row) => <span className="font-bold text-indigo-700">{row.id}</span> },
    {
      key: 'propertyName',
      label: 'Property / Location',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.propertyName}</p>
          <p className="text-xs text-gray-500">Unit {row.unit} · {row.tenant}</p>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Summary & Trade',
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-800">{row.title}</p>
          <p className="text-xs text-gray-500">{row.category}</p>
        </div>
      ),
    },
    { key: 'priority', label: 'Priority', render: (_, row) => <Badge status={row.priority} /> },
    { key: 'assignedTo', label: 'Assigned', render: (_, row) => <span className="text-xs font-medium text-gray-700">{row.assignedTo}</span> },
    {
      key: 'estimatedCost',
      label: 'Estimate / Cap',
      render: (_, row) => {
        const over = (Number(row.estimatedCost) || 0) > managerCap && !row.adminApproved;
        return (
          <div>
            <span className={`font-bold ${over ? 'text-rose-600' : 'text-gray-900'}`}>{formatUsd(row.estimatedCost || 0)}</span>
            {over && <p className="text-[10px] font-bold text-rose-600">Needs Admin Approval</p>}
          </div>
        );
      },
    },
    { key: 'status', label: 'Pipeline Stage', render: (_, row) => <Badge status={row.status} /> },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Maintenance & Work Orders"
        subtitle={`6-stage U.S. repair pipeline, preventive maintenance calendar, and $${managerCap.toLocaleString()} Manager Approval Cap enforcement.`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Maintenance' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Calendar} onClick={() => setIsNewPMOpen(true)}>
              Schedule Preventive
            </Button>
            <Button icon={Plus} onClick={() => setIsNewWOOpen(true)}>
              Create Work Order
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Open Work Orders" value={stats.open} subtitle="Active tickets across portfolio" icon={Wrench} color="blue" />
        <StatCard title="Urgent / High Priority" value={stats.urgent} subtitle="Priority dispatch SLA" icon={AlertTriangle} color="red" />
        <StatCard title="Awaiting Cap Approval" value={stats.aboveCap} subtitle={`Exceeds ${formatUsd(managerCap)} manager cap`} icon={DollarSign} color="amber" />
        <StatCard title="Closed Tickets" value={stats.closed} subtitle="Verified & expense-linked" icon={CheckCircle2} color="green" />
      </div>

      <Card className="p-6 space-y-5">
        <Tabs
          tabs={[
            { id: 'pipeline', label: 'Tenant Requests Pipeline' },
            { id: 'orders', label: `Unified Work Orders (${workOrders.length})` },
            { id: 'preventive', label: `Preventive Schedules (${(portalState.preventiveSchedules || []).length})` },
            { id: 'vendors', label: `Approved Vendors (${vendorsList.length})` },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-9 overflow-x-auto pb-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 min-w-[820px]">
                {MAINTENANCE_PIPELINE_STAGES.map((stage) => {
                  const stageItems = workOrders.filter((w) => w.status === stage);
                  return (
                    <div key={stage} className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 min-h-[300px]">
                      <div className="flex items-center justify-between gap-1 border-b border-gray-200 pb-2">
                        <p className="text-[11px] font-bold text-gray-800 leading-tight">{stage}</p>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-100">
                          {stageItems.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {stageItems.map((wo) => {
                          const overCap = (Number(wo.estimatedCost) || 0) > managerCap && !wo.adminApproved;
                          return (
                            <div
                              key={wo.id}
                              onClick={() => setSelectedWO(wo)}
                              className="p-3 rounded-xl bg-white border border-gray-200 hover:border-indigo-400 cursor-pointer shadow-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-black text-indigo-700">{wo.id}</span>
                                <Badge status={wo.priority} />
                              </div>
                              <p className="text-xs font-bold text-gray-900 leading-snug">{wo.title}</p>
                              <p className="text-[11px] text-gray-500">{wo.propertyName} · {wo.unit}</p>
                              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px]">
                                <span className="text-gray-500 truncate max-w-[90px]">{wo.assignedTo}</span>
                                <span className={`font-bold ${overCap ? 'text-rose-600' : 'text-gray-800'}`}>
                                  {formatUsd(wo.estimatedCost || 0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Sidebar: Preventive Maintenance Due */}
            <div className="xl:col-span-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" /> Preventive Due
                </h4>
                <button onClick={() => setIsNewPMOpen(true)} className="text-[11px] font-bold text-indigo-700 hover:underline">
                  + Add
                </button>
              </div>
              {(portalState.preventiveSchedules || []).map((pm) => (
                <div key={pm.id} className="p-3 rounded-xl bg-white border border-indigo-100 text-xs space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-gray-900">{pm.title}</p>
                    <Badge status={pm.status === 'Due Soon' ? 'Expiring Soon' : pm.status} />
                  </div>
                  <p className="text-[11px] text-gray-500">{pm.propertyName} · {pm.scheduleMode}</p>
                  <p className="text-[11px] font-semibold text-indigo-700">Due {formatDate(pm.nextDueDate)} · Cap {formatUsd(pm.costCap)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <Table columns={woColumns} data={workOrders} onRowClick={(row) => setSelectedWO(row)} />
        )}

        {activeTab === 'preventive' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(portalState.preventiveSchedules || []).map((pm) => (
              <div key={pm.id} className="p-4 rounded-2xl border border-gray-200 space-y-2 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-indigo-700">{pm.id} · {pm.frequency}</span>
                  <Badge status={pm.status} />
                </div>
                <h4 className="font-bold text-sm text-gray-900">{pm.title}</h4>
                <p className="text-xs text-gray-600">{pm.propertyName} · Vendor: {pm.assignee}</p>
                <p className="text-xs text-gray-500">Mode: <strong>{pm.scheduleMode}</strong></p>
                <p className="text-xs font-bold text-indigo-700">Next Due: {formatDate(pm.nextDueDate)} · Cap {formatUsd(pm.costCap)}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vendors' && (
          <div>
            {vendorsList.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Store className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">No Approved Vendors Available</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  There are no active vendors in your database. Add contractors and service providers in Vendors &amp; Payees to assign them to maintenance work orders.
                </p>
                <Button size="sm" onClick={() => navigate('/vendors')}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Vendor in Vendors &amp; Payees
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendorsList.map((v, idx) => {
                  const vName = v.name || 'Contractor';
                  const vCat = v.category || 'General Maintenance';
                  const isCOI = v.coiVerified || v.coiStatus === 'Valid';
                  const isW9 = v.w9OnFile !== false;
                  const isActive = v.isActive !== false && v.status !== 'Inactive';
                  return (
                    <div key={v.id || idx} className="p-4 rounded-2xl border border-gray-200 space-y-2 text-xs bg-white shadow-xs hover:border-gray-300 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-900">{vName}</span>
                        <Badge status={isActive ? 'Active' : 'Inactive'} />
                      </div>
                      <p className="text-gray-500 font-medium">{vCat} · Service Partner</p>
                      {v.phone && (
                        <p className="text-gray-400 text-[11px] flex items-center gap-1">
                          <span>{v.phone}</span>
                          {v.email && <span>· {v.email}</span>}
                        </p>
                      )}
                      <div className="pt-2 border-t border-gray-100 flex items-center gap-3 text-gray-600 text-[11px]">
                        <span>W-9: <strong className={isW9 ? 'text-emerald-600' : 'text-amber-600'}>{isW9 ? 'Verified' : 'Pending'}</strong></span>
                        <span>·</span>
                        <span>COI: <strong className={isCOI ? 'text-emerald-600' : 'text-amber-600'}>{isCOI ? 'Valid' : 'Pending'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Work Order Detail Drawer */}
      <Drawer
        isOpen={!!selectedWO}
        onClose={() => setSelectedWO(null)}
        title={selectedWO ? `${selectedWO.id} · ${selectedWO.title}` : 'Work Order'}
      >
        {selectedWO && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2">
              <div className="flex justify-between items-center">
                <Badge status={selectedWO.priority} />
                <Badge status={selectedWO.status} />
              </div>
              <p className="font-bold text-base text-gray-900 pt-1">{selectedWO.title}</p>
              <p className="text-gray-600">
                {selectedWO.propertyName} · Unit {selectedWO.unit || selectedWO.unitNumber} · Resident: {selectedWO.tenant || selectedWO.tenantName}
              </p>
              {selectedWO.description && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="font-bold text-gray-700">Problem Description:</p>
                  <p className="text-gray-800 whitespace-pre-wrap mt-0.5">{selectedWO.description}</p>
                </div>
              )}
              {Array.isArray(selectedWO.photos) && selectedWO.photos.length > 0 && (
                <div className="pt-2">
                  <p className="font-bold text-gray-700 mb-1.5">Attached Photos:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedWO.photos.map((p, idx) => (
                      <img key={idx} src={p.url || p} alt="Proof" className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div><p className="text-gray-400">Assigned Vendor/Tech</p><p className="font-bold text-gray-900">{selectedWO.assignedTo}</p></div>
                <div><p className="text-gray-400">Estimated Cost</p><p className="font-black text-indigo-700 text-sm">{formatUsd(selectedWO.estimatedCost || 0)}</p></div>
              </div>
            </div>

            {(Number(selectedWO.estimatedCost) || 0) > managerCap && !selectedWO.adminApproved && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5 text-amber-950">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> Exceeds {formatUsd(managerCap)} Manager Spending Cap
                </p>
                <p>Admin approval is required before vendor dispatch and completion billing.</p>
                <Button size="sm" onClick={() => handleAdminApproveCap(selectedWO)}>
                  Approve Above-Cap Estimate & Dispatch
                </Button>
              </div>
            )}

            <Select
              label="Move Pipeline Stage"
              value={selectedWO.status}
              options={MAINTENANCE_PIPELINE_STAGES}
              onChange={(e) => handleStageChange(selectedWO.id, e.target.value)}
            />
          </div>
        )}
      </Drawer>

      {/* Create Work Order Modal */}
      <Modal
        isOpen={isNewWOOpen}
        onClose={() => setIsNewWOOpen(false)}
        title="Create Work Order"
        size="md"
        bodyClassName="overflow-visible"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNewWOOpen(false)} disabled={isCreatingWO}>Cancel</Button>
            <Button onClick={handleCreateWO} disabled={isCreatingWO}>
              {isCreatingWO ? 'Creating Ticket...' : 'Create Ticket'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Issue Summary *" placeholder="e.g. Replace leaking shutoff valve" value={newWO.title} onChange={(e) => setNewWO({ ...newWO, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Property"
              value={newWO.propertyName}
              options={propertiesList.map((p) => p.name)}
              onChange={(e) => setNewWO({ ...newWO, propertyName: e.target.value })}
            />
            <Input label="Unit / Area" value={newWO.unit} onChange={(e) => setNewWO({ ...newWO, unit: e.target.value })} />
            <Select
              label="Trade Category"
              value={newWO.category}
              options={['Plumbing', 'HVAC', 'Electrical', 'Locksmith', 'General Repair', 'Appliances', 'Roofing', 'Painting']}
              onChange={(e) => setNewWO({ ...newWO, category: e.target.value })}
            />
            <Select
              label="Priority"
              value={newWO.priority}
              options={['Normal', 'High', 'Urgent', 'Low']}
              onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })}
            />
            <Select
              label="Assign Vendor"
              value={newWO.assignedTo}
              options={vendorSelectOptions}
              direction="up"
              onChange={(e) => setNewWO({ ...newWO, assignedTo: e.target.value })}
            />
            <Input label={`Estimate USD (Cap ${formatUsd(managerCap)})`} type="number" value={newWO.estimatedCost} onChange={(e) => setNewWO({ ...newWO, estimatedCost: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Schedule Preventive Modal */}
      <Modal
        isOpen={isNewPMOpen}
        onClose={() => setIsNewPMOpen(false)}
        title="Schedule Preventive Maintenance"
        size="md"
        bodyClassName="overflow-visible"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNewPMOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePM}>Save Schedule</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Task Title *" placeholder="e.g. Spring Roof Drain Inspection" value={newPM.title} onChange={(e) => setNewPM({ ...newPM, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Property"
              value={newPM.propertyName}
              options={propertiesList.map((p) => p.name)}
              onChange={(e) => setNewPM({ ...newPM, propertyName: e.target.value })}
            />
            <Select
              label="Vendor / Assignee"
              value={newPM.assignee}
              options={vendorSelectOptions}
              onChange={(e) => setNewPM({ ...newPM, assignee: e.target.value })}
            />
            <Select label="Recurrence Mode" value={newPM.scheduleMode} options={['Fixed Calendar Dates', 'After Completion']} onChange={(e) => setNewPM({ ...newPM, scheduleMode: e.target.value })} />
            <Select
              label="Frequency"
              value={newPM.frequency}
              options={['Monthly', 'Quarterly', 'Semi-Annual', 'Annual']}
              direction="up"
              onChange={(e) => setNewPM({ ...newPM, frequency: e.target.value })}
            />
            <Input label="Next Due Date" type="date" value={newPM.nextDueDate} onChange={(e) => setNewPM({ ...newPM, nextDueDate: e.target.value })} />
            <Input label="Cost Cap (USD)" type="number" value={newPM.costCap} onChange={(e) => setNewPM({ ...newPM, costCap: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
