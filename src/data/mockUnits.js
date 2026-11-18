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

export const archiveUnit = async (id, archived = true) => {
  await updateUnit(id, { archived, status: archived ? 'Maintenance' : 'Vacant' });
};

export const deleteUnit = async (id) => {
  if (id) {
    try {
      await apiClient.delete(`/units/${id}`);
    } catch (err) {
      console.warn('[API] Delete unit error:', err.message);
      if (err.status !== 404) {
        throw err;
      }
    }
  }

  const saved = localStorage.getItem('custom_units');
  if (saved) {
    try {
      const customItems = JSON.parse(saved);
      const updated = customItems.filter((p) => String(p.id) !== String(id));
      localStorage.setItem('custom_units', JSON.stringify(updated));
    } catch {}
  }
};

export const updateUnit = async (id, data) => {
  if (id && data) {
    try {
      await apiClient.put(`/units/${id}`, data);
    } catch (err) {
      console.warn('[API] Update unit failed:', err.message);
    }
  }

  const saved = localStorage.getItem('custom_units');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => String(p.id) === String(id));
  if (index > -1) {
    customItems[index] = { ...customItems[index], ...data };
  } else {
    customItems.push({ id, ...data });
    apiClient.post('/units', { id, ...data }).catch(() => {});
  }
  localStorage.setItem('custom_units', JSON.stringify(customItems));
};

export const addUnit = async (unitData) => {
  let created = null;
  try {
    created = await apiClient.post('/units', {
      propertyId: Number(unitData.propertyId) || undefined,
      unitNumber: String(unitData.unitNumber || '101'),
      floor: Number(unitData.floor) || 1,
      bedrooms: Number(unitData.bedrooms || unitData.beds) || 1,
      bathrooms: Number(unitData.bathrooms || unitData.baths) || 1,
      sqft: Number(unitData.sqft || unitData.size) || 850,
      rentAmount: Number(unitData.rentAmount || unitData.rent) || 2000,
      depositAmount: Number(unitData.depositAmount || unitData.rentAmount || unitData.rent) || 2000,
      status: unitData.status || 'Vacant',
    });
  } catch (err) {
    console.warn('[API] Add unit failed:', err.message);
  }

  const saved = localStorage.getItem('custom_units');
  const customItems = saved ? JSON.parse(saved) : [];
  const maxId = customItems.reduce((m, u) => Math.max(m, Number(u.id) || 0), 0);
  const newUnit = {
    ...unitData,
    id: created?.id || maxId + 1,
    status: unitData.status || 'Vacant',
  };
  customItems.push(newUnit);
  localStorage.setItem('custom_units', JSON.stringify(customItems));
  return newUnit;
};

export const mockUnits = getUnits();
