export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  TENANT: 'tenant',
};

export const ROLE_LABELS = {
  super_admin: 'Portfolio Admin',
  admin: 'Admin',
  owner: 'Owner',
  manager: 'Manager',
  tenant: 'Tenant',
};

export const ACCOUNT_TYPES = [
  { key: 'admin', label: 'Admin', description: 'Full portfolio operations, RBAC governance, safeguards, and billing approvals' },
  { key: 'owner', label: 'Owner', description: 'Read-only owner statements, financial shares, distributions, and property compliance' },
  { key: 'manager', label: 'Manager', description: 'Assigned properties only: tenants, work orders, schedule, messages, and reports' },
  { key: 'tenant', label: 'Tenant', description: 'Pay rent, submit work orders, and view household inbox threads' },
];

export const UNIT_STATUSES = {
  VACANT: 'Vacant',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  UNDER_REPAIR: 'Under Repair',
  TURNOVER: 'Turnover',
};

export const UNIT_TYPES = [
  'Studio',
  '1 BD / 1 BA',
  '2 BD / 1 BA',
  '2 BD / 2 BA',
  '3 BD / 2 BA',
  '3 BD / 2.5 BA',
  '4+ BD Villa',
  'Commercial Suite',
  'Warehouse Bay',
];

export const COMPLAINT_STATUSES = {
  NEW: 'New',
  REVIEWED: 'Reviewed & Prioritized',
  DISPATCHED: 'Scheduled / Dispatched',
  IN_PROGRESS: 'In Progress',
  NEEDS_REVIEW: 'Completed — Needs Review',
  CLOSED: 'Closed',
};

export const MAINTENANCE_PIPELINE_STAGES = [
  'New',
  'Reviewed & Prioritized',
  'Scheduled / Dispatched',
  'In Progress',
  'Completed — Needs Review',
  'Closed',
];

export const PROPERTY_TYPES = [
  'Residential',
  'Commercial',
  'Multifamily',
  'Single-Family',
  'Townhome',
  'Mixed-Use',
  'Industrial / Warehouse',
  'Office',
  'Retail',
];

export const EXPENSE_CATEGORIES = [
  'Repairs & Maintenance',
  'Utilities',
  'Property Taxes',
  'Insurance',
  'Cleaning & Janitorial',
  'Landscaping',
  'Management Fees',
  'Capital Improvements',
  'Other',
];

export const PAYMENT_METHODS = [
  'Cash (Office / Hand-Delivered)',
  'ACH Bank Transfer',
  'Debit / Credit Card',
  'Check',
  'Money Order',
  'Wire / Online Portal',
];

export const AMENITIES = [
  'Parking',
  'Elevator',
  'On-Site Laundry',
  'Fitness Center',
  'Swimming Pool',
  'Controlled Access',
  'Security Cameras',
  'Package Lockers',
  'Courtyard / Garden',
  'Pet Friendly',
  'EV Charging',
];

export const US_STATES = [
  'NY', 'NJ', 'CT', 'PA', 'MA', 'TX', 'CA', 'FL', 'IL', 'GA', 'WA', 'CO', 'NC', 'VA',
];

export const COLORS = {
  frostBlue: '#4A6CF7',
  lilac: '#A855F7',
  white: '#FFFFFF',
  softSilver: '#EEF2F7',
  darkText: '#111827',
  mutedText: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};
