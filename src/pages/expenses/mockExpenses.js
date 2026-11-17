import apiClient from '../../services/apiClient';

export const getExpenses = () => {
  const saved = localStorage.getItem('custom_expenses_us');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const saveExpense = (data) => {
  if (data) {
    apiClient.post('/expenses', {
      propertyId: Number(data.propertyId) || 1,
      vendorId: data.vendorId ? Number(data.vendorId) : undefined,
      category: data.category || 'General',
      description: data.description || 'Property operating expense',
      amount: Number(data.amount) || 0,
      date: data.date,
      isPaid: data.isPaid || false,
    }).catch((err) => {
      console.warn('[API] Create expense failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_expenses_us');
  const customItems = saved ? JSON.parse(saved) : [];
  customItems.unshift({ ...data, id: Date.now() });
  localStorage.setItem('custom_expenses_us', JSON.stringify(customItems));
};

export const updateExpense = (id, data) => {
  if (id && data) {
    apiClient.put(`/expenses/${id}`, data).catch((err) => {
      console.warn('[API] Update expense failed:', err.message);
    });
  }

  const saved = localStorage.getItem('custom_expenses_us');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => p.id === id);
  if (index > -1) {
    customItems[index] = { ...customItems[index], ...data };
  } else {
    customItems.push({ id, ...data });
  }
  localStorage.setItem('custom_expenses_us', JSON.stringify(customItems));
};

export const voidExpense = (id, reason = 'Duplicate / reversed bill') => {
  if (id) {
    apiClient.delete(`/expenses/${id}`).catch(() => {});
  }
  updateExpense(id, { status: 'Voided', paymentState: 'Voided', voidReason: reason });
};

export const deleteExpense = (id) => voidExpense(id);
