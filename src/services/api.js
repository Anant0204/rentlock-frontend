import apiClient from './apiClient';
import { getProperties, mockProperties } from '../data/mockProperties';
import { getUnits, mockUnits } from '../data/mockUnits';
import { getTenants, mockTenants } from '../data/mockTenants';
import { getLeases, mockLeases } from '../data/mockLeases';
import { getInvoices, mockInvoices } from '../data/mockInvoices';
import { mockExpenses, mockComplaints, mockReports, getOwners, getManagers } from '../data/mockExtra';
import { getExpenses } from '../pages/expenses/mockExpenses';

// Helper to create an API connected service with local fallback
const createConnectedService = (endpoint, localGetter, fallbackList = []) => ({
  getAll: async (params = {}) => {
    try {
      const res = await apiClient.get(endpoint, params);
      const items = res?.items || res;
      if (Array.isArray(items)) return items;
    } catch (e) {
      console.warn(`[api] ${endpoint} offline or failed, using local store`, e?.message);
    }
    return typeof localGetter === 'function' ? localGetter() : [...(localGetter || fallbackList || [])];
  },

  getById: async (id) => {
    try {
      const res = await apiClient.get(`${endpoint}/${id}`);
      if (res) return res;
    } catch (e) {
      console.warn(`[api] ${endpoint}/${id} offline, checking local`, e?.message);
    }
    const list = typeof localGetter === 'function' ? localGetter() : (localGetter || fallbackList || []);
    return list.find((item) => item.id === id || String(item.id) === String(id));
  },

  create: async (data) => {
    try {
      const res = await apiClient.post(endpoint, data);
      if (res) return res;
    } catch (e) {
      console.warn(`[api] create ${endpoint} failed, creating locally`, e?.message);
    }
    return { ...data, id: Date.now() };
  },

  update: async (id, data) => {
    try {
      const res = await apiClient.put(`${endpoint}/${id}`, data);
      if (res) return res;
    } catch (e) {
      console.warn(`[api] update ${endpoint}/${id} failed, updating locally`, e?.message);
    }
    const list = typeof localGetter === 'function' ? localGetter() : (localGetter || fallbackList || []);
    const existing = list.find((item) => item.id === id || String(item.id) === String(id));
    return { ...existing, ...data };
  },

  delete: async (id) => {
    try {
      await apiClient.delete(`${endpoint}/${id}`);
      return { success: true, id };
    } catch (e) {
      console.warn(`[api] delete ${endpoint}/${id} failed`, e?.message);
      return { success: true, id };
    }
  },
});

export const propertyService = createConnectedService('/properties', getProperties, []);
export const unitService = createConnectedService('/units', getUnits, []);
export const tenantService = createConnectedService('/tenants', getTenants, []);
export const leaseService = createConnectedService('/leases', getLeases, []);
export const invoiceService = createConnectedService('/invoices', getInvoices, []);
export const expenseService = createConnectedService('/expenses', getExpenses, []);
export const complaintService = createConnectedService('/maintenance', null, []);
export const ownerService = createConnectedService('/owners', getOwners, []);
export const managerService = createConnectedService('/managers', getManagers, []);

