import apiClient from '../services/apiClient';
import { isDemoMode } from './appDataReset';

const STORAGE_KEY = 'rentlock_admin_portal_v1';

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    canViewTenants: true,
    canAddTenants: true,
    canEditTenants: true,
    canDeleteTenants: true,
    canViewTenantPII: true,
    canViewProperties: true,
    canAddProperties: true,
    canEditProperties: true,
    canDeleteProperties: true,
    canAssignManagers: true,
    canCreateLeases: true,
    canSignLeases: true,
    canCollectRent: true,
    canPayBills: true,
    canManageWorkOrders: true,
    spendingCap: 50000,
    canSendBroadcasts: true,
    canManageParking: true,
    canViewFinancialReports: true,
  },
  manager: {
    canViewTenants: true,
    canAddTenants: true,
    canEditTenants: true,
    canDeleteTenants: false,
    canViewTenantPII: true,
    canViewProperties: true,
    canAddProperties: false,
    canEditProperties: true,
    canDeleteProperties: false,
    canAssignManagers: false,
    canCreateLeases: true,
    canSignLeases: false,
    canCollectRent: true,
    canPayBills: false,
    canManageWorkOrders: true,
    spendingCap: 1000,
    canSendBroadcasts: true,
    canManageParking: true,
    canViewFinancialReports: false,
  },
  owner: {
    canViewTenants: true,
    canAddTenants: false,
    canEditTenants: false,
    canDeleteTenants: false,
    canViewTenantPII: false,
    canViewProperties: true,
    canAddProperties: true,
    canEditProperties: false,
    canDeleteProperties: false,
    canAssignManagers: true,
    canCreateLeases: false,
    canSignLeases: false,
    canCollectRent: false,
    canPayBills: false,
    canManageWorkOrders: false,
    spendingCap: 0,
    canSendBroadcasts: false,
    canManageParking: false,
    canViewFinancialReports: true,
  },
  tenant: {
    canViewTenants: false,
    canAddTenants: false,
    canEditTenants: false,
    canDeleteTenants: false,
    canViewTenantPII: false,
    canViewProperties: false,
    canAddProperties: false,
    canEditProperties: false,
    canDeleteProperties: false,
    canAssignManagers: false,
    canCreateLeases: false,
    canSignLeases: true,
    canCollectRent: false,
    canPayBills: false,
    canManageWorkOrders: true,
    spendingCap: 0,
    canSendBroadcasts: false,
    canManageParking: false,
    canViewFinancialReports: false,
  },
};

export const PERMISSION_DEFINITIONS = [
  {
    category: 'Tenants & Residents',
    categoryIcon: 'Users',
    items: [
      {
        key: 'canAddTenants',
        label: 'Add & Onboard Residents',
        desc: 'Enrolls new tenants into units and creates tenant household login access.',
        roles: ['manager', 'owner', 'admin'],
      },
      {
        key: 'canEditTenants',
        label: 'Edit Resident Profiles',
        desc: 'Updates tenant personal information, notes, and vehicle details.',
        roles: ['manager', 'owner', 'admin'],
      },
      {
        key: 'canViewTenantPII',
        label: 'View Resident Phone & Email (PII)',
        desc: 'If disabled, tenant personal phone and email addresses are masked for privacy.',
        roles: ['manager', 'owner', 'admin'],
      },
      {
        key: 'canDeleteTenants',
        label: 'Archive / Delete Tenants',
        desc: 'Permanently archives tenant records from the active building roster.',
        roles: ['admin', 'manager'],
      },
    ],
  },
  {
    category: 'Properties & Assets',
    categoryIcon: 'Building2',
    items: [
      {
        key: 'canAddProperties',
        label: 'Register New Properties',
        desc: 'Can onboard new real estate buildings into the portfolio (Owner & Admin only).',
        roles: ['admin', 'owner'],
      },
      {
        key: 'canEditProperties',
        label: 'Edit Property Details & Units',
        desc: 'Modifies property addresses, amenities, and unit turnover statuses.',
        roles: ['admin', 'manager', 'owner'],
      },
      {
        key: 'canAssignManagers',
        label: 'Assign / Reassign Managers',
        desc: 'Selects or changes the operational site manager on buildings.',
        roles: ['admin', 'owner'],
      },
    ],
  },
  {
    category: 'Leases & Agreements',
    categoryIcon: 'FileText',
    items: [
      {
        key: 'canCreateLeases',
        label: 'Draft & Send Leases',
        desc: 'Creates new lease contracts, sets rent amounts, and issues signing links.',
        roles: ['admin', 'manager', 'owner'],
      },
      {
        key: 'canSignLeases',
        label: 'Countersign / Execute Leases',
        desc: 'Legally countersigns executed leases on behalf of ownership.',
        roles: ['admin', 'manager', 'owner'],
      },
    ],
  },
  {
    category: 'Rent, Invoicing & Payouts',
    categoryIcon: 'DollarSign',
    items: [
      {
        key: 'canCollectRent',
        label: 'Record & Collect Rent Payments',
        desc: 'Logs manual cash, paper check receipts, and ledger concessions.',
        roles: ['admin', 'manager'],
      },
      {
        key: 'canPayBills',
        label: 'Pay Vendor Invoices & Disbursements',
        desc: 'Authorizes outgoing cash disbursements to service vendors.',
        roles: ['admin', 'manager', 'owner'],
      },
      {
        key: 'canViewFinancialReports',
        label: 'View Full Financial Ledgers & NOI',
        desc: 'Grants access to net operating income, cash-on-cash, and tax exports.',
        roles: ['admin', 'manager', 'owner'],
      },
    ],
  },
  {
    category: 'Maintenance & Operations',
    categoryIcon: 'Wrench',
    items: [
      {
        key: 'canManageWorkOrders',
        label: 'Create & Triage Work Orders',
        desc: 'Dispatches maintenance tickets to technicians and closes completed orders.',
        roles: ['admin', 'manager', 'owner'],
      },
      {
        key: 'canSendBroadcasts',
        label: 'Publish Building Notices & SMS Alerts',
        desc: 'Sends mass announcements and emergency SMS blasts to residents.',
        roles: ['admin', 'manager'],
      },
      {
        key: 'canManageParking',
        label: 'Manage Parking & Visitor Passes',
        desc: 'Assigns parking spots, manages EV chargers, and issues visitor digital passes.',
        roles: ['admin', 'manager'],
      },
    ],
  },
];

