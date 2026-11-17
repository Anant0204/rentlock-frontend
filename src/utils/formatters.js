export const formatCurrency = (amount, decimals = 0) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatUsd = (amount, decimals = 0) => {
  return formatCurrency(amount, decimals);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(Number(num) || 0);
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getStatusColor = (status) => {
  const map = {
    Vacant: 'bg-emerald-100 text-emerald-700',
    Occupied: 'bg-blue-100 text-blue-700',
    Reserved: 'bg-amber-100 text-amber-700',
    'Under Repair': 'bg-red-100 text-red-700',
    Turnover: 'bg-orange-100 text-orange-700',
    Open: 'bg-red-100 text-red-700',
    New: 'bg-blue-100 text-blue-700',
    'Reviewed & Prioritized': 'bg-indigo-100 text-indigo-700',
    'Scheduled / Dispatched': 'bg-cyan-100 text-cyan-700',
    Scheduled: 'bg-cyan-100 text-cyan-700',
    Dispatched: 'bg-indigo-100 text-indigo-700',
    'In Progress': 'bg-amber-100 text-amber-700',
    'Completed — Needs Review': 'bg-purple-100 text-purple-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Closed: 'bg-gray-100 text-gray-600',
    Active: 'bg-emerald-100 text-emerald-700',
    Inactive: 'bg-gray-100 text-gray-600',
    Archived: 'bg-gray-100 text-gray-600',
    Expired: 'bg-red-100 text-red-700',
    'Expiring Soon': 'bg-amber-100 text-amber-700',
    Draft: 'bg-slate-100 text-slate-600',
    Sent: 'bg-blue-100 text-blue-700',
    Paid: 'bg-emerald-100 text-emerald-700',
    Posted: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Unpaid: 'bg-amber-100 text-amber-700',
    'Unpaid Bill': 'bg-amber-100 text-amber-700',
    Overdue: 'bg-red-100 text-red-700',
    Partial: 'bg-orange-100 text-orange-700',
    Voided: 'bg-gray-100 text-gray-500',
    Reversed: 'bg-red-100 text-red-700',
    Approved: 'bg-emerald-100 text-emerald-700',
    Screening: 'bg-indigo-100 text-indigo-700',
    'Move-In Ready': 'bg-emerald-100 text-emerald-700',
    Held: 'bg-blue-100 text-blue-700',
    'Disposition Due': 'bg-amber-100 text-amber-700',
    Reconciled: 'bg-emerald-100 text-emerald-700',
    'On Hold': 'bg-amber-100 text-amber-700',
    'On Leave': 'bg-amber-100 text-amber-700',
    'On Site': 'bg-blue-100 text-blue-700',
    'Checked Out': 'bg-gray-100 text-gray-600',
    Current: 'bg-emerald-100 text-emerald-700',
    'On File': 'bg-emerald-100 text-emerald-700',
    Needed: 'bg-amber-100 text-amber-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

export const truncate = (str, len = 40) => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
};

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
