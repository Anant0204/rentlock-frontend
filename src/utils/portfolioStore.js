import apiClient from '../services/apiClient';

const STORAGE_KEY = 'rentlock_portfolio_groups';

export const DEFAULT_PORTFOLIOS = [
  'Brooklyn & Queens',
  'New Jersey',
  'Texas Commercial & Resi',
  'Core East Coast',
];

export function getPortfoliosSync() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_PORTFOLIOS];
}

export async function fetchPortfolios() {
  try {
    const res = await apiClient.get('/properties/portfolios');
    const items = res?.data || res?.items || res;
    if (Array.isArray(items) && items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[Portfolios] Fetch from backend failed, using cache:', err.message);
  }
  return getPortfoliosSync();
}

export async function addPortfolioGroup(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return getPortfoliosSync();

  const current = getPortfoliosSync();
  if (!current.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
    current.push(trimmed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

  try {
    const res = await apiClient.post('/properties/portfolios', { name: trimmed });
    const items = res?.data?.portfolios || res?.portfolios || res?.data || res;
    if (Array.isArray(items) && items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('rentlock_portfolios_updated', { detail: items }));
      return items;
    }
  } catch (err) {
    console.warn('[Portfolios] Add backend failed:', err.message);
  }

  window.dispatchEvent(new CustomEvent('rentlock_portfolios_updated', { detail: current }));
  return current;
}

export async function deletePortfolioGroup(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return getPortfoliosSync();

  const current = getPortfoliosSync().filter((p) => p.toLowerCase() !== trimmed.toLowerCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

  try {
    const res = await apiClient.delete(`/properties/portfolios/${encodeURIComponent(trimmed)}`);
    const items = res?.data?.portfolios || res?.portfolios || res?.data || res;
    if (Array.isArray(items)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('rentlock_portfolios_updated', { detail: items }));
      return items;
    }
  } catch (err) {
    console.warn('[Portfolios] Delete backend failed:', err.message);
  }

  window.dispatchEvent(new CustomEvent('rentlock_portfolios_updated', { detail: current }));
  return current;
}
