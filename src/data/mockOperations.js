import apiClient from '../services/apiClient';

// Persistent Mock Storage for Operations: Vendors, Parking, Visitors, Staff & Access, Communication

// ──────────────────────────────────────────────
// VENDORS & PAYEES
// ──────────────────────────────────────────────
export const DEFAULT_SERVICE_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Landscaping & Snow',
  'Fire Safety',
  'Janitorial',
  'General Contractor',
  'Roofing',
  'Pest Control',
];

export const getServiceCategories = () => {
  try {
    const raw = localStorage.getItem('pm_service_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Could not read categories cache', err);
  }
  return DEFAULT_SERVICE_CATEGORIES;
};

export const saveServiceCategories = (categories) => {
  localStorage.setItem('pm_service_categories', JSON.stringify(categories));
};

export const addServiceCategory = async (name) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return getServiceCategories();
  try {
    await apiClient.post('/operations/service-categories', { name: trimmed });
  } catch (err) {
    console.warn('[API] Create service category notice:', err.message);
  }
  const current = getServiceCategories();
  if (!current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    saveServiceCategories(updated);
    return updated;
  }
  return current;
};

export const deleteServiceCategory = async (name) => {
  const trimmed = (name || '').trim();
  try {
    await apiClient.delete(`/operations/service-categories/${encodeURIComponent(trimmed)}`);
  } catch (err) {
    console.warn('[API] Delete service category notice:', err.message);
  }
  const current = getServiceCategories();
  const updated = current.filter((c) => c.toLowerCase() !== trimmed.toLowerCase());
  saveServiceCategories(updated);
  return updated;
};

const INITIAL_VENDORS = [];

export const getVendors = () => {
  try {
    const raw = localStorage.getItem('pm_vendors') || localStorage.getItem('custom_vendors');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read vendors cache', err);
    return INITIAL_VENDORS;
  }
  return INITIAL_VENDORS;
};

export const saveVendors = (vendors) => {
  localStorage.setItem('pm_vendors', JSON.stringify(vendors));
  localStorage.setItem('custom_vendors', JSON.stringify(vendors));
  try {
    window.dispatchEvent(new Event('rentlock_vendors_changed'));
  } catch {}
};

