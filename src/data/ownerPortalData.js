import apiClient from '../services/apiClient';
import { getProperties } from './mockProperties';

const STORAGE_KEY = 'rentlock_owner_portal_v1';

const INITIAL_OWNER_PORTAL_DATA = {
  ownerProfile: {
    id: 'own-claire',
    name: 'Claire Bennett',
    entityName: 'Bennett Realty Holdings LLC',
  },
  periodLabel: 'November 2026',
  selectedPropertyId: 'all',
  properties: [],
  ledgerEntries: [],
  expenses: [],
  disbursements: [],
  records: [],
  downloadActivity: [],
};

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export function getOwnerPortalState() {
  let activeUser = null;
  try {
    const rawUser = localStorage.getItem('pm_user');
    if (rawUser) activeUser = JSON.parse(rawUser);
  } catch {
    // ignore
  }

  const isOwnerUser = activeUser?.role === 'owner';
  const customOwnerData = activeUser?.ownerData;

  const resolveOwnerProfile = (fallbackProfile = {}) => {
    if (!isOwnerUser || !activeUser?.name) return fallbackProfile;
    const name = activeUser.name;
    const isLlc = name.toLowerCase().includes('llc') || name.toLowerCase().includes('partners');
    return {
      ...fallbackProfile,
      id: customOwnerData?.id || activeUser.id || fallbackProfile.id || 'own-active',
      name,
      entityName: isLlc ? name : `${name} Holdings`,
    };
  };

  const allProps = getProperties().filter((p) => !p.archived);
  const activeName = activeUser?.name?.toLowerCase() || '';

  // Synchronize properties owned strictly by this owner
  const matchingProps = allProps.filter((p) => {
    if (!activeName) return false;
    // Direct match by ID
    if (p.ownerId && activeUser?.id && Number(p.ownerId) === Number(activeUser.id)) return true;
    // Match by owners array
    if (Array.isArray(p.owners) && p.owners.some((o) => (o.name || '').toLowerCase().includes(activeName))) return true;
    // Match by owner string e.g. "simba", "simba (100%)"
    if (typeof p.owner === 'string' && p.owner.toLowerCase().includes(activeName)) return true;
    // Match by accessNotes tag
    if (p.accessNotes && p.accessNotes.toLowerCase().includes(`[owner:${activeName}`)) return true;
    // Match by customOwnerData properties
    if (customOwnerData?.properties?.some((pn) => pn.toLowerCase() === (p.name || '').toLowerCase())) return true;
    if (customOwnerData?.assignedProperty && (p.name || '').toLowerCase() === customOwnerData.assignedProperty.toLowerCase()) return true;
    // Claire Bennett demo account default portfolio
    if (activeName === 'claire bennett' || activeUser?.email === 'owner@rentlock.com') {
      return ['Sunrise Residency', 'Green Valley Villas', 'Metro Business Park'].includes(p.name);
    }
    return false;
  });

  const mappedProps = matchingProps.map((p) => {
    const rev = Number(p.monthlyRevenue) || 0;
    return {
      id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: p.name,
      address: p.address || '123 Main St',
      type: p.type || 'Residential',
      units: p.totalUnits || 0,
      occupied: p.occupiedUnits || 0,
      vacant: p.vacantUnits || 0,
      openingCash: 0,
      rentReceived: rev,
      expensesPaid: 0,
      reserveHeld: 0,
      ownerDisbursement: rev,
      lastStatementDate: '11/30/2026',
      managerName: p.manager || 'Sarah Jenkins',
    };
  });

  try {
    const userSpecificKey = `${STORAGE_KEY}_${activeUser?.id || activeUser?.email || 'default'}`;
    const raw = localStorage.getItem(userSpecificKey);
    const parsed = raw ? JSON.parse(raw) : clone(INITIAL_OWNER_PORTAL_DATA);
    const base = (!Array.isArray(parsed?.properties) || !Array.isArray(parsed?.ledgerEntries))
      ? clone(INITIAL_OWNER_PORTAL_DATA)
      : parsed;

    return {
      ...base,
      ownerProfile: resolveOwnerProfile(base.ownerProfile || INITIAL_OWNER_PORTAL_DATA.ownerProfile),
      properties: mappedProps,
      selectedPropertyId: mappedProps.some((p) => p.id === base.selectedPropertyId)
        ? base.selectedPropertyId
        : mappedProps[0]?.id || 'all',
    };
  } catch {
    return {
      ...clone(INITIAL_OWNER_PORTAL_DATA),
      ownerProfile: resolveOwnerProfile(INITIAL_OWNER_PORTAL_DATA.ownerProfile),
      properties: mappedProps,
    };
  }
}

export function saveOwnerPortalState(nextState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // ignore storage quota errors
  }
  return nextState;
}

export function setSelectedOwnerProperty(propertyId) {
  const state = getOwnerPortalState();
  return saveOwnerPortalState({ ...state, selectedPropertyId: propertyId });
}

export function logOwnerRecordDownload(recordTitle, actor = 'Claire Bennett') {
  apiClient.post('/portal/owner/documents/audit/download-log', { recordTitle, actor }).catch(() => {});
  const state = getOwnerPortalState();
  const stamp = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const entry = {
    id: `DL-${Date.now()}`,
    recordTitle,
    downloadedAt: stamp,
    actor,
  };
  return saveOwnerPortalState({
    ...state,
    downloadActivity: [entry, ...(state.downloadActivity || [])].slice(0, 12),
  });
}

export function getOwnerCashSummary(state, propertyId = 'all') {
  const scoped =
    propertyId === 'all'
      ? state.properties
      : state.properties.filter((p) => p.id === propertyId);

  const openingCash = scoped.reduce((sum, p) => sum + p.openingCash, 0);
  const rentReceived = scoped.reduce((sum, p) => sum + p.rentReceived, 0);
  const expensesPaid = scoped.reduce((sum, p) => sum + p.expensesPaid, 0);
  const operatingNet = rentReceived - expensesPaid;
  const cashBeforePayout = openingCash + rentReceived - expensesPaid;
  const reserveHeld = scoped.reduce((sum, p) => sum + p.reserveHeld, 0);
  const ownerDisbursement = scoped.reduce((sum, p) => sum + p.ownerDisbursement, 0);
  const endingCash = cashBeforePayout - ownerDisbursement;

  return {
    scopedProperties: scoped,
    openingCash,
    rentReceived,
    expensesPaid,
    operatingNet,
    cashBeforePayout,
    reserveHeld,
    ownerDisbursement,
    endingCash,
  };
}

export function triggerTextDownload(fileName, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