const defaultState = {
  applications: [
    {
      id: 'APP-401',
      applicantName: 'Jordan Alvarez',
      email: 'j.alvarez@example.com',
      phone: '+1 (347) 555-0139',
      propertyId: 1,
      propertyName: 'Sunrise Residency',
      unitNumber: 'B-101',
      targetRent: 1750,
      proposedMoveIn: '2026-12-01',
      consentSigned: true,
      screeningStatus: 'Approved',
      creditBand: 'Pass (738)',
      incomeVerified: true,
      incomeRatio: '3.6x Rent',
      status: 'Approved',
      notes: 'Consent verified; ready to prepare lease & household.',
      checklist: {
        applicationConsent: true,
        screeningComplete: true,
        prepareLeaseHousehold: false,
        collectMoveInFunds: false,
        moveInInspectionAccess: false,
      },
      inspectionPhotosCount: 0,
    },
    {
      id: 'APP-402',
      applicantName: 'Maya Lin & Ethan Cho',
      email: 'maya.lin@example.com',
      phone: '+1 (917) 555-0172',
      propertyId: 1,
      propertyName: 'Sunrise Residency',
      unitNumber: 'A-202',
      targetRent: 1950,
      proposedMoveIn: '2026-12-15',
      consentSigned: true,
      screeningStatus: 'Screening',
      creditBand: 'In Review',
      incomeVerified: true,
      incomeRatio: '4.1x Rent',
      status: 'Screening',
      notes: 'Background check awaiting county record clearance. Unit currently in Turnover.',
      checklist: {
        applicationConsent: true,
        screeningComplete: false,
        prepareLeaseHousehold: false,
        collectMoveInFunds: false,
        moveInInspectionAccess: false,
      },
      inspectionPhotosCount: 0,
    },
    {
      id: 'APP-403',
      applicantName: 'Crestview Therapy Suites LLC',
      email: 'ops@crestviewtherapy.com',
      phone: '+1 (718) 555-0168',
      propertyId: 2,
      propertyName: 'Metro Business Park',
      unitNumber: 'OF-201',
      targetRent: 3250,
      proposedMoveIn: '2026-12-01',
      consentSigned: true,
      screeningStatus: 'Approved',
      creditBand: 'Business Trade Ref OK',
      incomeVerified: true,
      incomeRatio: '5.2x Rent',
      status: 'Approved',
      notes: 'Guarantor review passed; waiting for first month + deposit invoice issuance.',
      checklist: {
        applicationConsent: true,
        screeningComplete: true,
        prepareLeaseHousehold: true,
        collectMoveInFunds: false,
        moveInInspectionAccess: false,
      },
      inspectionPhotosCount: 4,
    },
    {
      id: 'APP-404',
      applicantName: 'Noah Morales',
      email: 'noah.morales@example.com',
      phone: '+1 (201) 555-0114',
      propertyId: 1,
      propertyName: 'Sunrise Residency',
      unitNumber: 'B-102',
      targetRent: 2100,
      proposedMoveIn: '2027-01-01',
      consentSigned: false,
      screeningStatus: 'New',
      creditBand: 'Awaiting Consent',
      incomeVerified: false,
      incomeRatio: 'Pending',
      status: 'New',
      notes: 'Submitted inquiry; FCRA screening consent link sent.',
      checklist: {
        applicationConsent: false,
        screeningComplete: false,
        prepareLeaseHousehold: false,
        collectMoveInFunds: false,
        moveInInspectionAccess: false,
      },
      inspectionPhotosCount: 0,
    },
  ],
  turnovers: [
    {
      id: 'TRN-202',
      propertyName: 'Sunrise Residency',
      unitNumber: 'A-202',
      resident: 'Lucas Grant (Moved Out)',
      moveOutDate: '2026-10-31',
      unitStatus: 'Turnover',
      managerReviewed: false,
      heldDeposit: 1950,
      dispositionDueDate: '2026-11-14',
      tasks: [
        { id: 'TT-1', title: 'Full unit repaint & drywall patch', assignee: 'Carlos Rivera', dueDate: '2026-11-11', cost: 420, receiptFile: 'Paint-Inv-812.pdf', status: 'Completed' },
        { id: 'TT-2', title: 'Deep clean kitchen, bath & steam carpets', assignee: 'SparkleClean Tri-State', dueDate: '2026-11-12', cost: 260, receiptFile: 'SC-Turn-202.pdf', status: 'In Progress' },
        { id: 'TT-3', title: 'Smart lock core reset & fob deactivation', assignee: 'Michael Brown', dueDate: '2026-11-13', cost: 0, receiptFile: '', status: 'Open' },
      ],
      deductions: [
        { id: 'DED-1', item: 'Excessive living room drywall damage (beyond wear & tear)', amount: 225, receiptFile: 'Drywall-Photo-Inv.pdf' },
        { id: 'DED-2', item: 'Unreturned garage key fob replacement', amount: 75, receiptFile: 'Locksmith-Receipt.pdf' },
      ],
      checklist: {
        noticeSaved: true,
        finalWalkthrough: true,
        conditionPhotosUploaded: true,
        keysDeactivated: false,
        finalChargesEntered: true,
        reconcileDepositSent: false,
      },
    },
    {
      id: 'TRN-109',
      propertyName: 'Harborview Lofts',
      unitNumber: 'H-402',
      resident: 'Elena Gomez (Moved Out)',
      moveOutDate: '2026-11-04',
      unitStatus: 'Turnover',
      managerReviewed: false,
      heldDeposit: 2300,
      dispositionDueDate: '2026-12-04',
      tasks: [
        { id: 'TT-4', title: 'Bathtub recaulk & vanity hardware tighten', assignee: 'Michael Brown', dueDate: '2026-11-13', cost: 140, receiptFile: 'MB-Work-402.pdf', status: 'Completed' },
      ],
      deductions: [],
      checklist: {
        noticeSaved: true,
        finalWalkthrough: true,
        conditionPhotosUploaded: true,
        keysDeactivated: true,
        finalChargesEntered: true,
        reconcileDepositSent: false,
      },
    },
  ],
  securityDeposits: [
    { id: 'DEP-101', propertyName: 'Sunrise Residency', unitNumber: 'A-204', tenantName: 'Rebecca Miller', leaseId: 'LSE-2026-001', leaseStatus: 'Active', heldAmount: 2000, trustAccount: 'Brooklyn Trust Escrow ••4412', collectedDate: '2026-05-22', proposedDeduction: 0, deductionReason: '', linkedInvoicePdf: null, dispositionDue: null, status: 'Held', managerReviewed: true },
    { id: 'DEP-102', propertyName: 'Sunrise Residency', unitNumber: 'A-101', tenantName: 'Camila Torres', leaseId: 'LSE-2026-002', leaseStatus: 'Expiring Soon', heldAmount: 2150, trustAccount: 'Brooklyn Trust Escrow ••4412', collectedDate: '2025-12-20', proposedDeduction: 0, deductionReason: '', linkedInvoicePdf: null, dispositionDue: null, status: 'Held', managerReviewed: true },
    { id: 'DEP-103', propertyName: 'Sunrise Residency', unitNumber: 'A-202', tenantName: 'Lucas Grant (Former)', leaseId: 'LSE-2025-019', leaseStatus: 'Ended (Turnover)', heldAmount: 1950, trustAccount: 'Brooklyn Trust Escrow ••4412', collectedDate: '2025-11-01', proposedDeduction: 300, deductionReason: 'Drywall repair ($225) + Unreturned fob ($75)', linkedInvoicePdf: 'A202-Turnover-Itemization.pdf', dispositionDue: '2026-11-14', status: 'Disposition Due', managerReviewed: false },
    { id: 'DEP-104', propertyName: 'Green Valley Villas', unitNumber: 'V-12', tenantName: 'William Davis', leaseId: 'LSE-2025-004', leaseStatus: 'Active', heldAmount: 3100, trustAccount: 'NJ Tenant Security Trust ••9018', collectedDate: '2025-04-25', proposedDeduction: 0, deductionReason: '', linkedInvoicePdf: null, dispositionDue: null, status: 'Held', managerReviewed: true },
    { id: 'DEP-105', propertyName: 'Metro Business Park', unitNumber: 'C-101', tenantName: 'Northstar Dental Group', leaseId: 'LSE-2025-006', leaseStatus: 'Active', heldAmount: 8400, trustAccount: 'Queens Commercial Escrow ••7719', collectedDate: '2024-12-22', proposedDeduction: 0, deductionReason: '', linkedInvoicePdf: null, dispositionDue: null, status: 'Held', managerReviewed: true },
    { id: 'DEP-106', propertyName: 'Harborview Lofts', unitNumber: 'H-402', tenantName: 'Elena Gomez (Former)', leaseId: 'LSE-2025-014', leaseStatus: 'Ended (Turnover)', heldAmount: 2300, trustAccount: 'NJ Tenant Security Trust ••9018', collectedDate: '2025-11-01', proposedDeduction: 0, deductionReason: 'No deductions — full refund ready', linkedInvoicePdf: 'H402-Closeout-Inspection.pdf', dispositionDue: '2026-12-04', status: 'Disposition Due', managerReviewed: false },
  ],
  preventiveSchedules: [
    { id: 'PM-01', title: 'Quarterly HVAC Filter & Belt Inspection', propertyName: 'Metro Business Park', assignee: 'Metro HVAC LLC', scheduleMode: 'Fixed Calendar Dates', frequency: 'Quarterly', nextDueDate: '2026-11-28', reminders: [30, 7], costCap: 650, status: 'Due Soon' },
    { id: 'PM-02', title: 'Annual Boiler & Backflow Preventer Test', propertyName: 'Sunrise Residency', assignee: 'QuickFix Plumbing', scheduleMode: 'Fixed Calendar Dates', frequency: 'Annual', nextDueDate: '2026-12-15', reminders: [60, 30, 7], costCap: 900, status: 'Scheduled' },
    { id: 'PM-03', title: 'Fire Sprinkler Riser Pressure Check', propertyName: 'Green Valley Villas', assignee: 'Guardian Fire & Safety', scheduleMode: 'After Completion', frequency: 'Quarterly', nextDueDate: '2027-02-01', reminders: [30, 7], costCap: 450, status: 'Active' },
  ],
  receiptsAudit: [
    {
      id: 'CSH-8902',
      invoiceId: 'INV-2026-005',
      date: '2026-11-06',
      tenantName: 'Jordan Hayes',
      propertyName: 'Sunrise Residency',
      unitNumber: 'A-101',
      method: 'Cash (Office / Hand-Delivered)',
      amount: 1200,
      remainingBalance: 0,
      status: 'Posted',
      cashDrawerReceipt: 'CR-OFFICE-4401',
      receivedByStaff: 'Tamara Woods (Front Desk Concierge)',
      allocations: [{ invoiceId: 'INV-2026-005', allocated: 1200, label: 'Nov 2026 Cash Tender · Verified Escrow' }],
      auditLog: [
        '11/06/2026 11:30 AM · Hand-delivered cash received by Tamara Woods (Front Desk Concierge)',
        '11/06/2026 11:31 AM · Serialized duplicate cash receipt CSH-8902 issued to Jordan Hayes',
        '11/06/2026 11:32 AM · Logged into property safe & cash ledger',
      ],
    },
    { id: 'RCT-8901', invoiceId: 'INV-2026-001', date: '2026-11-05', tenantName: 'Rebecca Miller', propertyName: 'Sunrise Residency', unitNumber: 'A-204', method: 'ACH Bank Transfer', amount: 1500, remainingBalance: 500, status: 'Posted', allocations: [{ invoiceId: 'INV-2026-001', allocated: 1500, label: 'Nov 2026 Base Rent (Partial)' }], auditLog: ['11/05/2026 09:41 AM · Posted via Tenant Portal ACH (Ref #ACH-992104)', '11/05/2026 09:41 AM · Receipt RCT-8901 emailed to rebecca.m@example.com'] },
    { id: 'RCT-8900', invoiceId: 'INV-2026-002', date: '2026-11-02', tenantName: 'Camila Torres', propertyName: 'Sunrise Residency', unitNumber: 'A-101', method: 'ACH Bank Transfer', amount: 2195, remainingBalance: 0, status: 'Posted', allocations: [{ invoiceId: 'INV-2026-002', allocated: 2195, label: 'Nov 2026 Rent + Trash/Water' }], auditLog: ['11/02/2026 08:15 AM · Posted by Auto-Pay Batch #1102', '11/02/2026 08:16 AM · Receipt issued'] },
    { id: 'RCT-8899', invoiceId: 'INV-2026-003', date: '2026-11-01', tenantName: 'Jessica Miller', propertyName: 'Sunrise Residency', unitNumber: 'B-301', method: 'Debit / Credit Card', amount: 3000, remainingBalance: 0, status: 'Posted', allocations: [{ invoiceId: 'INV-2026-003', allocated: 2850, label: 'Nov Rent' }, { invoiceId: 'INV-2026-003', allocated: 150, label: 'Reserved Parking P-A04' }], auditLog: ['11/01/2026 10:02 AM · Posted via Card Gateway'] },
    { id: 'RCT-8898', invoiceId: 'INV-2026-004', date: '2026-11-03', tenantName: 'William Davis', propertyName: 'Green Valley Villas', unitNumber: 'V-12', method: 'Check', amount: 2025, remainingBalance: 1200, status: 'Posted', allocations: [{ invoiceId: 'INV-2026-004', allocated: 2025, label: 'Partial Nov Rent Check #4418' }], auditLog: ['11/03/2026 02:14 PM · Recorded by Robert King (Admin)'] },
  ],
  ledgerAdjustments: [
    { id: 'ADJ-301', date: '2026-11-06', tenantName: 'Daniel Harris', unitNumber: 'T1-301', propertyName: 'Orchid Society', type: 'Debit (Late Fee)', amount: 50, reason: '5-day grace period expired (Oct 2026 policy)', createdBy: 'Robert King' },
    { id: 'ADJ-300', date: '2026-10-15', tenantName: 'Camila Torres', unitNumber: 'A-101', propertyName: 'Sunrise Residency', type: 'Credit (Concession)', amount: 100, reason: 'Approved plumbing disruption credit', createdBy: 'Sarah Jenkins' },
  ],
  communicationThreads: [
    {
      id: 'MSG-501',
      contactName: 'Rebecca Miller',
      role: 'Tenant',
      propertyName: 'Sunrise Residency',
      unit: 'A-204',
      channel: 'Portal',
      status: 'Awaiting reply',
      assignee: 'Sarah Jenkins',
      slaStatus: '18m remaining',
      linkedTicket: 'WO-302',
      smsOptIn: true,
      unread: true,
      messages: [
        { id: 'm1', sender: 'Rebecca Miller', type: 'inbound', channel: 'Portal', time: '09:05 AM', text: 'Water is leaking under the kitchen sink. I uploaded another photo.' },
        { id: 'm2', sender: 'Sarah Jenkins', type: 'internal', channel: 'Internal Note', time: '09:12 AM', text: 'QuickFix Plumbing estimate is $1,250 — above my $1,000 cap. Escalated to Robert King.' },
        { id: 'm3', sender: 'Sarah Jenkins', type: 'outbound', channel: 'Portal', time: '09:14 AM', text: 'Hi Rebecca, I noted your preference for after 2 PM and will confirm once the estimate is approved.' },
      ],
    },
    {
      id: 'MSG-502',
      contactName: 'Daniel Harris',
      role: 'Tenant',
      propertyName: 'Orchid Society',
      unit: 'T1-301',
      channel: 'SMS',
      status: 'Awaiting reply',
      assignee: 'Unassigned',
      slaStatus: 'Escalation due in 1h',
      linkedTicket: 'INV-2026-008',
      smsOptIn: true,
      unread: true,
      messages: [
        { id: 'm4', sender: 'RentLock Automation', type: 'outbound', channel: 'SMS', time: 'Yesterday 09:00 AM', text: 'Reminder: $1,550 remaining balance on Nov rent for Orchid Society T1-301.' },
        { id: 'm5', sender: 'Daniel Harris', type: 'inbound', channel: 'SMS', time: 'Yesterday 04:12 PM', text: 'Can I pay the remaining $1,550 on Friday via ACH without another late fee?' },
      ],
    },
    {
      id: 'MSG-503',
      contactName: 'QuickFix Plumbing',
      role: 'Vendor',
      propertyName: 'Sunrise Residency',
      unit: 'WO-302',
      channel: 'Email',
      status: 'Resolved',
      assignee: 'Robert King',
      slaStatus: 'On track',
      linkedTicket: 'WO-302',
      smsOptIn: false,
      unread: false,
      messages: [
        { id: 'm6', sender: 'QuickFix Plumbing', type: 'inbound', channel: 'Email', time: 'Today 08:50 AM', text: 'Attached Estimate #QF-419 for $1,250 (copper riser + valve replacement in A-204).' },
      ],
    },
  ],
  automationRules: [
    { id: 'AUT-1', name: 'Rent Due Reminder (3 days before & on due day)', trigger: 'Invoice Due Date', conditions: 'Balance > $0', channels: ['Email', 'Portal', 'SMS'], enabled: true, quietHoursRespected: true },
    { id: 'AUT-2', name: 'Past Due Escalation (Day 3, Day 7, Day 14)', trigger: 'Overdue Invoice', conditions: 'Unpaid after grace period', channels: ['Email', 'SMS'], enabled: true, quietHoursRespected: true },
    { id: 'AUT-3', name: 'Work Order Status & Dispatch Notification', trigger: 'WO Stage Change', conditions: 'Dispatched / Completed', channels: ['Portal', 'Email'], enabled: true, quietHoursRespected: true },
    { id: 'AUT-4', name: 'Lease Renewal Milestones (90 / 60 / 30 / 7 Days)', trigger: 'Lease End Date', conditions: 'Fixed-Term Active Lease', channels: ['Email', 'Portal'], enabled: true, quietHoursRespected: true },
    { id: 'AUT-5', name: 'COI & Compliance Expiry Alert', trigger: 'Requirement / COI Date', conditions: '30 days before expiry', channels: ['Email'], enabled: true, quietHoursRespected: false },
    { id: 'AUT-6', name: 'Receipt Issued After Payment Confirmation', trigger: 'Payment Posted', conditions: 'Status = Posted', channels: ['Email', 'Portal'], enabled: true, quietHoursRespected: true },
    { id: 'AUT-7', name: 'Move-In & Turnover Welcome Instructions', trigger: 'Lease Active', conditions: 'Checklist Complete', channels: ['Email', 'Portal'], enabled: false, quietHoursRespected: true },
  ],
  communicationQueue: [
    { id: 'QUE-901', recipient: 'Daniel Harris (+1 201-555-0190)', channel: 'SMS', template: 'Overdue Balance Reminder', scheduledAt: '11/10/2026 09:00 AM', status: 'Delivered' },
    { id: 'QUE-902', recipient: 'Noah Morales (noah.morales@example.com)', channel: 'Email', template: 'FCRA Screening Consent Invite', scheduledAt: '11/11/2026 10:15 AM', status: 'Delivered' },
    { id: 'QUE-903', recipient: 'Beacon Logistics Co. (+1 718-555-0155)', channel: 'SMS', template: 'CAM Invoice Notice', scheduledAt: '11/11/2026 11:00 AM', status: 'Failed (Opted Out)' },
  ],
  settings: {
    companyName: 'RentLock Property Holdings LLC',
    supportEmail: 'operations@rentlock.com',
    supportPhone: '+1 (718) 555-0100',
    ein: '84-2910482',
    address: '450 Lexington Ave, Suite 1800, New York, NY 10017',
    currency: 'USD ($)',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'America/New_York (ET)',
    accountingBasis: 'Accrual',
    managerApprovalCap: 1000,
    lateFeeDefaultPercent: 5,
    lateFeeGraceDays: 5,
    requireReasonOnPolicyChange: true,
    quietHoursEnabled: true,
    quietHoursWindow: '9:00 PM – 8:00 AM Local',
    mfaRequired: true,
    sessionTimeoutMins: 30,
    autoBackupDaily: true,
    archiveInsteadOfDelete: true,
    overrideNoticeMode: 'Apply to future leases only (never alter signed leases silently)',
  },
  connectionHealth: [
    { service: 'Payments Gateway (Stripe ACH / Card)', status: 'Connected', lastSync: '2 min ago', alertsRecipient: 'robert.king@rentlock.com', fallbackMode: 'Queue & notify Admin' },
    { service: 'Transactional Email (SendGrid US)', status: 'Connected', lastSync: '5 min ago', alertsRecipient: 'sarah.jenkins@rentlock.com', fallbackMode: 'Retry 3x then flag inbox' },
    { service: 'SMS Messaging (Twilio 10DLC + STOP)', status: 'Connected', lastSync: '1 min ago', alertsRecipient: 'sarah.jenkins@rentlock.com', fallbackMode: 'Suppress opted-out numbers' },
    { service: 'Accounting Export (QuickBooks Online)', status: 'Connected', lastSync: '1 hr ago', alertsRecipient: 'robert.king@rentlock.com', fallbackMode: 'Daily CSV backup' },
    { service: 'Encrypted Cloud Backups (AWS S3 US-East)', status: 'Healthy', lastSync: 'Today 03:00 AM', alertsRecipient: 'robert.king@rentlock.com', fallbackMode: '30-day immutable snapshots' },
  ],
  roleMatrix: {
    admin: { properties: 'View / Create / Edit / Archive', units: 'View / Create / Edit / Archive', owners: 'View / Edit / W-9 / Payouts', tenants: 'View / Create / Edit', leases: 'View / Draft / Send / Archive', billing: 'View / Post / Void / Refunds', deposits: 'Trust Hold / Disposition / Approve', expenses: 'Approve All / Pay Bills', maintenance: 'Approve > $1,000 / Dispatch / Close', visitorsParking: 'Full Access', reports: '12 Core + 4 Optional + Export', settings: 'Full Governance + RBAC Matrix' },
    owner: { properties: 'View Owned Only', units: 'View Owned Only', owners: 'View Own Profile & Tax ID', tenants: 'Summary Only', leases: 'View Executed Copies', billing: 'View Collections & Owner Share', deposits: 'View Trust Balance', expenses: 'View Allocated Property Expenses', maintenance: 'View Open & Approved Cap', visitorsParking: 'No Access', reports: 'Owner Statements & NOI Only', settings: 'Own Profile & Notification Prefs' },
    manager: { properties: 'View Assigned Buildings (4)', units: 'View / Edit / Turnover', owners: 'Contact Name Only (No Bank/Tax)', tenants: 'View / Add Assigned Only', leases: 'Draft / Send Assigned Only', billing: 'View Ledger / Record Manual', deposits: 'Propose Deductions / Review', expenses: 'Submit Bills (< $1,000 Cap)', maintenance: 'Triage / Dispatch / Close (< $1,000)', visitorsParking: 'Manage Log & Waitlist', reports: 'Assigned Portfolio Reports', settings: 'No Global Policy Changes' },
    tenant: { properties: 'Own Building Summary Only', units: 'Own Unit Only', owners: 'No Access', tenants: 'Own Household Profile Only', leases: 'View / E-Sign Own Lease', billing: 'View Balance / Pay Authorized', deposits: 'View Held Amount & Disposition PDF', expenses: 'No Access', maintenance: 'Submit Request + Photos', visitorsParking: 'Pre-Register Guest / View Own Permit', reports: 'Own Receipts Only', settings: 'Own Contact & SMS Opt-In' },
  },
  rolePermissions: {
    ...DEFAULT_ROLE_PERMISSIONS,
  },
  userPermissions: {},
  auditLogs: [],
  previewUser: null,
};

