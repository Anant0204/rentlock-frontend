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
    const payload = {
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      password: manager.password || 'demo123',
      properties: manager.properties || [],
      assignedProperties: manager.properties || [],
    };
    apiClient.post('/managers', payload).catch((err) => {
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
  const saved = localStorage.getItem('custom_managers');
  const customItems = saved ? JSON.parse(saved) : [];
  const existingIndex = customItems.findIndex((m) => String(m.id) === String(id));
  const existing = existingIndex > -1 ? customItems[existingIndex] : null;
  const merged = { ...(existing || {}), ...(data || {}) };

  if (data) {
    const payload = {
      name: merged.name,
      email: merged.email,
      phone: merged.phone,
      password: merged.password || 'demo123',
      properties: merged.properties || [],
      assignedProperties: merged.properties || [],
      archived: merged.archived,
      status: merged.status,
    };
    if (id && !isNaN(Number(id))) {
      apiClient.put(`/managers/${id}`, payload).catch(() => {
        apiClient.post('/managers', payload).catch(() => {});
      });
    } else {
      apiClient.post('/managers', payload).catch(() => {});
    }

    if (Array.isArray(merged.properties)) {
      try {
        const rawProps = localStorage.getItem('custom_properties');
        const propList = rawProps ? JSON.parse(rawProps) : [];
        const assignedSet = new Set(merged.properties.map((p) => String(p).trim().toLowerCase()));
        for (const p of propList) {
          if (p.id && (assignedSet.has(String(p.name).trim().toLowerCase()) || assignedSet.has(String(p.id)))) {
            apiClient.put(`/properties/${p.id}`, { managerId: Number(id) || undefined, manager: merged.name }).catch(() => {});
          }
        }
      } catch {}
    }
  }

  if (existingIndex > -1) {
    customItems[existingIndex] = merged;
  } else {
    customItems.push({ id, ...data });
  }
  localStorage.setItem('custom_managers', JSON.stringify(customItems));
};

export const archiveManager = (id, archived = true) => {
  updateManager(id, { archived, status: archived ? 'Deactivated' : 'Active' });
};

export const deleteManager = async (id, email) => {
  if (id && !isNaN(Number(id))) {
    await apiClient.delete(`/managers/${id}${email ? `?email=${encodeURIComponent(email)}` : ''}`).catch(() => {});
  } else if (email) {
    await apiClient.delete(`/managers/0?email=${encodeURIComponent(email)}`).catch(() => {});
  }

  const saved = localStorage.getItem('custom_managers');
  if (saved) {
    try {
      const customItems = JSON.parse(saved);
      const updated = customItems.filter((m) =>
        String(m.id) !== String(id) &&
        (!email || !m.email || m.email.toLowerCase() !== String(email).toLowerCase())
      );
      localStorage.setItem('custom_managers', JSON.stringify(updated));
    } catch {}
  }

  try {
    const rawProps = localStorage.getItem('custom_properties');
    if (rawProps) {
      const props = JSON.parse(rawProps);
      const updatedProps = props.map((p) => {
        const matchId = p.managerId && String(p.managerId) === String(id);
        const matchEmail = email && p.managerEmail && p.managerEmail.toLowerCase() === String(email).toLowerCase();
        if (matchId || matchEmail) {
          return { ...p, manager: 'Unassigned', managerId: null };
        }
        return p;
      });
      localStorage.setItem('custom_properties', JSON.stringify(updatedProps));
    }
  } catch {}
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
    try {
      const customItems = JSON.parse(saved);
      const updated = customItems.filter((p) => String(p.id) !== String(id));
      localStorage.setItem('custom_owners', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update local storage:', e);
    }
  }
};

export const updateOwner = (id, data) => {
  if (id && data) {
    apiClient.put(`/owners/${id}`, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
    }).catch((err) => {
      console.warn('[API] Update owner in backend failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_owners');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => String(p.id) === String(id));
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
