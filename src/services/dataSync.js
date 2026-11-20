import apiClient from './apiClient';

let isSyncing = false;
let hasSynced = false;

/**
 * Backend Data Synchronizer
 * Loads live records from the real REST API and hydrates the local reactive stores.
 */
export async function syncBackendData(force = false) {
  if (isSyncing || (hasSynced && !force)) return false;
  isSyncing = true;
  try {
    const isOnline = await apiClient.checkHealth();
    if (!isOnline) {
      console.log('ℹ️ Real backend is not currently running. Using local cached store.');
      return false;
    }

    console.log('🔄 Connected to real backend. Synchronizing live data...');

    // Fetch live datasets in parallel
    const [
      propertiesRes,
      unitsRes,
      tenantsRes,
      leasesRes,
      invoicesRes,
      expensesRes,
      ticketsRes,
      vendorsRes,
      parkingRes,
      visitorsRes,
      staffRes,
      broadcastsRes,
    ] = await Promise.allSettled([
      apiClient.get('/properties?limit=100'),
      apiClient.get('/units?limit=100'),
      apiClient.get('/tenants?limit=100'),
      apiClient.get('/leases?limit=100'),
      apiClient.get('/invoices?limit=100'),
      apiClient.get('/expenses?limit=100'),
      apiClient.get('/maintenance?limit=100'),
      apiClient.get('/operations/vendors'),
      apiClient.get('/operations/parking'),
      apiClient.get('/operations/visitors'),
      apiClient.get('/operations/staff'),
      apiClient.get('/operations/communications'),
    ]);

    // Hydrate Properties
    if (propertiesRes.status === 'fulfilled' && propertiesRes.value) {
      const items = propertiesRes.value.items || propertiesRes.value;
      if (Array.isArray(items) && items.length > 0) {
        localStorage.setItem('custom_properties', JSON.stringify(items));
      }
    }

    // Hydrate Units
    if (unitsRes.status === 'fulfilled' && unitsRes.value) {
      const items = unitsRes.value.items || unitsRes.value;
      if (Array.isArray(items) && items.length > 0) {
        localStorage.setItem('custom_units', JSON.stringify(items));
      }
    }

    // Hydrate Tenants
    if (tenantsRes.status === 'fulfilled' && tenantsRes.value) {
      const items = tenantsRes.value.items || tenantsRes.value;
      if (Array.isArray(items) && items.length > 0) {
        localStorage.setItem('custom_tenants', JSON.stringify(items));
      }
    }

    // Hydrate Leases
    if (leasesRes.status === 'fulfilled' && leasesRes.value) {
      const items = leasesRes.value.items || leasesRes.value;
      if (Array.isArray(items) && items.length > 0) {
        localStorage.setItem('custom_leases', JSON.stringify(items));
      }
    }

    // Hydrate Invoices
    if (invoicesRes.status === 'fulfilled' && invoicesRes.value) {
      const items = invoicesRes.value.items || invoicesRes.value;
      if (Array.isArray(items) && items.length > 0) {
        localStorage.setItem('custom_invoices', JSON.stringify(items));
      }
    }

    // Hydrate Expenses
    if (expensesRes.status === 'fulfilled' && expensesRes.value) {
      const items = expensesRes.value.items || expensesRes.value;
      if (Array.isArray(items) && items.length > 0) {
        localStorage.setItem('custom_expenses_us', JSON.stringify(items));
      }
    }

    // Hydrate Maintenance Tickets
    if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
      const items = ticketsRes.value.items || ticketsRes.value;
      if (Array.isArray(items) && items.length > 0) {
        localStorage.setItem('custom_work_orders_us', JSON.stringify(items));
        localStorage.setItem('custom_complaints', JSON.stringify(items));
      }
    }

    // Hydrate Operations directly from backend responses
    if (vendorsRes.status === 'fulfilled' && Array.isArray(vendorsRes.value)) {
      localStorage.setItem('pm_vendors', JSON.stringify(vendorsRes.value));
      localStorage.setItem('custom_vendors', JSON.stringify(vendorsRes.value));
    }
    if (parkingRes.status === 'fulfilled' && Array.isArray(parkingRes.value)) {
      localStorage.setItem('pm_parking', JSON.stringify(parkingRes.value));
      localStorage.setItem('custom_parking_stalls', JSON.stringify(parkingRes.value));
    }
    if (visitorsRes.status === 'fulfilled' && Array.isArray(visitorsRes.value)) {
      localStorage.setItem('pm_visitors', JSON.stringify(visitorsRes.value));
      localStorage.setItem('custom_visitors', JSON.stringify(visitorsRes.value));
    }
    if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
      localStorage.setItem('pm_staff', JSON.stringify(staffRes.value));
      localStorage.setItem('custom_staff', JSON.stringify(staffRes.value));
    }
    if (broadcastsRes.status === 'fulfilled' && Array.isArray(broadcastsRes.value)) {
      localStorage.setItem('pm_broadcasts', JSON.stringify(broadcastsRes.value));
    }

    console.log('✅ Live data sync completed successfully from backend.');
    hasSynced = true;
    return true;
  } catch (err) {
    console.warn('Data sync encountered an error:', err);
    return false;
  } finally {
    isSyncing = false;
  }
}