export const getAdminPortalState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.userPermissions) {
        delete parsed.userPermissions['manager@rentlock.com'];
        delete parsed.userPermissions['sarah.jenkins@rentlock.com'];
        delete parsed.userPermissions['owner@rentlock.com'];
      }
      return { ...defaultState, ...parsed };
    }
  } catch {
    // ignore
  }
  if (!isDemoMode()) {
    return {
      ...defaultState,
      securityDeposits: [],
      preventiveSchedules: [],
      receiptsAudit: [],
      ledgerAdjustments: [],
      communicationThreads: [],
      communicationQueue: [],
      auditLogs: [],
    };
  }
  return defaultState;
};

export const saveAdminPortalState = (next) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const updateAdminPortalState = (updater) => {
  const current = getAdminPortalState();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  saveAdminPortalState(next);
  return next;
};

export const getUserEffectivePermissions = (userOrKey) => {
  const state = getAdminPortalState();
  const rolePermissions = state.rolePermissions || DEFAULT_ROLE_PERMISSIONS;
  const userPermissions = state.userPermissions || {};

  let email = '';
  let role = 'manager';

  if (typeof userOrKey === 'string') {
    if (userOrKey.includes('@')) {
      email = userOrKey.trim().toLowerCase();
      if (email.includes('admin')) role = 'admin';
      else if (email.includes('owner') || email.includes('claire')) role = 'owner';
      else if (email.includes('tenant') || email.includes('rebecca')) role = 'tenant';
      else role = 'manager';
    } else if (['admin', 'manager', 'owner', 'tenant'].includes(userOrKey.toLowerCase())) {
      role = userOrKey.toLowerCase();
    } else {
      email = userOrKey.trim().toLowerCase();
    }
  } else if (userOrKey && typeof userOrKey === 'object') {
    email = (userOrKey.email || '').trim().toLowerCase();
    role = (userOrKey.role || 'manager').toLowerCase();
    if (role === 'super_admin') role = 'admin';
  }

  const basePermissions = rolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.manager;
  const customOverride = email && userPermissions[email] ? userPermissions[email] : null;

  const resolved = {
    ...basePermissions,
    ...(customOverride || {}),
    isCustomOverride: !!customOverride,
    role,
    userKey: email || role,
  };

  // Role-based capability boundaries
  if (role === 'manager' || (email && email.includes('manager'))) {
    resolved.canAddProperties = false;
    resolved.canDeleteProperties = false;
    resolved.canDeleteTenants = false;
  } else if (role === 'owner' || (email && email.includes('owner'))) {
    resolved.canAddProperties = true;
    resolved.canDeleteProperties = false;
    resolved.canEditProperties = false;
    resolved.canAddTenants = false;
    resolved.canEditTenants = false;
    resolved.canDeleteTenants = false;
  } else if (role === 'tenant' || (email && email.includes('tenant'))) {
    resolved.canViewTenants = false;
    resolved.canAddTenants = false;
    resolved.canEditTenants = false;
    resolved.canDeleteTenants = false;
    resolved.canViewProperties = false;
    resolved.canAddProperties = false;
    resolved.canEditProperties = false;
    resolved.canDeleteProperties = false;
  } else if (role === 'admin') {
    resolved.canViewTenants = true;
    resolved.canAddTenants = true;
    resolved.canEditTenants = true;
    resolved.canDeleteTenants = true;
    resolved.canViewProperties = true;
    resolved.canAddProperties = true;
    resolved.canEditProperties = true;
    resolved.canDeleteProperties = true;
  }

  return resolved;
};

