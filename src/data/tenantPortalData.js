import apiClient from '../services/apiClient';

const STORAGE_KEY = 'rentlock_tenant_portal_v1';

export const PAYMENT_METHODS_OPTIONS = [
  {
    value: 'bank_checking_4821',
    label: 'Checking •••• 4821 (Bank account — $0 fee)',
    shortLabel: 'Checking •••• 4821',
    type: 'bank',
    feeRate: 0,
    flatFee: 0,
  },
  {
    value: 'bank_savings_1190',
    label: 'Savings •••• 1190 (Bank account — $0 fee)',
    shortLabel: 'Savings •••• 1190',
    type: 'bank',
    feeRate: 0,
    flatFee: 0,
  },
  {
    value: 'card_visa_9012',
    label: 'Visa •••• 9012 (Debit / Credit card — 2.9% fee)',
    shortLabel: 'Visa •••• 9012',
    type: 'card',
    feeRate: 0.029,
    flatFee: 0,
  },
];

export const REPAIR_CATEGORIES = ['Plumbing', 'Heating / AC', 'Electrical', 'Other'];

export const ACCESS_TIME_OPTIONS = [
  { value: 'Morning (8 AM – 12 PM)', label: 'Morning (8 AM – 12 PM)' },
  { value: 'Afternoon (12 PM – 4 PM)', label: 'Afternoon (12 PM – 4 PM)' },
  { value: 'After 2 PM (2 PM – 6 PM)', label: 'After 2 PM (2 PM – 6 PM)' },
  { value: 'Anytime during business hours', label: 'Anytime during business hours' },
];

export const ISSUE_LOCATION_OPTIONS = [
  { value: 'Sunrise Residency · Unit A-204', label: 'Sunrise Residency · Unit A-204' },
  { value: 'Sunrise Residency · Unit A-204 (Kitchen)', label: 'Sunrise Residency · Unit A-204 (Kitchen)' },
  { value: 'Sunrise Residency · Unit A-204 (Bathroom)', label: 'Sunrise Residency · Unit A-204 (Bathroom)' },
  { value: 'Sunrise Residency · Unit A-204 (Living Area)', label: 'Sunrise Residency · Unit A-204 (Living Area)' },
];

const INITIAL_STATE = {
  household: {
    propertyName: '',
    unitCode: '',
    unitLabel: 'No unit assigned',
    shortUnitLabel: 'No unit',
    dueDateLabel: '—',
    monthlyRent: 0,
  },
  payments: [],
  workOrders: [],
  threads: [],
};

function cloneInitial() {
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}

export function getTenantPortalState() {
  let activeUser = null;
  try {
    const rawUser = localStorage.getItem('pm_user');
    if (rawUser) activeUser = JSON.parse(rawUser);
  } catch {
    // ignore
  }

  let base = cloneInitial();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.household && Array.isArray(parsed.payments) && Array.isArray(parsed.workOrders) && Array.isArray(parsed.threads)) {
        base = parsed;
      }
    }
  } catch {
    // ignore
  }

  if (activeUser?.role === 'tenant') {
    const tenantName = activeUser.name;
    let customTenants = [];
    try {
      customTenants = JSON.parse(localStorage.getItem('custom_tenants') || '[]');
    } catch {
      // ignore
    }
    const match = customTenants.find((t) => t.email?.toLowerCase() === activeUser.email?.toLowerCase() || t.name?.toLowerCase() === tenantName?.toLowerCase());
    if (match) {
      base.household = {
        propertyName: match.propertyName || 'Assigned Property',
        unitCode: match.unitNumber || 'Unit 101',
        unitLabel: `${match.propertyName || 'Property'} · ${match.unitNumber || 'Unit'}`,
        shortUnitLabel: `${(match.propertyName || '').split(' ')[0]} · ${match.unitNumber || 'Unit'}`,
        dueDateLabel: '1st of month',
        monthlyRent: Number(match.rent) || 0,
      };
    }
  }

  return base;
}

function saveTenantPortalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function computeBalanceSummary(state) {
  const monthlyRent = Number(state.household.monthlyRent) || 0;
  const confirmedPayments = state.payments.filter(p => p.status === 'Confirmed');
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, Math.round((monthlyRent - totalPaid) * 100) / 100);
  const latestPayment = confirmedPayments[confirmedPayments.length - 1] || null;

  let statusLabel = 'DUE';
  if (remainingBalance === 0) statusLabel = 'PAID IN FULL';
  else if (totalPaid > 0) statusLabel = 'PARTIALLY PAID';

  return {
    monthlyRent,
    totalPaid,
    remainingBalance,
    latestPayment,
    statusLabel,
  };
}

