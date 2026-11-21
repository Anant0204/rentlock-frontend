import apiClient from '../services/apiClient';

const DATA_MODE_KEY = 'rentlock_data_mode';

const CUSTOM_STORAGE_KEYS = [
  'custom_properties',
  'custom_units',
  'custom_tenants',
  'custom_owners',
  'custom_managers',
  'custom_leases',
  'custom_invoices',
  'custom_expenses_us',
  'custom_work_orders_us',
  'custom_work_orders',
  'rentlock_manager_workspace_v1',
  'rentlock_owner_portal_v1',
  'rentlock_tenant_portal_v1',
  'admin_portal_state_v1',
  'pm_user_permissions',
];

export function isDemoMode() {
  try {
    return localStorage.getItem(DATA_MODE_KEY) === 'demo';
  } catch {
    return false;
  }
}

export async function setCleanMode(callBackend = true) {
  try {
    localStorage.setItem(DATA_MODE_KEY, 'clean');
    CUSTOM_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
    if (callBackend) {
      try {
        await apiClient.post('/settings/purge-data');
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export function setDemoMode() {
  try {
    localStorage.setItem(DATA_MODE_KEY, 'demo');
    CUSTOM_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    // ignore
  }
}

export async function clearAllCustomData() {
  await setCleanMode(true);
}

