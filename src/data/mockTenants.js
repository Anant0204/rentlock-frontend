import apiClient from '../services/apiClient';

export const getTenants = () => {
  const saved = localStorage.getItem('custom_tenants');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const addTenant = (tenant) => {
  const saved = localStorage.getItem('custom_tenants');
  const customItems = saved ? JSON.parse(saved) : [];
  const allCurrent = getTenants();
  const maxId = allCurrent.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
  const newTenant = {
    ...tenant,
    id: tenant.id || maxId + 1,
    status: tenant.status || 'Active',
    screeningStatus: tenant.screeningStatus || 'Consent Verified · Approved',
    dueAmount: Number(tenant.dueAmount) || 0,
    rent: Number(tenant.rent) || 2000,
    deposit: Number(tenant.deposit) || 2000,
    smsOptIn: tenant.smsOptIn ?? true,
    moveInDate: tenant.moveInDate || new Date().toISOString().split('T')[0],
  };

  // 1. Send real POST to backend API
  apiClient.post('/tenants', newTenant).catch((err) => {
    console.warn('[API] Add tenant failed:', err.message);
  });

  // 2. Update reactive local cache
  customItems.push(newTenant);
  localStorage.setItem('custom_tenants', JSON.stringify(customItems));
  return newTenant;
};

export const deleteTenant = (id) => {
  // 1. Send real DELETE to backend API
  if (id) {
    apiClient.delete(`/tenants/${id}`).catch((err) => {
      console.warn('[API] Delete tenant failed:', err.message);
    });
  }

  // 2. Update reactive local cache
  const saved = localStorage.getItem('custom_tenants');
  if (saved) {
    const customItems = JSON.parse(saved);
    const updated = customItems.filter((p) => p.id !== id);
    localStorage.setItem('custom_tenants', JSON.stringify(updated));
  }
};

export const updateTenant = (id, data) => {
  // 1. Send real PUT to backend API
  if (id && data) {
    apiClient.put(`/tenants/${id}`, data).catch((err) => {
      console.warn('[API] Update tenant failed:', err.message);
    });
  }

  // 2. Update reactive local cache
  const saved = localStorage.getItem('custom_tenants');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => p.id === id);
  if (index > -1) {
    customItems[index] = { ...customItems[index], ...data };
  } else {
    customItems.push({ id, ...data });
  }
  localStorage.setItem('custom_tenants', JSON.stringify(customItems));
};

export const mockTenants = getTenants();