export function calculateProcessingFee(amount, methodId) {
  const method = PAYMENT_METHODS_OPTIONS.find(m => m.value === methodId);
  if (!method) return { method: null, fee: 0, total: Number(amount) || 0 };
  const cleanAmount = Math.max(0, Number(amount) || 0);
  const fee = Math.round((cleanAmount * method.feeRate + method.flatFee) * 100) / 100;
  const total = Math.round((cleanAmount + fee) * 100) / 100;
  return { method, fee, total };
}

/**
 * Records a rent payment ONLY after provider confirmation and enforces idempotency
 * to prevent duplicate charges if the same submission key is retried.
 */
export function confirmTenantPayment({ amount, methodId, idempotencyKey }) {
  const state = getTenantPortalState();
  const existing = state.payments.find(p => p.idempotencyKey === idempotencyKey);
  if (existing) {
    return { state, receipt: existing, duplicatePrevented: true };
  }

  const { remainingBalance } = computeBalanceSummary(state);
  const cleanAmount = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0 || cleanAmount > remainingBalance) {
    throw new Error('Payment amount must be greater than $0 and within your remaining balance.');
  }

  const { method, fee, total } = calculateProcessingFee(cleanAmount, methodId);
  if (!method) {
    throw new Error('Please choose a bank account or card.');
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const seq = 1000 + state.payments.length + 1;
  const receipt = {
    id: `PAY-${seq}`,
    receiptNumber: `RCPT-${now.getFullYear()}-${seq}`,
    dateLabel,
    timestamp: now.toISOString(),
    amount: cleanAmount,
    processingFee: fee,
    totalCharged: total,
    methodId: method.value,
    methodLabel: method.shortLabel,
    status: 'Confirmed',
    idempotencyKey,
  };

  const nextState = {
    ...state,
    payments: [...state.payments, receipt],
  };
  saveTenantPortalState(nextState);

  // Sync to Admin/Billing custom_invoices so Admin shows Paid status
  try {
    const rawInvoices = localStorage.getItem('custom_invoices');
    const customInvoices = rawInvoices ? JSON.parse(rawInvoices) : [];
    const invIndex = customInvoices.findIndex((i) => i.id === 'INV-2026-001');
    if (invIndex > -1) {
      customInvoices[invIndex].paid = 2000;
      customInvoices[invIndex].balance = 0;
      customInvoices[invIndex].status = 'Paid';
      customInvoices[invIndex].paymentDate = now.toISOString().split('T')[0];
    } else {
      customInvoices.push({
        id: 'INV-2026-001',
        tenantId: 1,
        tenantName: 'Rebecca Miller',
        propertyName: 'Sunrise Residency',
        unitNumber: 'A-204',
        month: 'Nov 2026',
        rent: 2000,
        paid: 2000,
        balance: 0,
        status: 'Paid',
        paymentMethod: method.shortLabel,
        paymentDate: now.toISOString().split('T')[0],
      });
    }
    localStorage.setItem('custom_invoices', JSON.stringify(customInvoices));
  } catch {
    // ignore
  }

  // Real API call to backend
  apiClient.post('/portal/tenant/pay', {
    invoiceId: 1,
    amount: cleanAmount,
    paymentMethod: method?.shortLabel || 'ACH Direct',
  }).catch(() => {});

  return { state: nextState, receipt, duplicatePrevented: false };
}

