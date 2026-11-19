import { AMENITIES as DEFAULT_AMENITIES } from './constants';

const STORAGE_KEY = 'custom_building_amenities';

export const getAmenities = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 0) {
        return parsed;
      }
    } catch {}
  }
  return [...DEFAULT_AMENITIES];
};

export const saveAmenities = (amenities) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(amenities));
};

export const addAmenity = (name) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return getAmenities();

  const current = getAmenities();
  const exists = current.some((a) => a.toLowerCase() === trimmed.toLowerCase());
  if (exists) return current;

  const updated = [...current, trimmed];
  saveAmenities(updated);
  return updated;
};

export const deleteAmenity = (name) => {
  const current = getAmenities();
  const updated = current.filter((a) => a.toLowerCase() !== (name || '').trim().toLowerCase());
  saveAmenities(updated);
  return updated;
};

export const resetAmenities = () => {
  saveAmenities([...DEFAULT_AMENITIES]);
  return [...DEFAULT_AMENITIES];
};
