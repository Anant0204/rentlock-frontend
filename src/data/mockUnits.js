import apiClient from '../services/apiClient';

export const getUnits = () => {
  const saved = localStorage.getItem('custom_units');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const archiveUnit = (id, archived = true) => {
  updateUnit(id, { archived, status: archived ? 'Archived' : 'Vacant' });
};

export const deleteUnit = (id) => {
  if (id) {
    apiClient.delete(`/units/${id}`).catch((err) => {
      console.warn('[API] Delete unit failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_units');
  if (saved) {
    const customItems = JSON.parse(saved);
    const updated = customItems.filter((p) => p.id !== id);
    localStorage.setItem('custom_units', JSON.stringify(updated));
  }
};

export const updateUnit = (id, data) => {
  if (id && data) {
    apiClient.put(`/units/${id}`, data).catch((err) => {
      console.warn('[API] Update unit failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_units');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => p.id === id);
  if (index > -1) {
    customItems[index] = { ...customItems[index], ...data };
  } else {
    customItems.push({ id, ...data });
    apiClient.post('/units', { id, ...data }).catch(() => {});
  }
  localStorage.setItem('custom_units', JSON.stringify(customItems));
};

export const mockUnits = getUnits();
