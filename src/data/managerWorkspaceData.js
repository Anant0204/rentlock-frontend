import apiClient from '../services/apiClient';
import { getProperties } from './mockProperties';

const MANAGER_STORAGE_KEY = 'rentlock_manager_workspace_v1';

export const MANAGER_APPROVAL_LIMIT = 1000;

export function formatActionTimestamp(date = new Date()) {
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const INITIAL_MANAGER_STATE = {
  manager: {
    name: 'Sarah Jenkins',
    roleLabel: 'Property Manager',
    spendingLimit: MANAGER_APPROVAL_LIMIT,
  },
  properties: [],
  tenants: [],
  workOrders: [],
  threads: [],
  schedule: [],
  recentActivity: [],
};

function cloneInitialManager() {
  return JSON.parse(JSON.stringify(INITIAL_MANAGER_STATE));
}

export function getManagerWorkspaceState() {
  let activeUser = null;
  try {
    const rawUser = localStorage.getItem('pm_user');
    if (rawUser) activeUser = JSON.parse(rawUser);
  } catch {
    // ignore
  }

  const activeName = (activeUser?.name || '').trim().toLowerCase();
  const activeEmail = (activeUser?.email || '').trim().toLowerCase();
  const allProps = getProperties().filter((p) => !p.archived);

  // Look up active user in custom_managers roster (Admin roster is single source of truth)
  let rosterManager = null;
  try {
    const customManagers = JSON.parse(localStorage.getItem('custom_managers') || '[]');
    if (Array.isArray(customManagers)) {
      rosterManager = customManagers.find(
        (m) =>
          (activeEmail && m.email && m.email.trim().toLowerCase() === activeEmail) ||
          (activeName && m.name && m.name.trim().toLowerCase() === activeName) ||
          (activeUser?.id && m.id && String(m.id) === String(activeUser.id))
      );
    }
  } catch {
    // ignore
  }

  // Check explicit assigned properties from the manager roster
  const managerRosterProps = Array.isArray(rosterManager?.properties)
    ? rosterManager.properties
    : Array.isArray(activeUser?.managerData?.properties)
    ? activeUser.managerData.properties
    : null;

  // Match properties assigned to this manager with strict isolation
  let assignedProps = [];
  if (Array.isArray(managerRosterProps)) {
    // Explicit roster assignment list
    const allowedNames = new Set(
      managerRosterProps.map((n) =>
        (typeof n === 'string' ? n.trim().toLowerCase() : String(n?.name || '').trim().toLowerCase())
      )
    );
    assignedProps = allProps.filter((p) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pId = String(p.id);
      return allowedNames.has(pName) || allowedNames.has(pId);
    });
  } else {
    // Fallback if not registered in manager roster: match strictly by exact manager name, email, or managerId
    assignedProps = allProps.filter((p) => {
      const pMgr = (p.manager || '').trim().toLowerCase();
      const pMgrId = p.managerId ? String(p.managerId) : '';
      const uId = activeUser?.id ? String(activeUser.id) : '';

      if (activeName && pMgr && pMgr === activeName) return true;
      if (activeEmail && pMgr && pMgr === activeEmail) return true;
      if (uId && pMgrId && pMgrId === uId) return true;
      return false;
    });
  }

  // Base state: load from localStorage if available, or clone initial
  let base = cloneInitialManager();
  try {
    const raw = localStorage.getItem(MANAGER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        base = parsed;
      }
    }
  } catch {
    // ignore
  }

  // Always map all assignedProps
  const mappedProps = assignedProps.map((p) => {
    const propId = String(p.id).startsWith('prop-')
      ? p.id
      : `prop-${String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const existing = Array.isArray(base.properties)
      ? base.properties.find(
          (bp) =>
            bp.name?.trim().toLowerCase() === p.name?.trim().toLowerCase() ||
            String(bp.id) === String(p.id) ||
            bp.id === propId
        )
      : null;

    return {
      id: existing?.id || propId,
      originalId: p.id,
      numericId: !isNaN(parseInt(p.id, 10)) ? parseInt(p.id, 10) : null,
      name: p.name,
      address: p.address || p.street || '123 Main St',
      shortLocation: p.city ? `${p.city}, ${p.state || 'NY'}` : (p.address || 'Metro Area'),
      neighborhood: p.city || 'Metro Area',
      type: p.type || 'Residential',
      status: p.status || 'Active',
      totalUnits: Number(p.totalUnits) || (existing?.totalUnits || 0),
      occupiedUnits: Number(p.occupiedUnits) || (existing?.occupiedUnits || 0),
      vacantUnits: Number(p.vacantUnits) || (existing?.vacantUnits || 0),
      contactName: (Array.isArray(p.owners) && p.owners[0]?.name) || p.owner || 'Building Owner',
      contactRole: 'Building owner',
      contactPhone: p.phone || '555-010-1041',
      accessInstructions: existing?.accessInstructions || 'Main entrance security / lockbox code #4821.',
      accessUpdatedAt: existing?.accessUpdatedAt || '11/10/2026',
      units: existing?.units || [],
      requirements: existing?.requirements || [],
      files: existing?.files || [],
    };
  });

  base.properties = mappedProps;

  // Collect all potential work orders from manager state, custom_work_orders_us, and tenant portal
  const existingWOs = Array.isArray(base.workOrders) ? [...base.workOrders] : [];
  const knownWOIds = new Set(existingWOs.map((w) => String(w.id)));

  // Target property for this manager (e.g. HAPPY)
  const defaultMgrPropName = mappedProps[0]?.name || 'HAPPY';
  const defaultMgrPropId = String(mappedProps[0]?.id || 'prop-happy');

  // 1. Sync from custom_work_orders_us (Admin maintenance kanban)
  try {
    const rawCustomWOs = localStorage.getItem('custom_work_orders_us');
    if (rawCustomWOs) {
      const parsedCustomWOs = JSON.parse(rawCustomWOs);
      if (Array.isArray(parsedCustomWOs)) {
        let customChanged = false;
        parsedCustomWOs.forEach((cw) => {
          let cwPropName = (cw.propertyName || '').trim();
          let cwPropId = String(cw.propertyId || '');

          // If this ticket had legacy placeholder "Sunrise Residency", "Main Property", or "1", remap to active property (HELLO PROPERTY)
          if (
            (!cwPropName || cwPropName.toLowerCase() === 'sunrise residency' || cwPropName.toLowerCase() === 'main property' || cwPropId === '1') &&
            mappedProps.length > 0
          ) {
            cwPropName = defaultMgrPropName;
            cwPropId = defaultMgrPropId;
            cw.propertyName = cwPropName;
            cw.propertyId = cwPropId;
            customChanged = true;
          }

          const existingIdx = existingWOs.findIndex((w) => String(w.id) === String(cw.id));
          if (existingIdx > -1) {
            existingWOs[existingIdx].propertyName = cwPropName || defaultMgrPropName;
            existingWOs[existingIdx].propertyId = cwPropId || defaultMgrPropId;
          } else {
            existingWOs.push({
              id: String(cw.id),
              title: cw.title || `${cw.category || 'Maintenance'} repair`,
              description: cw.description || 'Maintenance issue logged in resident portal',
              category: cw.category || 'General',
              propertyId: cwPropId || defaultMgrPropId,
              propertyName: cwPropName || defaultMgrPropName,
              unitNumber: cw.unitNumber || '2A',
              residentName: cw.tenantName || 'Resident',
              residentPhone: '+1 (347) 555-0118',
              priority: cw.priority === 'Urgent' || cw.priority === 'High' ? 'Urgent' : 'Normal',
              status: cw.status === 'Completed' ? 'Closed' : cw.status === 'In Progress' ? 'In progress' : cw.status === 'Reviewed & Prioritized' ? 'Open' : (cw.status || 'Open'),
              estimatedCost: Number(cw.cost || 0),
              createdAt: cw.createdAt || new Date().toISOString().slice(0, 10),
              scheduledToday: true,
              timeline: [
                { label: 'Logged via RentLock resident portal', time: 'Recently' },
              ],
            });
            knownWOIds.add(String(cw.id));
          }
        });
        if (customChanged) {
          localStorage.setItem('custom_work_orders_us', JSON.stringify(parsedCustomWOs));
        }
      }
    }
  } catch {}

  // 2. Sync from rentlock_tenant_portal_v1 (Resident portal submissions like WO-302, WO-303)
  try {
    const rawTenantState = localStorage.getItem('rentlock_tenant_portal_v1');
    if (rawTenantState) {
      const tenantState = JSON.parse(rawTenantState);
      if (Array.isArray(tenantState?.workOrders)) {
        tenantState.workOrders.forEach((two) => {
          const woPropName = two.propertyName || defaultMgrPropName;
          const woPropId = String(two.propertyId || defaultMgrPropId);

          const existingIdx = existingWOs.findIndex((w) => String(w.id) === String(two.id));
          if (existingIdx > -1) {
            existingWOs[existingIdx].propertyName = woPropName;
            existingWOs[existingIdx].propertyId = woPropId;
            existingWOs[existingIdx].priority = two.urgency === 'Urgent' ? 'Urgent' : 'Normal';
            existingWOs[existingIdx].title = two.title || `${two.category} repair`;
            existingWOs[existingIdx].description = two.description || 'Maintenance issue logged in resident portal';
          } else {
            existingWOs.push({
              id: String(two.id),
              title: two.title || `${two.category} repair`,
              description: two.description || 'Maintenance issue logged in resident portal',
              category: two.category || 'General',
              propertyId: woPropId,
              propertyName: woPropName,
              unitNumber: two.unit || tenantState?.household?.unitCode || 'T2',
              residentName: tenantState?.household?.tenantName || 'Jonny',
              residentPhone: '+1 (347) 555-0118',
              priority: two.urgency === 'Urgent' ? 'Urgent' : 'Normal',
              status: two.status || 'Open',
              estimatedCost: 150,
              createdAt: two.createdAt ? two.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
              scheduledToday: true,
              timeline: [
                { label: 'Logged via RentLock resident portal', time: 'Recently' },
                { label: 'Awaiting manager dispatch', time: 'Pending' },
              ],
            });
            knownWOIds.add(String(two.id));
          }
        });
      }
    }
  } catch {}

  // 3. Sync from rentlock_live_work_orders (Live tickets synced from backend)
  try {
    const rawLive = localStorage.getItem('rentlock_live_work_orders');
    if (rawLive) {
      const parsedLive = JSON.parse(rawLive);
      if (Array.isArray(parsedLive)) {
        parsedLive.forEach((lw) => {
          const woPropName = lw.propertyName || defaultMgrPropName;
          const woPropId = String(lw.propertyId || defaultMgrPropId);
          const existingIdx = existingWOs.findIndex((w) => String(w.id) === String(lw.id));
          if (existingIdx > -1) {
            existingWOs[existingIdx].propertyName = woPropName;
            existingWOs[existingIdx].propertyId = woPropId;
            existingWOs[existingIdx].title = lw.title || existingWOs[existingIdx].title;
            existingWOs[existingIdx].description = lw.description || existingWOs[existingIdx].description;
            existingWOs[existingIdx].priority = lw.priority || existingWOs[existingIdx].priority;
            existingWOs[existingIdx].status = lw.status || existingWOs[existingIdx].status;
          } else {
            existingWOs.push({
              id: String(lw.id),
              title: lw.title || 'Repair Request',
              description: lw.description || 'Maintenance issue logged in resident portal',
              category: lw.category || 'General',
              propertyId: woPropId,
              propertyName: woPropName,
              unitNumber: lw.unitNumber || lw.unit || 'T2',
              unit: lw.unitNumber || lw.unit || 'T2',
              residentName: lw.residentName || lw.tenantName || 'Jonny',
              residentPhone: lw.residentPhone || '+1 (347) 555-0118',
              priority: lw.priority || 'Normal',
              status: lw.status || 'Open',
              estimatedCost: Number(lw.estimatedCost || lw.costEstimate || 0),
              createdAt: lw.createdAt || new Date().toISOString().slice(0, 10),
              scheduledToday: true,
              timeline: lw.timeline || [
                { label: 'Logged via RentLock resident portal', time: 'Recently' },
                { label: 'Assigned to maintenance queue', time: 'Recently' },
              ],
            });
            knownWOIds.add(String(lw.id));
          }
        });
      }
    }
  } catch {}

  // Deduplicate work orders across existingWOs by normalized description/title
  const seenWODescs = new Set();
  const dedupedWOs = [];
  for (const wo of existingWOs) {
    const rawKey = ((wo.description || wo.title || '').trim()).toLowerCase();
    const normKey = rawKey.length > 5 ? rawKey : `${wo.id}-${rawKey}`;
    if (seenWODescs.has(normKey)) {
      continue;
    }
    seenWODescs.add(normKey);
    // Ensure propertyName is correctly set to manager's property
    if (mappedProps.length > 0 && (!wo.propertyName || wo.propertyName === 'Main Property')) {
      wo.propertyName = mappedProps[0].name;
      wo.propertyId = mappedProps[0].id;
    }
    dedupedWOs.push(wo);
  }
  base.workOrders = dedupedWOs;

  // Strict isolation for all associated manager workspace data
  if (mappedProps.length === 0) {
    base.properties = [];
    base.tenants = [];
    base.workOrders = [];
    base.schedule = [];
    base.recentActivity = [];
    base.threads = [];
  } else {
    const allowedIds = new Set();
    mappedProps.forEach((p) => {
      if (p.id) {
        allowedIds.add(String(p.id).toLowerCase());
        allowedIds.add(String(p.id).toLowerCase().replace(/^prop-/, ''));
      }
      if (p.originalId) allowedIds.add(String(p.originalId).toLowerCase());
      if (p.numericId) allowedIds.add(String(p.numericId).toLowerCase());
    });
    const allowedNames = new Set(
      mappedProps.map((p) => (p.name || '').trim().toLowerCase()).filter(Boolean)
    );
    const singleAssignedName = mappedProps.length === 1 ? (mappedProps[0].name || '').trim().toLowerCase() : null;

    if (Array.isArray(base.tenants)) {
      base.tenants = base.tenants.filter((t) => {
        const tPropId = String(t.propertyId || '').toLowerCase();
        const tPropName = (t.propertyName || '').trim().toLowerCase();
        return (
          allowedIds.has(tPropId) ||
          allowedNames.has(tPropName) ||
          (singleAssignedName && (!tPropName || tPropName === 'main property' || tPropName === singleAssignedName))
        );
      });
    }
    if (Array.isArray(base.workOrders)) {
      base.workOrders = base.workOrders.filter((w) => {
        const wPropId = String(w.propertyId || '').toLowerCase();
        const wPropName = (w.propertyName || '').trim().toLowerCase();
        return (
          allowedIds.has(wPropId) ||
          allowedNames.has(wPropName) ||
          (singleAssignedName && (!wPropName || wPropName === 'main property' || wPropName === singleAssignedName))
        );
      });
    }
    if (Array.isArray(base.schedule)) {
      base.schedule = base.schedule.filter(
        (s) => allowedIds.has(String(s.propertyId).toLowerCase()) || allowedNames.has((s.property || '').trim().toLowerCase())
      );
    }
    if (Array.isArray(base.recentActivity)) {
      base.recentActivity = base.recentActivity.filter(
        (a) => !a.propertyId || allowedIds.has(String(a.propertyId).toLowerCase())
      );
    }
    if (Array.isArray(base.threads)) {
      base.threads = base.threads.filter(
        (t) => !t.propertyId || allowedIds.has(String(t.propertyId).toLowerCase())
      );
    }
  }

  base.manager = {
    name: activeUser?.name || rosterManager?.name || 'Property Manager',
    email: activeUser?.email || rosterManager?.email || '',
    roleLabel: 'Property Manager',
    spendingLimit: rosterManager?.spendingCap || activeUser?.managerData?.spendingCap || MANAGER_APPROVAL_LIMIT,
  };

  if (!Array.isArray(base.threads) || base.threads.length === 0) {
    base.threads = cloneInitialManager().threads;
  }

  return base;
}

function saveManagerState(state) {
  localStorage.setItem(MANAGER_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function getManagerUnreadCount(state, propertyFilter = '') {
  if (!Array.isArray(state?.threads)) return 0;
  return state.threads
    .filter((t) => !propertyFilter || t.propertyId === propertyFilter)
    .reduce((sum, t) => sum + (Number(t.unreadCount) || 0), 0);
}

export function matchesPropertyFilter(wo, propertyFilter, properties = []) {
  if (!propertyFilter) return true;
  const pFilter = String(propertyFilter).toLowerCase().trim();
  const woPropId = String(wo?.propertyId || '').toLowerCase().trim();
  const woPropName = String(wo?.propertyName || '').toLowerCase().trim();

  if (woPropId === pFilter) return true;
  if (woPropName === pFilter) return true;

  if (Array.isArray(properties) && properties.length > 0) {
    const matchedProp = properties.find(
      (p) =>
        String(p.id).toLowerCase() === pFilter ||
        String(p.originalId || '').toLowerCase() === pFilter ||
        String(p.name || '').toLowerCase() === pFilter
    );
    if (matchedProp) {
      const mName = String(matchedProp.name || '').toLowerCase().trim();
      const mId = String(matchedProp.id || '').toLowerCase().trim();
      const mOrigId = String(matchedProp.originalId || '').toLowerCase().trim();
      if (woPropName === mName || woPropId === mId || woPropId === mOrigId) return true;
    }
  }
  return false;
}

export function getManagerOpenWorkOrders(state, propertyFilter = '') {
  if (!Array.isArray(state?.workOrders)) return [];
  return state.workOrders.filter(
    (wo) => wo.status !== 'Closed' && matchesPropertyFilter(wo, propertyFilter, state?.properties)
  );
}

export function createManagerWorkOrder({
  propertyId,
  unit,
  title,
  report,
  priority,
  vendorName,
  estimateAmount,
}) {
  // Real API call to backend
  apiClient.post('/maintenance', {
    propertyId: Number(propertyId) || 1,
    title: title.trim(),
    description: `${(report || title).trim()}\nAssigned: ${vendorName || 'General Staff'}`,
    category: 'General',
    priority: priority || 'Medium',
  }).catch(() => {});

  const state = getManagerWorkspaceState();
  const property = state.properties.find((p) => p.id === propertyId) || state.properties[0];
  const propId = property?.id || propertyId || 'prop-general';
  const propName = property?.name || 'General Portfolio';
  const now = new Date();
  const ts = formatActionTimestamp(now);
  const shortTime = formatShortTime(now);
  const nextNum = 327 + state.workOrders.length;
  const id = `WO-${nextNum}`;
  const est = Number(estimateAmount) || 0;
  const needsApproval = est > MANAGER_APPROVAL_LIMIT;

  const newWO = {
    id,
    title: title.trim(),
    shortTitle: title.trim().slice(0, 26),
    propertyId: propId,
    propertyName: propName,
    shortProperty: propName.split(' ')[0],
    unit: unit?.trim() || 'Common',
    tenantName: property?.units?.find((u) => u.unit === unit)?.tenant || 'Assigned Unit',
    priority: priority || 'Normal',
    status: needsApproval ? 'Approval needed' : 'Assigned',
    nextAction: needsApproval ? 'Send for approval' : 'Confirm schedule',
    openedAt: `Opened today at ${shortTime}`,
    report: report.trim(),
    vendorName: vendorName?.trim() || 'Pending assignment',
    estimateAmount: est,
    approvalRequestedAt: null,
    assignee: vendorName?.trim() || 'Unassigned',
    scheduledToday: false,
    completedOn: '',
    workPerformed: '',
    finalCost: '',
    invoiceNumber: '',
    attachments: [],
  };

  const activity = {
    id: `ACT-${Date.now()}`,
    ref: id,
    description: `Created work order (${newWO.title}) · ${ts}`,
    timeLabel: 'Just now',
    propertyId: propId,
    targetPath: `/manager/work-orders?wo=${id}`,
  };

  const nextState = {
    ...state,
    workOrders: [newWO, ...state.workOrders],
    recentActivity: [activity, ...state.recentActivity].slice(0, 10),
  };

  // Sync to Admin Maintenance Kanban custom_work_orders_us
  try {
    const rawWOs = localStorage.getItem('custom_work_orders_us');
    const customWOs = rawWOs ? JSON.parse(rawWOs) : [];
    customWOs.unshift({
      id,
      title: title.trim(),
      description: report.trim(),
      priority: priority || 'Normal',
      category: 'General Maintenance',
      type: 'Manager Dispatched',
      propertyId: propId,
      propertyName: propName,
      unitNumber: unit?.trim() || 'Common',
      tenantName: newWO.tenantName,
      assignedTo: vendorName?.trim() || 'Pending assignment',
      status: needsApproval ? 'Reviewed & Prioritized' : 'Scheduled / Dispatched',
      scheduledWindow: 'Scheduled by Manager',
      cost: est,
      costCap: MANAGER_APPROVAL_LIMIT,
      createdAt: now.toISOString().split('T')[0],
      updatedAt: now.toISOString().split('T')[0],
      approvalNeeded: needsApproval,
      feedback: null,
    });
    localStorage.setItem('custom_work_orders_us', JSON.stringify(customWOs));
  } catch {
    // ignore
  }

  return { state: saveManagerState(nextState), workOrder: newWO };
}

export function requestWorkOrderApproval(workOrderId) {
  const state = getManagerWorkspaceState();
  const ts = formatActionTimestamp();
  const workOrders = state.workOrders.map((wo) => {
    if (wo.id !== workOrderId) return wo;
    return {
      ...wo,
      status: 'Approval pending',
      nextAction: 'Awaiting authorized approver',
      approvalRequestedAt: ts,
    };
  });
  const target = workOrders.find((w) => w.id === workOrderId);
  const activity = {
    id: `ACT-${Date.now()}`,
    ref: workOrderId,
    description: `Routed $${target?.estimateAmount || 0} estimate for approval · ${ts}`,
    timeLabel: 'Just now',
    propertyId: target?.propertyId || '',
    targetPath: `/manager/work-orders?wo=${workOrderId}`,
  };
  return saveManagerState({
    ...state,
    workOrders,
    recentActivity: [activity, ...state.recentActivity].slice(0, 10),
  });
}

export function completeManagerWorkOrder({
  workOrderId,
  workPerformed,
  completedOn,
  vendorName,
  finalCost,
  invoiceNumber,
  newFiles = [],
}) {
  const state = getManagerWorkspaceState();
  const ts = formatActionTimestamp();

  const workOrders = state.workOrders.map((wo) => {
    if (wo.id !== workOrderId) return wo;
    const stampedFiles = newFiles.map((f, idx) => ({
      id: `ATT-${Date.now()}-${idx}`,
      name: f.name,
      type: f.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'JPG',
      uploadedAt: ts,
      url: f.url,
    }));
    return {
      ...wo,
      status: 'Closed',
      nextAction: 'Closed',
      workPerformed: workPerformed.trim(),
      completedOn: completedOn || ts,
      vendorName: vendorName.trim(),
      finalCost: finalCost,
      invoiceNumber: invoiceNumber.trim(),
      closedAt: ts,
      attachments: [...(wo.attachments || []), ...stampedFiles],
    };
  });

  const target = workOrders.find((w) => w.id === workOrderId);
  const activity = {
    id: `ACT-${Date.now()}`,
    ref: workOrderId,
    description: `Work order reviewed and closed (${invoiceNumber || 'verified'}) · ${ts}`,
    timeLabel: 'Just now',
    propertyId: target?.propertyId || '',
    targetPath: `/manager/work-orders?wo=${workOrderId}`,
  };

  // Sync close status to custom_work_orders_us and rentlock_tenant_portal_v1
  try {
    const rawWOs = localStorage.getItem('custom_work_orders_us');
    if (rawWOs) {
      const cWOs = JSON.parse(rawWOs);
      const idx = cWOs.findIndex((w) => String(w.id) === String(workOrderId));
      if (idx > -1) {
        cWOs[idx] = { ...cWOs[idx], status: 'Completed', updatedAt: new Date().toISOString().split('T')[0] };
        localStorage.setItem('custom_work_orders_us', JSON.stringify(cWOs));
      }
    }
  } catch {}

  try {
    const rawTenant = localStorage.getItem('rentlock_tenant_portal_v1');
    if (rawTenant) {
      const tState = JSON.parse(rawTenant);
      if (Array.isArray(tState?.workOrders)) {
        const tIdx = tState.workOrders.findIndex((w) => String(w.id) === String(workOrderId));
        if (tIdx > -1) {
          tState.workOrders[tIdx].status = 'Completed';
          tState.workOrders[tIdx].statusSummary = `Resolved · ${ts}`;
          localStorage.setItem('rentlock_tenant_portal_v1', JSON.stringify(tState));
        }
      }
    }
  } catch {}

  return saveManagerState({
    ...state,
    workOrders,
    recentActivity: [activity, ...state.recentActivity].slice(0, 10),
  });
}

export function sendManagerMessage({
  threadId,
  text,
  channel = 'Portal',
  isInternal = false,
  attachments = [],
  senderName = 'Sarah Jenkins',
}) {
  // Real API call to backend
  apiClient.post('/messages', {
    threadId: Number(String(threadId).replace(/\D/g, '')) || 1,
    recipientId: 4,
    content: text.trim(),
    attachmentUrls: attachments,
  }).catch(() => {});

  const state = getManagerWorkspaceState();
  const now = new Date();
  const shortTime = formatShortTime(now);
  const ts = formatActionTimestamp(now);

  const threads = state.threads.map((t) => {
    if (t.id !== threadId) return t;
    const msg = {
      id: `MSG-${Date.now()}`,
      senderType: 'manager',
      senderLabel: isInternal ? `Internal note · ${senderName} · ${shortTime}` : `${senderName} · ${shortTime}`,
      text: text.trim(),
      isInternal,
      channel: isInternal ? 'Internal' : channel,
      timestamp: ts,
      attachments,
    };
    return {
      ...t,
      timeAgo: 'Just now',
      unreadCount: 0,
      messages: [...t.messages, msg],
    };
  });

  const targetThread = threads.find((t) => t.id === threadId);
  const activity = {
    id: `ACT-${Date.now()}`,
    ref: targetThread?.contactName || 'Message',
    description: `${isInternal ? 'Added staff-only internal note' : `Sent ${channel} message`} · ${ts}`,
    timeLabel: 'Just now',
    propertyId: targetThread?.propertyId || '',
    targetPath: `/manager/messages?thread=${threadId}`,
  };

  return saveManagerState({
    ...state,
    threads,
    recentActivity: [activity, ...state.recentActivity].slice(0, 10),
  });
}

export function createManagerThread({
  contactName,
  propertyId,
  unit,
  channel = 'Portal',
  text,
  senderName = 'Sarah Jenkins',
}) {
  const state = getManagerWorkspaceState();
  const property = state.properties.find((p) => p.id === propertyId) || state.properties[0];
  const propId = property?.id || propertyId || 'prop-general';
  const propName = property?.name || 'General Portfolio';
  const now = new Date();
  const shortTime = formatShortTime(now);
  const ts = formatActionTimestamp(now);

  const initials = contactName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TM';

  const id = `THR-${Date.now()}`;
  const thread = {
    id,
    contactName: contactName.trim(),
    initials,
    propertyId: propId,
    propertyUnitLabel: `${propName.split(' ')[0]} · ${unit || 'General'}`,
    fullPropertyUnit: `${propName} · ${unit || 'General'}`,
    channel,
    channelBadge: channel === 'Portal' ? 'PORTAL MESSAGE' : channel.toUpperCase(),
    preview: `${channel} · ${text.trim().slice(0, 34)}`,
    timeAgo: 'Just now',
    unreadCount: 0,
    workOrderId: null,
    messages: [
      {
        id: `MSG-${Date.now()}`,
        senderType: 'manager',
        senderLabel: `${senderName} · ${shortTime}`,
        text: text.trim(),
        isInternal: false,
        channel,
        timestamp: ts,
        attachments: [],
      },
    ],
  };

  return {
    state: saveManagerState({ ...state, threads: [thread, ...state.threads] }),
    thread,
  };
}

export function markManagerThreadRead(threadId) {
  const state = getManagerWorkspaceState();
  const threads = state.threads.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t));
  return saveManagerState({ ...state, threads });
}

export function updatePropertyAccessNotes(propertyId, accessInstructions) {
  if (propertyId) {
    apiClient.put(`/portal/manager/properties/${propertyId}/access-notes`, {
      accessNotes: accessInstructions,
    }).catch(() => {});
  }
  const state = getManagerWorkspaceState();
  const ts = formatActionTimestamp();
  const properties = state.properties.map((p) =>
    p.id === propertyId ? { ...p, accessInstructions, accessUpdatedAt: ts } : p
  );
  const prop = properties.find((p) => p.id === propertyId);
  const activity = {
    id: `ACT-${Date.now()}`,
    ref: prop?.name || 'Property',
    description: `Updated vendor access & lockbox instructions · ${ts}`,
    timeLabel: 'Just now',
    propertyId,
    targetPath: `/manager/properties/${propertyId}`,
  };
  return saveManagerState({
    ...state,
    properties,
    recentActivity: [activity, ...state.recentActivity].slice(0, 10),
  });
}

export function uploadPropertyFile(propertyId, fileName, category) {
  if (propertyId) {
    apiClient.post(`/properties/${propertyId}/documents`, {
      name: fileName,
      category,
    }).catch(() => {});
  }
  const state = getManagerWorkspaceState();
  const ts = formatActionTimestamp();
  const properties = state.properties.map((p) => {
    if (p.id !== propertyId) return p;
    const newFile = {
      id: `FIL-${Date.now()}`,
      name: fileName,
      category,
      uploadedAt: ts,
      uploadedBy: state.manager.name,
    };
    return { ...p, files: [newFile, ...(p.files || [])] };
  });
  const prop = properties.find((p) => p.id === propertyId);
  const activity = {
    id: `ACT-${Date.now()}`,
    ref: prop?.name || 'Property',
    description: `Uploaded ${fileName} (${category}) · ${ts}`,
    timeLabel: 'Just now',
    propertyId,
    targetPath: `/manager/properties/${propertyId}`,
  };
  return saveManagerState({
    ...state,
    properties,
    recentActivity: [activity, ...state.recentActivity].slice(0, 10),
  });
}

export function addManagerTenant({
  name,
  email,
  phone,
  propertyId,
  unit,
  leaseTerm,
  monthlyRent,
  password,
}) {
  const state = getManagerWorkspaceState();
  const property = state.properties.find((p) => p.id === propertyId) || state.properties[0];
  const propId = property?.id || propertyId || 'prop-general';
  const propName = property?.name || 'General Portfolio';
  const ts = formatActionTimestamp();
  const rent = Number(monthlyRent) || 0;
  const pwd = (password || '').trim() || 'demo123';

  const newTenant = {
    id: `TEN-${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    password: pwd,
    phone: (phone || '').trim(),
    propertyId: propId,
    propertyName: propName,
    unit: unit?.trim() || 'Unit 101',
    leaseTerm: leaseTerm?.trim() || '12/01/26 - 11/30/27',
    leaseStatus: 'Active',
    rentStatus: 'Current',
    monthlyRent: rent,
    paidAmount: rent,
    balance: 0,
    lastActivity: `Added · ${ts}`,
    householdMembers: [`${name.trim()} (Primary)`],
    documents: [],
    privateNotes: [],
  };

  const activity = {
    id: `ACT-${Date.now()}`,
    ref: `${unit || 'Unit'} · ${name.trim()}`,
    description: `Added resident to ${propName} · ${ts}`,
    timeLabel: 'Just now',
    propertyId: propId,
    targetPath: '/manager/tenants',
  };

  // Sync to Admin/Owner custom_tenants in localStorage
  try {
    const rawTenants = localStorage.getItem('custom_tenants');
    const customTenants = rawTenants ? JSON.parse(rawTenants) : [];
    customTenants.push({
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      password: pwd,
      mobile: (phone || '').trim(),
      propertyId: propId,
      propertyName: propName,
      unitNumber: unit?.trim() || 'Unit 101',
      rent,
      deposit: rent,
      dueAmount: 0,
      leaseEnd: '2027-11-30',
      moveInDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      screeningStatus: 'Consent Verified · Approved',
    });
    localStorage.setItem('custom_tenants', JSON.stringify(customTenants));
  } catch {
    // ignore
  }

  return saveManagerState({
    ...state,
    tenants: [newTenant, ...state.tenants],
    recentActivity: [activity, ...state.recentActivity].slice(0, 10),
  });
}

export function addTenantPrivateNote(tenantId, noteText) {
  if (tenantId) {
    apiClient.post(`/portal/manager/tenants/${tenantId}/notes`, {
      noteText: noteText.trim(),
    }).catch(() => {});
  }
  const state = getManagerWorkspaceState();
  const ts = formatActionTimestamp();
  const tenants = state.tenants.map((t) => {
    if (t.id !== tenantId) return t;
    const note = {
      id: `PN-${Date.now()}`,
      text: noteText.trim(),
      createdAt: ts,
      author: state.manager.name,
    };
    return { ...t, privateNotes: [note, ...(t.privateNotes || [])] };
  });
  return saveManagerState({ ...state, tenants });
}
