import apiClient from '../services/apiClient';

export const getLeases = () => {
  const saved = localStorage.getItem('custom_leases');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const archiveLease = (id, archived = true) => {
  updateLease(id, { archived, status: archived ? 'Archived' : 'Active' });
};

export const deleteLease = (id) => {
  if (id) {
    apiClient.delete(`/leases/${id}`).catch((err) => {
      console.warn('[API] Delete lease failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_leases');
  if (saved) {
    const customItems = JSON.parse(saved);
    const updated = customItems.filter((p) => String(p.id) !== String(id));
    localStorage.setItem('custom_leases', JSON.stringify(updated));
    try {
      window.dispatchEvent(new Event('rentlock_leases_changed'));
    } catch {}
  }
};

export const updateLease = (id, data) => {
  const saved = localStorage.getItem('custom_leases');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => String(p.id) === String(id));

  const cleanPayload = {
    ...data,
    id: id || data.id,
    propertyId: data.propertyId ? Number(data.propertyId) : undefined,
    propertyName: data.propertyName,
    unitId: data.unitId ? Number(data.unitId) : undefined,
    unitNumber: data.unitNumber,
    tenantId: data.tenantId ? Number(data.tenantId) : undefined,
    tenantName: data.tenantName,
    tenantEmail: data.tenantEmail || data.coSigners?.[0]?.email,
    startDate: data.startDate,
    endDate: data.endDate,
    monthlyRent: Number(data.monthlyRent || data.rent || 0),
    rent: Number(data.monthlyRent || data.rent || 0),
    securityDeposit: Number(data.deposit || data.securityDeposit || 0),
    deposit: Number(data.deposit || data.securityDeposit || 0),
    status: data.status || 'Draft',
    termsText: data.specialClauses || data.termsText || 'Standard Residential Lease Agreement terms apply.',
  };

  if (index > -1) {
    // Existing lease -> send PUT
    customItems[index] = { ...customItems[index], ...data };
    apiClient.put(`/leases/${id}`, cleanPayload).catch((err) => {
      console.warn('[API] Update lease failed:', err.message);
    });
  } else {
    // New lease -> send POST
    const newLease = { id, ...data };
    customItems.unshift(newLease);
    apiClient
      .post('/leases', cleanPayload)
      .then((res) => {
        if (res && res.id) {
          newLease.backendId = res.id;
          newLease.leaseNumber = res.leaseNumber || newLease.leaseNumber;
          localStorage.setItem('custom_leases', JSON.stringify(customItems));
        }
      })
      .catch((err) => {
        console.warn('[API] Create lease failed:', err.message);
      });
  }

  localStorage.setItem('custom_leases', JSON.stringify(customItems));
  try {
    window.dispatchEvent(new Event('rentlock_leases_changed'));
  } catch {}
};

export const mockLeases = getLeases();