export const addVendor = async (vendor) => {
  let created = null;
  try {
    created = await apiClient.post('/operations/vendors', {
      name: vendor.name,
      category: vendor.category || 'Plumbing',
      phone: vendor.phone || '+1 (555) 000-0000',
      email: vendor.email || `${(vendor.name || 'vendor').toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
      coiStatus: vendor.coiStatus || 'Valid',
      contactPerson: vendor.contactPerson,
      address: vendor.address,
      paymentMethod: vendor.paymentMethod || 'ACH Bank Transfer',
    });
  } catch (err) {
    console.warn('[API] Create vendor failed:', err.message);
  }

  const current = getVendors();
  const nextNumeric = created?.id || (current.length > 0 ? Math.max(...current.map((v) => parseInt(String(v.id).replace(/\D/g, ''), 10) || 0)) + 1 : 1);
  const nextId = `VND-${String(nextNumeric).padStart(3, '0')}`;
  const newVendor = {
    ...created,
    ...vendor,
    id: nextId,
    dbId: created?.id || nextNumeric,
    rating: vendor.rating || 5.0,
    openWorkOrders: 0,
    ytdSpend: 0,
    status: 'Active',
    w9OnFile: true,
    coiStatus: vendor.coiStatus || 'Valid',
    paymentMethod: vendor.paymentMethod || 'ACH Bank Transfer',
  };
  const updated = [newVendor, ...current.filter((v) => String(v.id) !== nextId)];
  saveVendors(updated);
  return updated;
};

export const updateVendor = async (id, data) => {
  if (id) {
    try {
      await apiClient.put(`/operations/vendors/${id}`, data);
    } catch (err) {
      console.warn('[API] Update vendor notice:', err.message);
    }
  }
  const current = getVendors();
  const updated = current.map((v) => (String(v.id) === String(id) ? { ...v, ...data } : v));
  saveVendors(updated);
  return updated;
};

export const deleteVendor = async (id) => {
  if (id) {
    try {
      await apiClient.delete(`/operations/vendors/${id}`);
    } catch (err) {
      console.warn('[API] Delete vendor notice:', err.message);
    }
  }
  const current = getVendors();
  const updated = current.filter((v) => String(v.id) !== String(id));
  saveVendors(updated);
  return updated;
};

// ──────────────────────────────────────────────
// PARKING MANAGEMENT
// ──────────────────────────────────────────────
const INITIAL_PARKING = [];

export const getParkingStalls = () => {
  try {
    const raw = localStorage.getItem('pm_parking') || localStorage.getItem('custom_parking_stalls');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read parking cache', err);
    return INITIAL_PARKING;
  }
  return INITIAL_PARKING;
};

export const saveParkingStalls = (stalls) => {
  localStorage.setItem('pm_parking', JSON.stringify(stalls));
  localStorage.setItem('custom_parking_stalls', JSON.stringify(stalls));
};

export const assignParkingStall = (stallId, data) => {
  if (stallId) {
    const rawPlate = data.licensePlate || data.vehiclePlate;
    const cleanTenantId = data.tenantId && !isNaN(Number(data.tenantId)) ? Number(data.tenantId) : null;
    const cleanPropertyId = data.propertyId && !isNaN(Number(data.propertyId)) ? Number(data.propertyId) : undefined;
    apiClient.patch(`/operations/parking/${stallId}/assign`, {
      ...data,
      tenantId: cleanTenantId,
      propertyId: cleanPropertyId,
      vehiclePlate: rawPlate,
    }).catch(() => {});
  }
  const current = getParkingStalls();
  const isNowAssigned = Boolean(
    data.assignedResident ||
    (data.unitNumber && data.unitNumber !== 'Unassigned') ||
    data.status === 'Assigned'
  );
  const updated = current.map((stall) => {
    if (String(stall.id) === String(stallId) || (stall.spotNumber && stall.spotNumber === stallId)) {
      return {
        ...stall,
        ...data,
        status: isNowAssigned ? 'Assigned' : 'Vacant · Available',
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
    propertyName: stall.propertyName || 'Sunrise Residency',
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
    const raw = localStorage.getItem('custom_visitors') || localStorage.getItem('pm_visitors');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read visitors cache', err);
    return INITIAL_VISITORS;
  }
  return INITIAL_VISITORS;
};

export const saveVisitors = (visitors) => {
  localStorage.setItem('pm_visitors', JSON.stringify(visitors));
  localStorage.setItem('custom_visitors', JSON.stringify(visitors));
};

export const logVisitor = async (visitorData) => {
  let created = null;
  try {
    created = await apiClient.post('/operations/visitors', visitorData);
  } catch (err) {
    console.warn('[API] Log visitor failed:', err.message);
  }
  const current = getVisitors();
  const nextId = created?.id || `VIS-${Date.now().toString().slice(-4)}`;
  const passId = created?.passCode || created?.passId || `VPASS-${Math.floor(1000 + Math.random() * 9000)}`;
  const newVisitor = {
    ...created,
    ...visitorData,
    id: nextId,
    passId,
    passCode: passId,
    checkInTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    checkOutTime: null,
    status: 'On-Site Now',
    entryMethod: visitorData.entryMethod || 'Front Desk / Security Check-in',
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
// STAFF DEPARTMENTS
// ──────────────────────────────────────────────
export const DEFAULT_DEPARTMENTS = [
  'Facilities & Repairs',
  'Resident Services',
  'Building Safety',
  'Operations & Cleaning',
  'Management & Admin',
];

export const getDepartments = () => {
  try {
    const raw = localStorage.getItem('pm_staff_departments');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Could not read departments cache', err);
  }
  return DEFAULT_DEPARTMENTS;
};

export const saveDepartments = (departments) => {
  localStorage.setItem('pm_staff_departments', JSON.stringify(departments));
};

export const addDepartment = async (name) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return getDepartments();
  try {
    await apiClient.post('/operations/departments', { name: trimmed });
  } catch (err) {
    console.warn('[API] Create department notice:', err.message);
  }
  const current = getDepartments();
  if (!current.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    saveDepartments(updated);
    return updated;
  }
  return current;
};

export const deleteDepartment = async (name) => {
  const trimmed = (name || '').trim();
  try {
    await apiClient.delete(`/operations/departments/${encodeURIComponent(trimmed)}`);
  } catch (err) {
    console.warn('[API] Delete department notice:', err.message);
  }
  const current = getDepartments();
  const updated = current.filter((d) => d.toLowerCase() !== trimmed.toLowerCase());
  saveDepartments(updated);
  return updated;
};

// ──────────────────────────────────────────────
// STAFF & ACCESS CONTROL
// ──────────────────────────────────────────────
const INITIAL_STAFF = [];

export const getStaff = () => {
  try {
    const raw = localStorage.getItem('pm_staff') || localStorage.getItem('custom_staff');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read staff cache', err);
    return INITIAL_STAFF;
  }
  return INITIAL_STAFF;
};

export const saveStaff = (staff) => {
  try {
    localStorage.setItem('pm_staff', JSON.stringify(staff));
    localStorage.setItem('custom_staff', JSON.stringify(staff));
  } catch (err) {
    console.warn('Could not save staff cache', err);
  }
};

export const addStaff = async (member) => {
  let backendItem = null;
  try {
    const res = await apiClient.post('/operations/staff', {
      propertyId: member.propertyId ? Number(member.propertyId) : undefined,
      name: member.name,
      roleTitle: member.roleTitle || member.role,
      role: member.role || member.roleTitle,
      phone: member.phone || '',
      email: member.email,
      fobKeyId: member.fobKeyId || member.keyFobId || undefined,
      keyFobId: member.keyFobId || member.fobKeyId || undefined,
      department: member.department,
      shift: member.shift,
      activeKeys: member.activeKeys,
    });
    backendItem = res?.data || res?.item || res;
  } catch (err) {
    console.warn('Backend addStaff call error:', err);
  }

  const current = getStaff();
  const nextId = backendItem?.id || `STF-${String(current.length + 1).padStart(2, '0')}`;
  const newMember = {
    ...member,
    id: nextId,
    status: member.status || 'On Duty',
    backgroundCheck: member.backgroundCheck || 'Verified (FDNY / Background Clear)',
    keyFobId: member.keyFobId || backendItem?.keyFobId || backendItem?.fobKeyId || `FOB-${Math.floor(1000 + Math.random() * 9000)}`,
    assignedProperty: member.assignedProperty || backendItem?.propertyName || 'General Portfolio',
    propertyName: member.assignedProperty || backendItem?.propertyName || 'General Portfolio',
  };
  const updated = [newMember, ...current.filter((s) => String(s.id) !== String(newMember.id))];
  saveStaff(updated);
  return updated;
};

export const deleteStaff = async (staffId) => {
  if (staffId && !String(staffId).startsWith('STF-')) {
    try {
      await apiClient.delete(`/operations/staff/${staffId}`);
    } catch (err) {
      console.warn('Backend deleteStaff error:', err);
    }
  }
  const current = getStaff();
  const updated = current.filter((s) => String(s.id) !== String(staffId));
  saveStaff(updated);
  return updated;
};

export const updateStaff = async (staffId, updatedFields) => {
  let backendItem = null;
  if (staffId && !String(staffId).startsWith('STF-')) {
    try {
      const res = await apiClient.put(`/operations/staff/${staffId}`, {
        propertyId: updatedFields.propertyId ? Number(updatedFields.propertyId) : undefined,
        name: updatedFields.name,
        roleTitle: updatedFields.roleTitle || updatedFields.role,
        role: updatedFields.role || updatedFields.roleTitle,
        phone: updatedFields.phone,
        email: updatedFields.email,
        fobKeyId: updatedFields.fobKeyId || updatedFields.keyFobId,
        keyFobId: updatedFields.keyFobId || updatedFields.fobKeyId,
        department: updatedFields.department,
        shift: updatedFields.shift,
        activeKeys: updatedFields.activeKeys,
      });
      backendItem = res?.data || res?.item || res;
    } catch (err) {
      console.warn('Backend updateStaff error:', err);
    }
  }

  const current = getStaff();
  const updated = current.map((s) => {
    if (String(s.id) === String(staffId)) {
      return {
        ...s,
        ...updatedFields,
        ...(backendItem || {}),
        assignedProperty: updatedFields.assignedProperty || backendItem?.propertyName || s.assignedProperty,
        propertyName: updatedFields.assignedProperty || backendItem?.propertyName || s.propertyName,
      };
    }
    return s;
  });
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
  const backendPayload = {
    title: data.title,
    content: data.body || data.content || '',
    targetAudience: data.audience || data.targetAudience || 'All Building Residents',
    isUrgent: Boolean(data.isEmergency || data.isUrgent),
    propertyId: data.propertyId ? Number(data.propertyId) : undefined,
  };
  apiClient.post('/operations/communications', backendPayload).catch(() => {});
  const current = getBroadcasts();
  const nextId = `BC-${Date.now().toString().slice(-3)}`;
  const newBroadcast = {
    id: nextId,
    sentAt: 'Just now',
    sentBy: data.sentBy || 'Robert King (Admin)',
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
