import { UNIT_TYPES as DEFAULT_TYPES } from './constants';
import apiClient from '../services/apiClient';

const STORAGE_KEY = 'custom_unit_types';

export const getUnitTypes = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {}
  }
  return DEFAULT_TYPES;
};

export const saveUnitTypes = (types) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
};

export const fetchUnitTypesFromBackend = async () => {
  try {
    const res = await apiClient.get('/units/types');
    const data = res?.data !== undefined ? res.data : res;
    if (Array.isArray(data)) {
      saveUnitTypes(data);
      return data;
    }
  } catch (err) {
    console.warn('[unitTypeStore] fetch fallback:', err.message);
  }
  return getUnitTypes();
};

export const addUnitType = async (newType) => {
  const trimmed = (newType || '').trim();
  if (!trimmed) return getUnitTypes();

  try {
    const res = await apiClient.post('/units/types', { name: trimmed });
    const data = res?.data || res;
    if (Array.isArray(data) && data.length > 0) {
      saveUnitTypes(data);
      return data;
    }
  } catch (err) {
    console.warn('[unitTypeStore] add backend save:', err.message);
  }

  const current = getUnitTypes();
  const updated = current.includes(trimmed) ? current : [...current, trimmed];
  saveUnitTypes(updated);
  return updated;
};

export const removeUnitType = async (typeToRemove) => {
  try {
    const res = await apiClient.delete(`/units/types/${encodeURIComponent(typeToRemove)}`);
    const data = res?.data || res;
    if (Array.isArray(data) && data.length > 0) {
      saveUnitTypes(data);
      return data;
    }
  } catch (err) {
    console.warn('[unitTypeStore] delete backend save:', err.message);
  }

  const current = getUnitTypes();
  const updated = current.filter((t) => t !== typeToRemove);
  saveUnitTypes(updated);
  return updated;
};
