import { mockProperties } from '../data/mockProperties';
import { mockTenants } from '../data/mockTenants';
import { mockUnits } from '../data/mockUnits';
import { getOwners } from '../data/mockExtra';

export const getGlobalSearchResults = (query) => {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase();
  const results = [];

  mockProperties.forEach((p) => {
    if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q)) {
      results.push({
        id: `prop-${p.id}`,
        type: 'Property',
        title: p.name,
        subtitle: `${p.code} · ${p.city}, ${p.state}`,
        path: `/properties/${p.id}`,
        category: 'Properties',
      });
    }
  });

  getOwners().forEach((o) => {
    if (o.name.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q)) {
      results.push({
        id: `owner-${o.id}`,
        type: 'Owner',
        title: o.name,
        subtitle: `${o.ownerType || 'Entity'} · ${o.properties?.join(', ') || 'No properties'}`,
        path: `/owners/${o.id}`,
        category: 'Owners',
      });
    }
  });

  mockUnits.forEach((u) => {
    if (u.unitNumber.toLowerCase().includes(q) || u.propertyName.toLowerCase().includes(q)) {
      results.push({
        id: `unit-${u.id}`,
        type: 'Unit',
        title: u.unitNumber,
        subtitle: `${u.propertyName} · ${u.status}`,
        path: `/units/${u.id}`,
        category: 'Units',
      });
    }
  });

  mockTenants.forEach((t) => {
    if (t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)) {
      results.push({
        id: `tenant-${t.id}`,
        type: 'Tenant',
        title: t.name,
        subtitle: `${t.propertyName} · ${t.unitNumber}`,
        path: `/tenants/${t.id}`,
        category: 'Tenants',
      });
    }
  });

  const pages = [
    { title: 'Dashboard', path: '/dashboard', category: 'Navigation' },
    { title: 'Properties', path: '/properties', category: 'Navigation' },
    { title: 'Units', path: '/units', category: 'Navigation' },
    { title: 'Tenants', path: '/tenants', category: 'Navigation' },
    { title: 'Owners', path: '/owners', category: 'Navigation' },
    { title: 'Leases', path: '/leases', category: 'Navigation' },
    { title: 'Rent & Payments', path: '/rent-payments', category: 'Navigation' },
    { title: 'Invoices & Recurring Charges', path: '/rent-payments?tab=invoices', category: 'Navigation' },
    { title: 'Rent Collections & Aging', path: '/rent-payments?tab=collections', category: 'Navigation' },
    { title: 'Payment Ledger', path: '/rent-payments?tab=ledger', category: 'Navigation' },
    { title: 'Receipts', path: '/rent-payments?tab=receipts', category: 'Navigation' },
    { title: 'Security Deposits', path: '/rent-payments?tab=deposits', category: 'Navigation' },
    { title: 'Maintenance', path: '/maintenance', category: 'Navigation' },
    { title: 'Expenses', path: '/expenses', category: 'Navigation' },
    { title: 'Reports', path: '/reports', category: 'Navigation' },
    { title: 'Settings', path: '/settings', category: 'Navigation' },
  ];

  pages.forEach((p) => {
    if (p.title.toLowerCase().includes(q)) {
      results.push({
        ...p,
        id: `page-${p.path}`,
        type: 'Page',
        subtitle: 'Jump to Module',
      });
    }
  });

  return results.slice(0, 8);
};