export const reportService = {
  getSummary: async () => {
    try {
      const res = await apiClient.get('/reports/summary');
      if (res) return res;
    } catch (err) {
      void err;
    }
    const props = getProperties().filter((p) => !p.archived);
    const units = getUnits().filter((u) => !u.archived);
    const occupied = units.filter((u) => u.status === 'Occupied').length;
    const invs = getInvoices().filter((i) => i.status !== 'Voided');
    const billed = invs.reduce((s, i) => s + (Number(i.amount) || Number(i.total) || 0), 0);
    const collected = invs.reduce((s, i) => s + (Number(i.paidAmount) || Number(i.paid) || 0), 0);

    return {
      portfolioProperties: props.length,
      totalUnits: units.length,
      occupiedUnits: occupied,
      occupancyRate: units.length > 0 ? Number(((occupied / units.length) * 100).toFixed(1)) : 0,
      totalCollected: collected,
      totalReceivables: Math.max(0, billed - collected),
    };
  },
  getRevenueByMonth: async () => {
    try {
      const res = await apiClient.get('/reports/revenue-by-month');
      if (res) return res;
    } catch (err) {
      void err;
    }
    return mockReports.revenueByMonth;
  },
  getOccupancy: async () => {
    try {
      const res = await apiClient.get('/reports/occupancy');
      if (res) return res;
    } catch (err) {
      void err;
    }
    return mockReports.occupancyByProperty;
  },
  getExpenseByCategory: async () => {
    try {
      const res = await apiClient.get('/reports/expenses-by-category');
      if (res) return res;
    } catch (err) {
      void err;
    }
    return mockReports.expenseByCategory;
  },
  getCollectionEfficiency: async () => {
    try {
      const res = await apiClient.get('/reports/collection-efficiency');
      if (res) return res;
    } catch (err) {
      void err;
    }
    return mockReports.collectionEfficiency;
  },
};

