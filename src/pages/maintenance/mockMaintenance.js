import apiClient from '../../services/apiClient';

export const getComplaints = () => {
  const saved = localStorage.getItem('custom_complaints');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const saveComplaint = (data) => {
  if (data) {
    apiClient.post('/maintenance', {
      propertyId: Number(data.propertyId) || 1,
      unitId: data.unitId ? Number(data.unitId) : undefined,
      tenantId: data.tenantId ? Number(data.tenantId) : undefined,
      title: data.title || 'Maintenance Request',
      description: data.description || 'General repair issue reported',
      category: data.category || 'General',
      priority: data.priority || 'Medium',
    }).catch((err) => {
      console.warn('[API] Create maintenance ticket failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_complaints');
  const customItems = saved ? JSON.parse(saved) : [];
  const newId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  customItems.push({ ...data, id: newId });
  localStorage.setItem('custom_complaints', JSON.stringify(customItems));
};

export const updateComplaintStatus = (id, status) => {
  if (id) {
    apiClient.patch(`/maintenance/${id}/triage`, { status }).catch(() => {});
  }

  const saved = localStorage.getItem('custom_complaints');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => p.id === id);
  if (index > -1) {
    customItems[index].status = status;
  } else {
    customItems.push({ id, status });
  }
  localStorage.setItem('custom_complaints', JSON.stringify(customItems));
};
