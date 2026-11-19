import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// One-time purge of legacy seed dummy data from localStorage
const PURGE_FLAG = 'rentlock_clean_state_v10_db_clean';
if (!localStorage.getItem(PURGE_FLAG)) {
  const keysToRemove = [
    'rentlock_manager_workspace_v1',
    'rentlock_owner_portal_v1',
    'rentlock_tenant_portal_v1',
    'custom_properties',
    'custom_units',
    'custom_tenants',
    'custom_owners',
    'custom_managers',
    'custom_leases',
    'custom_invoices',
    'custom_expenses_us',
    'custom_work_orders_us',
    'custom_complaints',
    'custom_vendors',
    'custom_parking_stalls',
    'custom_visitors',
    'custom_staff',
    'custom_broadcasts',
    'pm_vendors',
    'pm_parking_stalls',
    'pm_visitors',
    'pm_staff',
    'pm_broadcasts',
    'admin_portal_state_v1',
    'rentlock_data_mode'
  ];
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  localStorage.setItem(PURGE_FLAG, 'true');
}

// Globally prevent mouse wheel from changing input[type=number] values anywhere in the app
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    () => {
      if (
        document.activeElement &&
        document.activeElement.tagName === 'INPUT' &&
        document.activeElement.type === 'number'
      ) {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );
}

createRoot(document.getElementById('root')).render(
  <App />
)