export const hasUserPermission = (userOrKey, permissionKey) => {
  const perms = getUserEffectivePermissions(userOrKey);
  return perms[permissionKey];
};

export const sanitizeRolePermissions = (roleOrEmail, perms) => {
  const clean = { ...perms };
  const r = (roleOrEmail || '').toLowerCase();
  if (r === 'manager' || r.includes('manager')) {
    clean.canAddProperties = false;
    clean.canDeleteProperties = false;
    clean.canDeleteTenants = false;
  } else if (r === 'owner' || r.includes('owner')) {
    clean.canAddProperties = true;
    clean.canDeleteProperties = false;
    clean.canEditProperties = false;
    clean.canAddTenants = false;
    clean.canEditTenants = false;
    clean.canDeleteTenants = false;
  } else if (r === 'tenant' || r.includes('tenant')) {
    clean.canViewTenants = false;
    clean.canAddTenants = false;
    clean.canEditTenants = false;
    clean.canDeleteTenants = false;
    clean.canViewProperties = false;
    clean.canAddProperties = false;
    clean.canEditProperties = false;
    clean.canDeleteProperties = false;
  }
  return clean;
};

export const saveUserPermissions = (userKey, permissions, reason = 'Updated user permissions via Admin RBAC') => {
  const cleanKey = (userKey || '').trim().toLowerCase();
  const sanitizedPerms = sanitizeRolePermissions(cleanKey, permissions);
  apiClient.put(`/settings/rbac/user/${cleanKey}`, { permissions: sanitizedPerms, reason }).catch(() => {});
  return updateAdminPortalState((prev) => {
    const existingUsers = prev.userPermissions || {};
    return {
      ...prev,
      userPermissions: {
        ...existingUsers,
        [cleanKey]: {
          ...(existingUsers[cleanKey] || {}),
          ...sanitizedPerms,
        },
      },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          user: 'Robert King (Admin)',
          action: 'Updated User RBAC Permissions',
          target: cleanKey,
          beforeAfter: 'Custom permissions saved',
          reason,
          effectiveDate: new Date().toLocaleDateString('en-US'),
        },
        ...(prev.auditLogs || []),
      ],
    };
  });
};