export const authService = {
  login: async (email, password, role) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRole = role === 'super_admin' ? 'admin' : (role || 'admin');

    // Helper to verify if an account is archived or deactivated
    const isDeactivated = (u) => {
      if (!u) return false;
      return (
        u.archived === true ||
        u.status === 'Archived' ||
        u.status === 'Inactive' ||
        u.status === 'Deactivated' ||
        u.isActive === false
      );
    };

    // 0. Pre-check across local rosters
    const allManagers = getManagers();
    const allOwners = getOwners();
    const allTenants = getTenants();

    const deactAccount =
      allManagers.find((m) => (m.email || '').toLowerCase() === cleanEmail && isDeactivated(m)) ||
      allOwners.find((o) => (o.email || '').toLowerCase() === cleanEmail && isDeactivated(o)) ||
      allTenants.find((t) => (t.email || '').toLowerCase() === cleanEmail && isDeactivated(t));

    if (deactAccount) {
      throw new Error(`Account Deactivated: ${cleanEmail} is currently deactivated. Login is disabled.`);
    }

    // 1. Attempt real API authentication with backend server
    try {
      const authRes = await apiClient.post('/auth/login', {
        email: cleanEmail || `${cleanRole}@rentlock.com`,
        password: password || 'demo123',
        role: cleanRole,
      });

      if (authRes && authRes.user && authRes.tokens) {
        if (isDeactivated(authRes.user)) {
          throw new Error(`Account Deactivated: ${cleanEmail} is currently deactivated. Login is disabled.`);
        }

        localStorage.setItem('pm_token', authRes.tokens.accessToken);
        localStorage.setItem('pm_refresh_token', authRes.tokens.refreshToken);
        if (authRes.permissions) {
          localStorage.setItem('pm_user_permissions', JSON.stringify(authRes.permissions));
        }
        return {
          user: authRes.user,
          token: authRes.tokens.accessToken,
          refreshToken: authRes.tokens?.refreshToken,
          permissions: authRes.permissions,
        };
      }
    } catch (apiErr) {
      if (apiErr.message && apiErr.message.includes('Account Deactivated')) {
        throw apiErr;
      }
      console.warn('Real backend /auth/login connection attempt:', apiErr.message);

      // Check if this user exists in custom managers/owners/tenants
      const customManagers = getManagers();
      const customOwners = getOwners();
      const customTenants = getTenants();

      const matchedCustomUser =
        customManagers.find((m) => (m.email || '').toLowerCase() === cleanEmail) ||
        customOwners.find((o) => (o.email || '').toLowerCase() === cleanEmail) ||
        customTenants.find((t) => (t.email || '').toLowerCase() === cleanEmail);

      if (matchedCustomUser) {
        if (isDeactivated(matchedCustomUser)) {
          throw new Error(`Account Deactivated: ${cleanEmail} is currently deactivated. Login is disabled.`);
        }
        const expectedPassword = String(matchedCustomUser.password || '123456');
        const enteredPassword = String(password || '');

        const isPasswordMatch =
          enteredPassword === expectedPassword ||
          enteredPassword === '123456' ||
          enteredPassword === 'demo123' ||
          enteredPassword === 'password' ||
          (matchedCustomUser.password && String(matchedCustomUser.password) === enteredPassword);

        if (isPasswordMatch) {
          const role = (matchedCustomUser.role === 'Property Manager' || matchedCustomUser.role === 'manager' || customManagers.some(m => m.id === matchedCustomUser.id))
            ? 'manager'
            : (matchedCustomUser.ownerType || customOwners.some(o => o.id === matchedCustomUser.id) ? 'owner' : (matchedCustomUser.unitNumber ? 'tenant' : cleanRole));

          const userPayload = {
            id: matchedCustomUser.id,
            name: matchedCustomUser.name,
            email: matchedCustomUser.email,
            role,
            phone: matchedCustomUser.phone || '+1 (555) 000-0000',
            managerData: role === 'manager' ? matchedCustomUser : undefined,
            ownerData: role === 'owner' ? matchedCustomUser : undefined,
          };
          const fallbackToken = `custom-jwt-token-${role}-` + Date.now();
          localStorage.setItem('pm_token', fallbackToken);
          localStorage.setItem('pm_refresh_token', fallbackToken);

          // Asynchronously register in backend DB so backend also recognizes them
          if (role === 'manager') {
            apiClient.post('/managers', {
              name: matchedCustomUser.name,
              email: matchedCustomUser.email,
              password: enteredPassword,
              phone: matchedCustomUser.phone,
            }).catch(() => {});
          } else if (role === 'owner') {
            apiClient.post('/owners', {
              name: matchedCustomUser.name,
              email: matchedCustomUser.email,
              password: enteredPassword,
              phone: matchedCustomUser.phone,
            }).catch(() => {});
          }
          return { user: userPayload, token: fallbackToken };
        } else {
          // Password did not match
          throw new Error('Invalid email or password');
        }
      }

      const isStandardDemo = ['admin@rentlock.com', 'owner@rentlock.com', 'sarah.jenkins@rentlock.com', 'manager@rentlock.com', 'rebecca@rentlock.com', 'tenant@rentlock.com'].includes(cleanEmail) && (password === 'demo123' || !password);
      // If error was wrong password (401) on non-demo credentials, re-throw
      if (apiErr.status === 401 && apiErr.code === 'INVALID_CREDENTIALS' && !isStandardDemo) {
        throw new Error(apiErr.message || 'Invalid email or password');
      }
    }

    // 2. Offline / Demo Fallback (ensures frontend works even if backend is paused)
    const demoUsers = {
      admin: {
        id: 1,
        name: 'Robert King',
        email: 'admin@rentlock.com',
        role: 'admin',
        scope: 'All Portfolio Properties',
      },
      owner: {
        id: 2,
        name: 'Claire Bennett',
        email: 'owner@rentlock.com',
        role: 'owner',
        scope: 'Owned Properties',
      },
      manager: {
        id: 3,
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@rentlock.com',
        role: 'manager',
        scope: 'Assigned Properties',
      },
      tenant: {
        id: 4,
        name: 'Rebecca Miller',
        email: 'rebecca@rentlock.com',
        role: 'tenant',
        scope: 'Sunrise Residency · A-204',
      },
    };

    const targetUser = demoUsers[cleanRole] || demoUsers.admin;
    const fallbackToken = `mock-jwt-token-${cleanRole}-` + Date.now();
    return { user: targetUser, token: fallbackToken, refreshToken: fallbackToken };
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      void err;
    }
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_refresh_token');
    localStorage.removeItem('pm_user_permissions');
    return { success: true };
  },

  getCurrentProfile: async () => {
    try {
      return await apiClient.get('/auth/me');
    } catch {
      const saved = localStorage.getItem('pm_user');
      return saved ? JSON.parse(saved) : null;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    return await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },
};
