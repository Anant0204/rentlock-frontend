import apiClient from '../services/apiClient';

// Persistent Mock Storage for Operations: Vendors, Parking, Visitors, Staff & Access, Communication

// ──────────────────────────────────────────────
// VENDORS & PAYEES
// ──────────────────────────────────────────────
const INITIAL_VENDORS = [];

export const getVendors = () => {
  try {
    const raw = localStorage.getItem('pm_vendors');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read vendors cache', err);
    return INITIAL_VENDORS;
  }
  return INITIAL_VENDORS;
};

export const saveVendors = (vendors) => {
  localStorage.setItem('pm_vendors', JSON.stringify(vendors));
};

export const addVendor = (vendor) => {
  apiClient.post('/operations/vendors', vendor).catch(() => {});
  const current = getVendors();
  const nextId = `VND-${String(current.length + 1).padStart(3, '0')}`;
  const newVendor = {
    id: nextId,
    rating: 5.0,
    openWorkOrders: 0,
    ytdSpend: 0,
    status: 'Active',
    w9OnFile: true,
    coiStatus: 'Valid',
    paymentTerms: 'Net 30',
    paymentMethod: 'ACH Bank Transfer',
    ...vendor,
  };
  const updated = [newVendor, ...current];
  saveVendors(updated);
  return updated;
};

export const deleteVendor = (id) => {
  if (id) {
    apiClient.delete(`/operations/vendors/${id}`).catch(() => {});
  }
  const current = getVendors();
  const updated = current.filter((v) => v.id !== id);
  saveVendors(updated);
  return updated;
};

// ──────────────────────────────────────────────
// PARKING MANAGEMENT
// ──────────────────────────────────────────────
const INITIAL_PARKING = [];

export const getParkingStalls = () => {
  try {
    const raw = localStorage.getItem('pm_parking');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read parking cache', err);
    return INITIAL_PARKING;
  }
  return INITIAL_PARKING;
};

export const saveParkingStalls = (stalls) => {
  localStorage.setItem('pm_parking', JSON.stringify(stalls));
};

export const assignParkingStall = (stallId, data) => {
  if (stallId) {
    apiClient.patch(`/operations/parking/${stallId}/assign`, data).catch(() => {});
  }
  const current = getParkingStalls();
  const updated = current.map((stall) => {
    if (stall.id === stallId) {
      return {
        ...stall,
        ...data,
        status: data.assignedResident ? 'Assigned' : 'Vacant · Available',
      };
    }
    return stall;
  });
  saveParkingStalls(updated);
  return updated;
};

export const addParkingStall = (stall) => {
  apiClient.post('/operations/parking', stall).catch(() => {});
  const current = getParkingStalls();
  const nextNum = current.length + 1;
  const newStall = {
    id: `STALL-${String(nextNum).padStart(3, '0')}`,
    spotNumber: stall.spotNumber || `P-1${String(nextNum).padStart(2, '0')}`,
    propertyName: 'Sunrise Residency',
    lotLocation: stall.lotLocation || 'Sub-Level 1 (North Garage)',
    spotType: stall.spotType || 'Standard Covered',
    assignedResident: stall.assignedResident || null,
    unitNumber: stall.unitNumber || 'Unassigned',
    vehicle: stall.vehicle || '—',
    licensePlate: stall.licensePlate || '—',
    permitTag: stall.permitTag || '—',
    monthlyFee: Number(stall.monthlyFee) || 150,
    status: stall.assignedResident ? 'Assigned' : 'Vacant · Available',
  };
  const updated = [...current, newStall];
  saveParkingStalls(updated);
  return updated;
};

export const deleteParkingStall = (stallId) => {
  if (stallId) {
    apiClient.delete(`/operations/parking/${stallId}`).catch(() => {});
  }
  const current = getParkingStalls();
  const updated = current.filter((s) => s.id !== stallId);
  saveParkingStalls(updated);
  return updated;
};

// ──────────────────────────────────────────────
// VISITOR MANAGEMENT
// ──────────────────────────────────────────────
const INITIAL_VISITORS = [];

