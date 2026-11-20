import apiClient from '../services/apiClient';

export const getInvoices = () => {
  const saved = localStorage.getItem('custom_invoices');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const updateInvoice = (id, data) => {
  if (id && data) {
    if (data.status === 'Paid' || data.paid !== undefined) {
      apiClient.post(`/invoices/${id}/pay`, {
        amountPaid: Number(data.paid) || 0,
        paymentMethod: data.paymentMethod || 'ACH Direct',
        referenceNotes: data.referenceNotes,
      }).catch((err) => {
        console.warn('[API] Pay invoice failed:', err.message);
      });
    } else {
      apiClient.put(`/invoices/${id}`, data).catch(() => {});
    }
  }

  const saved = localStorage.getItem('custom_invoices');
  const customItems = saved ? JSON.parse(saved) : [];
  const index = customItems.findIndex((p) => p.id === id);
  if (index > -1) {
    customItems[index] = { ...customItems[index], ...data };
  } else {
    customItems.push({ id, ...data });
  }
  localStorage.setItem('custom_invoices', JSON.stringify(customItems));
};

export const voidInvoice = (id, reason = 'Billing correction') => {
  if (id) {
    apiClient.patch(`/invoices/${id}/void`, { voidReason: reason }).catch((err) => {
      console.warn('[API] Void invoice failed:', err.message);
    });
  }
  updateInvoice(id, { status: 'Voided', balance: 0, voidReason: reason, voidedAt: new Date().toISOString() });
};

export const mockInvoices = getInvoices();