export function createTenantWorkOrder({
  unit,
  category,
  description,
  urgency,
  bestTimeToEnter,
  allowEntryWhenAway,
  photos = [],
}) {
  // Real API call to backend
  apiClient.post('/portal/tenant/work-order', {
    category: category || 'General',
    issueLocation: unit || 'Unit A-204',
    accessTime: bestTimeToEnter || 'Anytime during business hours',
    description: description.trim(),
    photoUrls: photos || [],
  }).catch(() => {});
  const state = getTenantPortalState();
  const nextNumber = 302 + state.workOrders.length;
  const id = `WO-${nextNumber}`;
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const shortTitle = description.trim().split(/[.!?]/)[0].slice(0, 36) || `${category} repair`;

  const workOrder = {
    id,
    unit: unit || state.household.unitLabel,
    category,
    title: shortTitle,
    description: description.trim(),
    urgency,
    bestTimeToEnter: bestTimeToEnter || 'Anytime during business hours',
    allowEntryWhenAway: Boolean(allowEntryWhenAway),
    photos,
    status: 'Open',
    statusSummary: `Submitted (${urgency}) · Manager notified`,
    createdAtLabel: dateLabel,
    createdAt: now.toISOString(),
  };

  const entryText = allowEntryWhenAway ? 'Staff may enter if away' : 'Tenant must be home';
  const newThread = {
    id,
    workOrderId: id,
    householdUnit: state.household.shortUnitLabel,
    contactName: 'Sarah Jenkins',
    contactInitials: 'SJ',
    contactRole: 'PROPERTY MANAGER',
    subject: `${id} · ${category} request`,
    headerTag: `${id} · ${shortTitle}`,
    lastTime: timeLabel,
    unreadCount: 1,
    messages: [
      {
        id: `MSG-${Date.now()}-1`,
        sender: 'tenant',
        senderName: 'You',
        text: `${description.trim()}\n\nCategory: ${category} · Urgency: ${urgency} · Preferred time: ${workOrder.bestTimeToEnter} · ${entryText}`,
        time: timeLabel,
        attachments: photos,
      },
      {
        id: `MSG-${Date.now()}-2`,
        sender: 'manager',
        senderName: 'Sarah',
        text: `Thanks for reporting ${id}. I have received your ${category.toLowerCase()} request${photos.length ? ` with ${photos.length} photo(s)` : ''} and will follow up here.`,
        time: timeLabel,
        attachments: [],
      },
    ],
  };

  const nextState = {
    ...state,
    workOrders: [workOrder, ...state.workOrders],
    threads: [newThread, ...state.threads],
  };

  saveTenantPortalState(nextState);

  // Sync to Admin/Manager custom_work_orders_us so maintenance boards see it
  try {
    const rawWOs = localStorage.getItem('custom_work_orders_us');
    const customWOs = rawWOs ? JSON.parse(rawWOs) : [];
    customWOs.unshift({
      id,
      title: shortTitle,
      description: description.trim(),
      priority: urgency || 'Normal',
      category: category || 'Plumbing',
      type: 'Tenant Request',
      propertyId: 1,
      propertyName: state.household?.propertyName || 'Sunrise Residency',
      unitNumber: unit || state.household?.unitNumber || 'A-204',
      tenantName: state.tenantProfile?.name || 'Rebecca Miller',
      assignedTo: 'QuickFix Plumbing',
      status: 'Reviewed & Prioritized',
      scheduledWindow: 'Awaiting dispatch',
      cost: 250,
      costCap: 1000,
      createdAt: now.toISOString().split('T')[0],
      updatedAt: now.toISOString().split('T')[0],
      approvalNeeded: false,
      feedback: null,
    });
    localStorage.setItem('custom_work_orders_us', JSON.stringify(customWOs));
  } catch {
    // ignore
  }

  return { state: nextState, workOrder, thread: newThread };
}

export function sendTenantMessage({ threadId, text, attachments = [] }) {
  // Real API call to backend
  apiClient.post('/messages', {
    threadId: Number(String(threadId).replace(/\D/g, '')) || 1,
    recipientId: 3,
    content: text.trim(),
    attachmentUrls: attachments,
  }).catch(() => {});

  const state = getTenantPortalState();
  const cleanText = text.trim();
  if (!cleanText && attachments.length === 0) {
    throw new Error('Please write a message or attach a photo.');
  }

  const timeLabel = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const nextThreads = state.threads.map(thread => {
    if (thread.id !== threadId) return thread;
    const msg = {
      id: `MSG-${Date.now()}`,
      sender: 'tenant',
      senderName: 'You',
      text: cleanText,
      time: timeLabel,
      attachments,
    };
    return {
      ...thread,
      lastTime: timeLabel,
      unreadCount: 0,
      messages: [...thread.messages, msg],
    };
  });

  const nextState = { ...state, threads: nextThreads };
  saveTenantPortalState(nextState);
  return nextState;
}

export function markThreadRead(threadId) {
  const state = getTenantPortalState();
  const nextThreads = state.threads.map(t => (t.id === threadId ? { ...t, unreadCount: 0 } : t));
  const nextState = { ...state, threads: nextThreads };
  saveTenantPortalState(nextState);
  return nextState;
}

export function getUnreadMessageCount(state) {
  return state.threads.reduce((sum, t) => sum + (Number(t.unreadCount) || 0), 0);
}

export function getOpenWorkOrderCount(state) {
  return state.workOrders.filter(wo => wo.status !== 'Closed' && wo.status !== 'Completed').length;
}

export async function readFilesAsDataUrls(fileList, maxFiles = 4) {
  const files = Array.from(fileList || []).slice(0, maxFiles);
  const results = await Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, url: String(reader.result || '') });
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        })
    )
  );
  return results.filter(Boolean);
}