export const getVisitors = () => {
  try {
    const raw = localStorage.getItem('pm_visitors');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read visitors cache', err);
    return INITIAL_VISITORS;
  }
  return INITIAL_VISITORS;
};

export const saveVisitors = (visitors) => {
  localStorage.setItem('pm_visitors', JSON.stringify(visitors));
};

export const logVisitor = (visitorData) => {
  apiClient.post('/operations/visitors', visitorData).catch(() => {});
  const current = getVisitors();
  const nextId = `VIS-${Date.now().toString().slice(-4)}`;
  const passId = `V-PASS-${Math.floor(1000 + Math.random() * 9000)}`;
  const newVisitor = {
    id: nextId,
    passId,
    checkInTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    checkOutTime: null,
    status: 'On-Site · Active Pass',
    entryMethod: 'Front Desk / Security Check-in',
    ...visitorData,
  };
  const updated = [newVisitor, ...current];
  saveVisitors(updated);
  return updated;
};

export const checkoutVisitor = (visitorId) => {
  if (visitorId) {
    apiClient.patch(`/operations/visitors/${visitorId}/checkout`).catch(() => {});
  }
  const current = getVisitors();
  const updated = current.map((v) => {
    if (v.id === visitorId) {
      return {
        ...v,
        status: 'Departed',
        checkOutTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
    }
    return v;
  });
  saveVisitors(updated);
  return updated;
};

// ──────────────────────────────────────────────
// STAFF & ACCESS CONTROL
// ──────────────────────────────────────────────
const INITIAL_STAFF = [];

export const getStaff = () => {
  try {
    const raw = localStorage.getItem('pm_staff');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read staff cache', err);
    return INITIAL_STAFF;
  }
  return INITIAL_STAFF;
};

export const saveStaff = (staff) => {
  localStorage.setItem('pm_staff', JSON.stringify(staff));
};

export const addStaff = (member) => {
  apiClient.post('/operations/staff', member).catch(() => {});
  const current = getStaff();
  const nextId = `STF-${String(current.length + 1).padStart(2, '0')}`;
  const newMember = {
    id: nextId,
    status: 'On Duty',
    backgroundCheck: 'Verified',
    keyFobId: `FOB-${Math.floor(1000 + Math.random() * 9000)}`,
    ...member,
  };
  const updated = [newMember, ...current];
  saveStaff(updated);
  return updated;
};

export const deleteStaff = (staffId) => {
  if (staffId) {
    apiClient.delete(`/operations/staff/${staffId}`).catch(() => {});
  }
  const current = getStaff();
  const updated = current.filter((s) => s.id !== staffId);
  saveStaff(updated);
  return updated;
};

// ──────────────────────────────────────────────
// COMMUNICATIONS & BROADCASTS
// ──────────────────────────────────────────────
const INITIAL_BROADCASTS = [];

export const getBroadcasts = () => {
  try {
    const raw = localStorage.getItem('pm_broadcasts');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read broadcasts cache', err);
    return INITIAL_BROADCASTS;
  }
  return INITIAL_BROADCASTS;
};

export const saveBroadcasts = (broadcasts) => {
  localStorage.setItem('pm_broadcasts', JSON.stringify(broadcasts));
};

export const sendBroadcast = (data) => {
  apiClient.post('/operations/communications', data).catch(() => {});
  const current = getBroadcasts();
  const nextId = `BC-${Date.now().toString().slice(-3)}`;
  const newBroadcast = {
    id: nextId,
    sentAt: 'Just now',
    sentBy: 'Robert King (Admin)',
    deliveredCount: 12,
    totalRecipients: 12,
    deliveryRate: '100%',
    openRate: 'Just Sent',
    ...data,
  };
  const updated = [newBroadcast, ...current];
  saveBroadcasts(updated);
  return updated;
};

export const deleteBroadcast = (broadcastId) => {
  if (broadcastId) {
    apiClient.delete(`/operations/communications/${broadcastId}`).catch(() => {});
  }
  const current = getBroadcasts();
  const updated = current.filter((b) => b.id !== broadcastId);
  saveBroadcasts(updated);
  return updated;
};
