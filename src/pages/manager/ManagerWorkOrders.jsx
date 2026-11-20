import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Wrench, AlertCircle, ShieldAlert, CalendarClock, Plus,
  MessageSquare, CheckCircle2, Upload, FileText, ArrowLeft, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import CreateWorkOrderModal from '../../components/manager/CreateWorkOrderModal';
import {
  getManagerWorkspaceState,
  getManagerOpenWorkOrders,
  matchesPropertyFilter,
  requestWorkOrderApproval,
  completeManagerWorkOrder,
  formatActionTimestamp,
  MANAGER_APPROVAL_LIMIT,
} from '../../data/managerWorkspaceData';
import { formatUsd } from '../../utils/formatters';
import { readFilesAsDataUrls } from '../../data/tenantPortalData';

export default function ManagerWorkOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const woParam = searchParams.get('wo');
  const completeParam = searchParams.get('complete');

  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [selectedId, setSelectedId] = useState(woParam || '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailWO, setDetailWO] = useState(null);

  const fetchLiveWorkOrders = useCallback(async () => {
    try {
      const res = await apiClient.get('/maintenance?limit=100');
      const liveTickets = res?.items || res;
      if (Array.isArray(liveTickets) && liveTickets.length > 0) {
        const local = getManagerWorkspaceState();
        const allowedPropIds = new Set();
        local.properties.forEach((p) => {
          if (p.id) {
            allowedPropIds.add(String(p.id).toLowerCase());
            allowedPropIds.add(String(p.id).toLowerCase().replace(/^prop-/, ''));
          }
          if (p.originalId) allowedPropIds.add(String(p.originalId).toLowerCase());
          if (p.numericId) allowedPropIds.add(String(p.numericId).toLowerCase());
        });
        const allowedPropNames = new Set(
          local.properties.map((p) => (p.name || '').trim().toLowerCase()).filter(Boolean)
        );
        const singlePropName = local.properties.length === 1 ? (local.properties[0].name || '').trim().toLowerCase() : null;

        const scopedTickets = liveTickets.filter((t) => {
          const tPropId = String(t.propertyId || '').toLowerCase();
          const tPropName = (t.propertyName || '').trim().toLowerCase();
          return (
            allowedPropIds.has(tPropId) ||
            allowedPropNames.has(tPropName) ||
            (singlePropName && (!tPropName || tPropName === 'main property' || tPropName === singlePropName))
          );
        });

        if (scopedTickets.length > 0) {
          const liveMapped = scopedTickets.map((t) => ({
            id: String(t.ticketNumber || t.id),
            title: t.title || t.issue || 'Repair Request',
            description: t.description || 'Maintenance issue logged in resident portal',
            category: t.category || 'General',
            propertyId: String(t.propertyId || (local.properties[0]?.id || '')),
            propertyName: t.propertyName && t.propertyName !== 'Main Property' ? t.propertyName : (local.properties[0]?.name || 'HELLO PROPERTY'),
            unitNumber: t.unitNumber || t.unit || 'T2',
            unit: t.unitNumber || t.unit || 'T2',
            residentName: t.tenantName || t.tenant || 'Jonny',
            tenantName: t.tenantName || t.tenant || 'Jonny',
            residentPhone: t.tenantPhone || '+1 (347) 555-0118',
            priority: t.priority === 'High' || t.priority === 'Emergency' || t.priority === 'Urgent' ? 'Urgent' : 'Normal',
            status: t.status === 'In_Progress' || t.status === 'In Progress' ? 'In progress' : t.status === 'Pending_Approval' || t.status === 'Approval needed' ? 'Approval needed' : t.status === 'Closed' ? 'Closed' : 'Open',
            estimatedCost: Number(t.costEstimate || t.cost || t.estimatedCost || 0),
            createdAt: t.createdAt ? t.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            scheduledToday: true,
            timeline: [
              { label: 'Logged via RentLock resident portal', time: 'Recently' },
              { label: 'Assigned to maintenance queue', time: 'Recently' },
            ],
          }));

          // Persist in localStorage so getManagerWorkspaceState() permanently preserves it
          try {
            localStorage.setItem('rentlock_live_work_orders', JSON.stringify(liveMapped));
          } catch {}

          setState((prev) => ({
            ...prev,
            properties: local.properties.length > 0 ? local.properties : prev.properties,
            workOrders: liveMapped,
          }));
          return;
        }
      }
    } catch {}

    // Fallback: sync from local state without wiping existing work orders if local has none
    const local = getManagerWorkspaceState();
    setState((prev) => {
      const hasLocalWOs = Array.isArray(local.workOrders) && local.workOrders.length > 0;
      const hasPrevWOs = Array.isArray(prev.workOrders) && prev.workOrders.length > 0;
      return {
        ...local,
        workOrders: hasLocalWOs ? local.workOrders : hasPrevWOs ? prev.workOrders : [],
      };
    });
  }, []);

  useEffect(() => {
    fetchLiveWorkOrders();
    window.addEventListener('focus', fetchLiveWorkOrders);
    window.addEventListener('storage', fetchLiveWorkOrders);
    window.addEventListener('rentlock_work_orders_changed', fetchLiveWorkOrders);

    return () => {
      window.removeEventListener('focus', fetchLiveWorkOrders);
      window.removeEventListener('storage', fetchLiveWorkOrders);
      window.removeEventListener('rentlock_work_orders_changed', fetchLiveWorkOrders);
    };
  }, [fetchLiveWorkOrders]);

  // When woParam is in URL, auto-select and open
  useEffect(() => {
    if (woParam && state.workOrders.length > 0) {
      setSelectedId(woParam);
      const target = state.workOrders.find((w) => w.id === woParam);
      if (target && !detailWO) {
        setDetailWO(target);
      }
    }
  }, [woParam, state.workOrders]);

  // Closeout view state
  const [completingWOId, setCompletingWOId] = useState(
    completeParam === '1' && woParam ? woParam : null
  );
  const [closeForm, setCloseForm] = useState({
    workPerformed: '',
    completedOn: '',
    vendorName: '',
    finalCost: '',
    invoiceNumber: '',
    newFiles: [],
  });

  const openOrders = useMemo(
    () => getManagerOpenWorkOrders(state, propertyFilter),
    [state, propertyFilter]
  );

  const stats = useMemo(() => {
    const urgent = openOrders.filter((w) => w.priority === 'Urgent').length;
    const awaitingApproval = openOrders.filter(
      (w) => w.status === 'Approval needed' || w.status === 'Approval pending'
    ).length;
    const visitsToday = openOrders.filter((w) => w.scheduledToday).length;
    return {
      open: openOrders.length,
      urgent,
      awaitingApproval,
      visitsToday,
    };
  }, [openOrders]);

  const filteredQueue = useMemo(() => {
    return (state.workOrders || []).filter((w) => {
      if (statusFilter === 'Closed') return w.status === 'Closed';
      if (!statusFilter && w.status === 'Closed') return false;
      const matchesStatus = !statusFilter || w.status === statusFilter;
      const matchesPriority = !priorityFilter || w.priority === priorityFilter;
      const matchesProp = matchesPropertyFilter(w, propertyFilter, state.properties);
      return matchesStatus && matchesPriority && matchesProp;
    });
  }, [state.workOrders, statusFilter, priorityFilter, propertyFilter, state.properties]);

  const selectedWO = useMemo(() => {
    const targetId = woParam || selectedId;
    return (
      filteredQueue.find((w) => w.id === targetId) ||
      state.workOrders.find((w) => w.id === targetId) ||
      filteredQueue[0] ||
      null
    );
  }, [filteredQueue, state.workOrders, woParam, selectedId]);

  const completingWO = useMemo(() => {
    const id = completingWOId || (completeParam === '1' ? woParam : null);
    return id ? state.workOrders.find((w) => w.id === id) || null : null;
  }, [completingWOId, completeParam, woParam, state.workOrders]);

  const openCloseoutMode = (wo) => {
    setDetailWO(null);
    setCloseForm({
      workPerformed: wo.workPerformed || '',
      completedOn: wo.completedOn || formatActionTimestamp(),
      vendorName: wo.vendorName || wo.assignee || '',
      finalCost: wo.finalCost || (wo.estimateAmount ? String(wo.estimateAmount) : ''),
      invoiceNumber: wo.invoiceNumber || '',
      newFiles: [],
    });
    setCompletingWOId(wo.id);
    setSearchParams({ wo: wo.id, complete: '1' });
  };

  const exitCloseoutMode = () => {
    setCompletingWOId(null);
    if (selectedWO) {
      setSearchParams({ wo: selectedWO.id });
    } else {
      setSearchParams({});
    }
  };

  const handleRequestApproval = (wo) => {
    const updated = requestWorkOrderApproval(wo.id);
    setState(updated);
    toast.success(`${wo.id} routed for authorized approval (time-stamped)`);
  };

  const handleCloseoutFilePick = async (e) => {
    const loaded = await readFilesAsDataUrls(e.target.files, 5);
    if (loaded.length > 0) {
      setCloseForm((prev) => ({ ...prev, newFiles: [...prev.newFiles, ...loaded] }));
      toast.success(`${loaded.length} proof file(s) staged`);
    }
    e.target.value = '';
  };

  const handleCompleteSubmit = (e) => {
    e.preventDefault();
    if (!completingWO) return;
    if (!closeForm.workPerformed.trim() || !closeForm.vendorName.trim()) {
      toast.error('Please enter work performed and vendor/staff name.');
      return;
    }
    const updated = completeManagerWorkOrder({
      workOrderId: completingWO.id,
      workPerformed: closeForm.workPerformed,
      completedOn: closeForm.completedOn,
      vendorName: closeForm.vendorName,
      finalCost: closeForm.finalCost,
      invoiceNumber: closeForm.invoiceNumber,
      newFiles: closeForm.newFiles,
    });
    setState(updated);
    setCompletingWOId(null);
    setSearchParams({});
    toast.success(`${completingWO.id} reviewed and closed (time-stamped)`);
  };

  // ==================== COMPLETE WORK ORDER SCREEN (IMAGE 6 BOTTOM) ====================
  if (completingWO) {
    const activeWorkPerformed =
      closeForm.workPerformed || completingWO.workPerformed || '';
    const activeCompletedOn =
      closeForm.completedOn || completingWO.completedOn || formatActionTimestamp();
    const activeVendor =
      closeForm.vendorName || completingWO.vendorName || '';
    const activeFinalCost =
      closeForm.finalCost || completingWO.finalCost || '';
    const activeInvoice =
      closeForm.invoiceNumber || completingWO.invoiceNumber || '';
    const allAttached = [...(completingWO.attachments || []), ...closeForm.newFiles];

    return (
      <div className="space-y-5 pb-8">
        <ManagerScopeBar
          breadcrumb={`RENTLOCK / ${completingWO.propertyName.toUpperCase()}`}
          properties={state.properties}
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exitCloseoutMode}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Complete Work Order · {completingWO.id}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Record what was repaired and upload proof before closing the ticket.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                WORK COMPLETE · REVIEW REQUIRED
              </Badge>
            </div>
          </div>
        </div>

        <form onSubmit={handleCompleteSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Completion Details */}
          <Card padding="p-6" className="lg:col-span-7 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Completion details</h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Work performed <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={activeWorkPerformed}
                onChange={(e) => setCloseForm((p) => ({ ...p, workPerformed: e.target.value }))}
                placeholder="Describe what was repaired and verified..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Completed on <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={activeCompletedOn}
                  onChange={(e) => setCloseForm((p) => ({ ...p, completedOn: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Vendor / staff <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={activeVendor}
                  onChange={(e) => setCloseForm((p) => ({ ...p, vendorName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Final cost
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    value={activeFinalCost}
                    onChange={(e) => setCloseForm((p) => ({ ...p, finalCost: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-3.5 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Invoice / receipt #
                </label>
                <input
                  type="text"
                  value={activeInvoice}
                  onChange={(e) => setCloseForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                  placeholder="e.g. MH-8842"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={exitCloseoutMode}>
                Back to queue
              </Button>
              <Button type="submit" variant="success" icon={CheckCircle2}>
                Approve & close work order
              </Button>
            </div>
          </Card>

          {/* Photos & Documents */}
          <Card padding="p-6" className="lg:col-span-5 space-y-5">
            <h2 className="text-base font-bold text-gray-900">Photos & documents</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleCloseoutFilePick}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center cursor-pointer hover:bg-indigo-50/60 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-900">Drop photos or files here</p>
              <p className="text-xs text-gray-500 mt-0.5">or choose from your device</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="primary" className="text-[10px]">JPG / PNG / HEIC</Badge>
                <Badge variant="success" className="text-[10px]">PDF</Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">
                Attached files ({allAttached.length})
              </p>
              <div className="space-y-2">
                {allAttached.map((file, i) => (
                  <div
                    key={file.id || i}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {file.uploadedAt || 'Just now'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  // ==================== OPEN WORK ORDERS QUEUE (IMAGE 5) ====================
  return (
    <div className="space-y-5 pb-8">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / ASSIGNED PROPERTIES"
        properties={state.properties}
        selectedPropertyId={propertyFilter}
        onSelectProperty={setPropertyFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Open Work Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Maintenance queue</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Create work order
        </Button>
      </div>

      {/* 4 KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="OPEN"
          value={stats.open}
          changeLabel="All assigned buildings"
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="URGENT"
          value={stats.urgent}
          changeLabel="Needs immediate attention"
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="AWAITING APPROVAL"
          value={stats.awaitingApproval}
          changeLabel="Above your spending limit"
          icon={ShieldAlert}
          color="amber"
        />
        <StatCard
          title="VISITS TODAY"
          value={stats.visitsToday}
          changeLabel="Vendor/staff appointments"
          icon={CalendarClock}
          color="cyan"
        />
      </div>

      {/* Split View: Open Request Queue + Selected Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Queue */}
        <Card padding="p-6" className="lg:col-span-8 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Open request queue</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Filter by building, status, priority, or assignee
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100 outline-none cursor-pointer"
            >
              <option value="">All statuses</option>
              <option value="Approval needed">Approval needed</option>
              <option value="Approval pending">Approval pending</option>
              <option value="Review closeout">Review closeout</option>
              <option value="Scheduled today">Scheduled today</option>
              <option value="Assigned">Assigned</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100 outline-none cursor-pointer"
            >
              <option value="">Priority</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 outline-none cursor-pointer"
            >
              <option value="">Property</option>
              {state.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">REQUEST</th>
                  <th className="py-3 px-4">UNIT / PROPERTY</th>
                  <th className="py-3 px-4">PRIORITY</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-gray-400">
                      No work orders match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((wo) => {
                    const isSelected = selectedWO?.id === wo.id;
                    return (
                      <tr
                        key={wo.id}
                        onClick={() => {
                          setSelectedId(wo.id);
                          setSearchParams({ wo: wo.id });
                          setDetailWO(wo);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {wo.id} · {wo.title}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          Unit {wo.unit || wo.unitNumber} · {wo.propertyName || wo.shortProperty}
                          {(wo.residentName || wo.tenantName) && (
                            <span className="block text-xs text-gray-400 font-medium">Resident: {wo.residentName || wo.tenantName}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              wo.priority === 'Urgent'
                                ? 'danger'
                                : wo.priority === 'High'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {wo.priority}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              wo.status === 'Closed'
                                ? 'success'
                                : wo.status === 'Approval needed' || wo.status === 'Review closeout'
                                  ? 'warning'
                                  : 'primary'
                            }
                          >
                            {wo.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(wo.id);
                              setSearchParams({ wo: wo.id });
                              setDetailWO(wo);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Selected Inspector */}
        <Card padding="p-6" className="lg:col-span-4 space-y-4">
          {selectedWO ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    Selected · {selectedWO.id}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Eye}
                    onClick={() => setDetailWO(selectedWO)}
                  >
                    Open
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedWO.title} · {selectedWO.openedAt || selectedWO.createdAt}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge
                    variant={
                      selectedWO.priority === 'Urgent'
                        ? 'danger'
                        : selectedWO.priority === 'High'
                          ? 'warning'
                          : 'default'
                    }
                    className="text-[10px] font-bold uppercase tracking-wider"
                  >
                    {selectedWO.priority} PRIORITY
                  </Badge>
                  <Badge
                    variant={selectedWO.status === 'Closed' ? 'success' : 'warning'}
                    className="text-[10px] font-bold uppercase tracking-wider"
                  >
                    {selectedWO.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-900">
                  {selectedWO.tenantName || selectedWO.residentName} · Unit {selectedWO.unit || selectedWO.unitNumber}
                </p>
                <p className="text-xs text-gray-500">{selectedWO.propertyName || selectedWO.shortProperty}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-700">Tenant report</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">
                  {selectedWO.report || selectedWO.description}
                </p>
              </div>

              {Array.isArray(selectedWO.photos || selectedWO.attachments) &&
                (selectedWO.photos || selectedWO.attachments).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1.5">Attached Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedWO.photos || selectedWO.attachments).map((p, idx) => (
                        <img
                          key={idx}
                          src={p.url || p}
                          alt="Photo"
                          className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <p className="text-xs font-bold text-gray-700">Vendor estimate</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {selectedWO.vendorName || 'Not assigned yet'}
                  {selectedWO.estimateAmount > 0 ? ` · ${formatUsd(selectedWO.estimateAmount)}` : ''}
                </p>
              </div>

              {selectedWO.estimateAmount > MANAGER_APPROVAL_LIMIT && (
                <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3.5 text-xs">
                  <p className="font-bold text-amber-800">
                    Above ${MANAGER_APPROVAL_LIMIT.toLocaleString()} manager approval limit
                  </p>
                  <p className="text-amber-900 mt-0.5">
                    {selectedWO.approvalRequestedAt
                      ? `Routed for approval on ${selectedWO.approvalRequestedAt}.`
                      : 'Route to authorized approver before dispatch.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {selectedWO.status === 'Approval needed' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleRequestApproval(selectedWO)}
                  >
                    Request approval
                  </Button>
                )}

                {selectedWO.status !== 'Closed' && (
                  <Button
                    variant={selectedWO.status === 'Review closeout' ? 'success' : 'secondary'}
                    size="sm"
                    onClick={() => openCloseoutMode(selectedWO)}
                  >
                    {selectedWO.status === 'Review closeout' ? 'Review closeout' : 'Complete ticket'}
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  icon={MessageSquare}
                  onClick={() => navigate(`/manager/messages?wo=${selectedWO.id}`)}
                >
                  Message tenant
                </Button>
              </div>

              <p className="text-[11px] text-gray-400">
                Keep vendor estimate, approval, dispatch, photos, and invoice attached to {selectedWO.id}.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 py-8 text-center">
              Select a work order from the queue to inspect details.
            </p>
          )}
        </Card>
      </div>

      <Card gradient padding="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          WORK ORDER WORKFLOW
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Request &gt; triage &gt; approval if required &gt; vendor dispatch &gt; appointment update &gt; completion notes/photos/invoice &gt; manager review &gt; close.
        </p>
      </Card>

      <CreateWorkOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        properties={state.properties}
        defaultPropertyId={propertyFilter}
        onCreated={(updated, newWO) => {
          setState(updated);
          setSelectedId(newWO.id);
          setSearchParams({ wo: newWO.id });
        }}
      />

      {/* Work Order Detail Modal */}
      {detailWO && (
        <Modal
          isOpen={Boolean(detailWO)}
          onClose={() => setDetailWO(null)}
          title={`Work Order · ${detailWO.id}`}
          size="lg"
          footer={
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    detailWO.priority === 'Urgent'
                      ? 'danger'
                      : detailWO.priority === 'High'
                        ? 'warning'
                        : 'default'
                  }
                  className="text-xs uppercase font-bold"
                >
                  {detailWO.priority} PRIORITY
                </Badge>
                <Badge
                  variant={detailWO.status === 'Closed' ? 'success' : 'primary'}
                  className="text-xs uppercase font-bold"
                >
                  {detailWO.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailWO(null)}
                >
                  Close
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={MessageSquare}
                  onClick={() => {
                    const id = detailWO.id;
                    setDetailWO(null);
                    navigate(`/manager/messages?wo=${id}`);
                  }}
                >
                  Message resident
                </Button>
                {detailWO.status !== 'Closed' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const target = detailWO;
                      openCloseoutMode(target);
                    }}
                  >
                    Complete Ticket
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Property & Tenant Info Banner */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 font-medium block">Property & Unit</span>
                <span className="text-gray-900 font-bold text-sm block mt-0.5">
                  {detailWO.propertyName || 'HELLO PROPERTY'} · Unit {detailWO.unit || detailWO.unitNumber || 'T2'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Resident Contact</span>
                <span className="text-gray-900 font-bold text-sm block mt-0.5">
                  {detailWO.residentName || detailWO.tenantName || 'Jonny'}
                </span>
                <span className="text-gray-500 block text-xs">
                  {detailWO.residentPhone || '+1 (347) 555-0118'}
                </span>
              </div>
            </div>

            {/* Description / Problem */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Resident Problem Report
              </h4>
              <div className="p-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {detailWO.report || detailWO.description || detailWO.title}
              </div>
            </div>

            {/* Photos if any */}
            {Array.isArray(detailWO.photos || detailWO.attachments) &&
              (detailWO.photos || detailWO.attachments).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Attached Photos ({(detailWO.photos || detailWO.attachments).length})
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {(detailWO.photos || detailWO.attachments).map((p, idx) => (
                      <a
                        key={idx}
                        href={p.url || p}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl overflow-hidden border border-gray-200 hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer"
                      >
                        <img
                          src={p.url || p}
                          alt={`Attachment ${idx + 1}`}
                          className="w-24 h-24 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Activity Timeline
              </h4>
              <div className="space-y-2 text-xs">
                {(detailWO.timeline || [
                  { label: 'Logged via RentLock resident portal', time: 'Recently' },
                  { label: 'Assigned to manager queue', time: 'Pending' },
                ]).map((tl, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50/70 border border-gray-100">
                    <span className="font-medium text-gray-700">{tl.label}</span>
                    <span className="text-gray-400 text-[11px]">{tl.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

