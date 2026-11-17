import apiClient from '../services/apiClient';

export const getProperties = () => {
  const saved = localStorage.getItem('custom_properties');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const archiveProperty = (id, archived = true) => {
  updateProperty(id, { archived, status: archived ? 'Archived' : 'Active' });
};

export const deleteProperty = (id) => {
  // 1. Send real DELETE to backend API
  if (id) {
    apiClient.delete(`/properties/${id}`).catch((err) => {
      console.warn('[API] Delete property failed:', err.message);
    });
  }

  // 2. Update reactive local cache
  const saved = localStorage.getItem('custom_properties');
  if (saved) {
    const customItems = JSON.parse(saved);
    const updated = customItems.filter((p) => p.id !== id);
    localStorage.setItem('custom_properties', JSON.stringify(updated));
  }
};

export const updateProperty = (id, data) => {
  // 1. Send real PUT/POST to backend API
  if (id && data) {
    apiClient.put(`/properties/${id}`, data).catch((err) => {
      console.warn('[API] Update property failed:', err.message);
    });
  }

  // 2. Update reactive local cache
  const saved = localStorage.getItem('custom_properties');
  const customItems = saved ? JSON.parse(saved) : [];
  const existingIndex = customItems.findIndex((p) => p.id === id);
  if (existingIndex > -1) {
    customItems[existingIndex] = { ...customItems[existingIndex], ...data };
  } else {
    customItems.push({ id, ...data });
    apiClient.post('/properties', { id, ...data }).catch(() => {});
  }
  localStorage.setItem('custom_properties', JSON.stringify(customItems));
};

export const mockProperties = getProperties();
