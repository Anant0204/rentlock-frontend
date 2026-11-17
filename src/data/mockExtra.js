import apiClient from '../services/apiClient';

export const mockExpenses = [];
export const mockComplaints = [];

export const getManagers = () => {
  const saved = localStorage.getItem('custom_managers');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const addManager = (manager) => {
  if (manager && manager.email) {
    apiClient.post('/managers', {
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      password: manager.password || 'demo123',
    }).catch((err) => {
      console.warn('[API] Create manager in backend failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_managers');
  const customItems = saved ? JSON.parse(saved) : [];
  const allCurrent = getManagers();
  const maxId = allCurrent.reduce((m, item) => Math.max(m, Number(item.id) || 0), 0);
  const newManager = {
    ...manager,
    id: manager.id || maxId + 1,
    role: 'Property Manager',
    password: manager.password || 'demo123',
    employmentType: manager.employmentType || 'Full-Time',
    spendingCap: Number(manager.spendingCap) || 1000,
    properties: manager.properties || [],
    shift: manager.shift || 'Day (8 AM–5 PM)',
    status: manager.status || 'Active',
    activeWorkOrders: manager.activeWorkOrders || 0,
    attendance: manager.attendance || 100,
    rating: manager.rating || 5.0,
    archived: false,
  };
  customItems.push(newManager);
  localStorage.setItem('custom_managers', JSON.stringify(customItems));
  return newManager;
};

export const updateManager = (id, data) => {
  if (data && (data.email || data.name || data.password)) {
    apiClient.post('/managers', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password || 'demo123',
    }).catch(() => {});
  }

  const saved = localStorage.getItem('custom_managers');
  const customItems = saved ? JSON.parse(saved) : [];
  const existingIndex = customItems.findIndex((m) => String(m.id) === String(id));
  if (existingIndex > -1) {
    customItems[existingIndex] = { ...customItems[existingIndex], ...data };
  } else {
    customItems.push({ id, ...data });
  }
  localStorage.setItem('custom_managers', JSON.stringify(customItems));
};

export const archiveManager = (id, archived = true) => {
  updateManager(id, { archived, status: archived ? 'Archived' : 'Active' });
};

export const deleteManager = (id) => {
  const saved = localStorage.getItem('custom_managers');
  if (saved) {
    const customItems = JSON.parse(saved);
    const updated = customItems.filter((m) => String(m.id) !== String(id));
    localStorage.setItem('custom_managers', JSON.stringify(updated));
  }
};

export const mockStaff = [];

export const getOwners = () => {
  const saved = localStorage.getItem('custom_owners');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const addOwner = (owner) => {
  if (owner && owner.email) {
    apiClient.post('/owners', {
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      password: owner.password || 'demo123',
    }).catch((err) => {
      console.warn('[API] Create owner in backend failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_owners');
  const customItems = saved ? JSON.parse(saved) : [];
  const allCurrent = getOwners();
  const maxId = allCurrent.reduce((m, o) => Math.max(m, Number(o.id) || 0), 0);
  const newOwner = {
    ...owner,
    id: owner.id || maxId + 1,
    password: owner.password || 'demo123',
    archived: false,
    status: owner.status || 'Active',
    totalRevenue: owner.totalRevenue || 0,
    totalExpenses: owner.totalExpenses || 0,
    netIncome: owner.netIncome || 0,
    distributionsYtd: owner.distributionsYtd || 0,
    allocations: owner.allocations || [],
    properties: owner.properties || [],
  };
  customItems.push(newOwner);
  localStorage.setItem('custom_owners', JSON.stringify(customItems));
  return newOwner;
};

export const archiveOwner = (id, archived = true) => {
  updateOwner(id, { archived, status: archived ? 'Archived' : 'Active' });
};

export const deleteOwner = (id) => {
  const saved = localStorage.getItem('custom_owners');
  if (saved) {
    const customItems = JSON.parse(saved);
    const updated = customItems.filter((p) => p.id !== id);
    localStorage.setItem('custom_owners', JSON.stringify(updated));
  }
};

export const updateOwner = (id, data) => {
  const saved = localStorage.getItem('custom_owners');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => p.id === id);
  if (index > -1) {
    customItems[index] = { ...customItems[index], ...data };
  } else {
    customItems.push({ id, ...data });
  }
  localStorage.setItem('custom_owners', JSON.stringify(customItems));
};

export const mockOwners = getOwners();

export const mockLeads = [];
export const mockDocuments = [];
export const mockVisitors = [];
export const mockVehicles = [];
export const mockAssets = [];
export const mockVendors = [];

export const mockReports = {
  revenueByMonth: [],
  occupancyByProperty: [],
  expenseByCategory: [],
  collectionEfficiency: [],
};
