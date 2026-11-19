import apiClient from '../services/apiClient';

export const getProperties = () => {
  const saved = localStorage.getItem('custom_properties');
  if (saved) {
    try {
      const items = JSON.parse(saved);
      if (Array.isArray(items)) {
        // Automatic deduplication: keep only one property per unique name
        const seenNames = new Set();
        const deduplicated = [];
        const duplicatesToDelete = [];

        items.forEach((p) => {
          if (!p) return;
          const key = (p.name || '').trim().toLowerCase();
          if (key && !seenNames.has(key)) {
            seenNames.add(key);
            deduplicated.push(p);
          } else if (key) {
            duplicatesToDelete.push(p);
          } else {
            deduplicated.push(p);
          }
        });

        if (duplicatesToDelete.length > 0) {
          localStorage.setItem('custom_properties', JSON.stringify(deduplicated));
          // Clean up duplicates in background if backend API is reachable
          duplicatesToDelete.forEach((dp) => {
            if (dp.id && !String(dp.id).startsWith('temp')) {
              apiClient.delete(`/properties/${dp.id}`).catch(() => {});
            }
          });
        }
        return deduplicated;
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
};

export const archiveProperty = (id, archived = true) => {
  updateProperty(id, { archived, status: archived ? 'Archived' : 'Active' });
};

export const deleteProperty = async (id) => {
  // 1. Send real DELETE to backend API
  if (id) {
    const isOnline = await apiClient.checkHealth();
    if (isOnline) {
      await apiClient.delete(`/properties/${id}`);
    }
  }

  // 2. Update reactive local cache
  const saved = localStorage.getItem('custom_properties');
  if (saved) {
    try {
      const customItems = JSON.parse(saved);
      const updated = customItems.filter((p) => String(p.id) !== String(id));
      localStorage.setItem('custom_properties', JSON.stringify(updated));
    } catch {}
  }

  // 3. Update reactive local units cache
  const savedUnits = localStorage.getItem('custom_units');
  if (savedUnits) {
    try {
      const uList = JSON.parse(savedUnits);
      const updatedUnits = uList.filter((u) => String(u.propertyId) !== String(id));
      localStorage.setItem('custom_units', JSON.stringify(updatedUnits));
    } catch {}
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
