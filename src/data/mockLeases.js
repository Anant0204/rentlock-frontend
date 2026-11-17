import apiClient from '../services/apiClient';

export const getLeases = () => {
  const saved = localStorage.getItem('custom_leases');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const archiveLease = (id, archived = true) => {
  updateLease(id, { archived, status: archived ? 'Archived' : 'Active' });
};

export const deleteLease = (id) => {
  if (id) {
    apiClient.delete(`/leases/${id}`).catch((err) => {
      console.warn('[API] Delete lease failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_leases');
  if (saved) {
    const customItems = JSON.parse(saved);
    const updated = customItems.filter((p) => p.id !== id);
    localStorage.setItem('custom_leases', JSON.stringify(updated));
  }
};

export const updateLease = (id, data) => {
  if (id && data) {
    apiClient.put(`/leases/${id}`, data).catch((err) => {
      console.warn('[API] Update lease failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_leases');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => p.id === id);
  if (index > -1) {
    customItems[index] = { ...customItems[index], ...data };
  } else {
    customItems.push({ id, ...data });
    apiClient.post('/leases', { id, ...data }).catch(() => {});
  }
  localStorage.setItem('custom_leases', JSON.stringify(customItems));
};

export const mockLeases = getLeases();