export const resetUserToRoleDefault = (userKey, reason = 'Reset user permissions to role defaults') => {
  const cleanKey = (userKey || '').trim().toLowerCase();
  apiClient.post(`/settings/rbac/user/${cleanKey}/reset`, { reason }).catch(() => {});
  return updateAdminPortalState((prev) => {
    const existingUsers = { ...(prev.userPermissions || {}) };
    delete existingUsers[cleanKey];
    return {
      ...prev,
      userPermissions: existingUsers,
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          user: 'Robert King (Admin)',
          action: 'Reset User to Role Default',
          target: cleanKey,
          beforeAfter: 'Reverted to role template',
          reason,
          effectiveDate: new Date().toLocaleDateString('en-US'),
        },
        ...(prev.auditLogs || []),
      ],
    };
  });
};

export const saveRoleTierPermissions = (role, permissions, reason = 'Updated Role Tier Default Permissions') => {
  const cleanRole = (role || 'manager').toLowerCase();
  const sanitizedPerms = sanitizeRolePermissions(cleanRole, permissions);
  return updateAdminPortalState((prev) => {
    const existingRoles = prev.rolePermissions || DEFAULT_ROLE_PERMISSIONS;
    return {
      ...prev,
      rolePermissions: {
        ...existingRoles,
        [cleanRole]: {
          ...(existingRoles[cleanRole] || {}),
          ...sanitizedPerms,
        },
      },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          user: 'Robert King (Admin)',
          action: `Updated ${cleanRole.toUpperCase()} Role Tier Default`,
          target: `${cleanRole} base tier`,
          beforeAfter: 'Role default permissions updated',
          reason,
          effectiveDate: new Date().toLocaleDateString('en-US'),
        },
        ...(prev.auditLogs || []),
      ],
    };
  });
};


