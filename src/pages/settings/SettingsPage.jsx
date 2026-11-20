import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProfileSettings from './ProfileSettings';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  DatabaseBackup,
  History,
  Download,
  Eye,
  LogOut,
  Sliders,
  RotateCcw,
  Trash2,
  Lock,
  Unlock,
  Building2,
  FileText,
  DollarSign,
  Wrench,
  UserCheck,
  UserPlus,
  Shield,
  KeyRound,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import Modal from '../../components/ui/Modal';
import {
  getAdminPortalState,
  updateAdminPortalState,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  getUserEffectivePermissions,
  saveUserPermissions,
  resetUserToRoleDefault,
  saveRoleTierPermissions,
} from '../../data/adminPortalStore';
import { getManagers, getOwners } from '../../data/mockExtra';
import { formatUsd } from '../../utils/formatters';
import { isDemoMode, setCleanMode, setDemoMode } from '../../data/appDataReset';

function createAuditId() {
  return `AUD-${Date.now()}`;
}

function formatNowStamp() {
  return new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ROLE_META = {
  admin: {
    label: 'Admin',
    accountHolder: 'Robert King · Primary Administrator',
    scopeNote: 'Full U.S. portfolio governance, payouts, billing overrides, and RBAC controls.',
  },
  owner: {
    label: 'Owner',
    accountHolder: 'Claire Bennett · Property Owner (Read-Only)',
    scopeNote: 'Owned properties only. Views cash position, expenses, disbursements, and statements; tenant PII hidden.',
  },
  manager: {
    label: 'Manager',
    accountHolder: 'Sarah Jenkins · Property Manager',
    scopeNote: 'Assigned buildings only (4 properties · 118 units). Approvals capped by manager spending limit.',
  },
  tenant: {
    label: 'Tenant',
    accountHolder: 'Rebecca Miller · Resident (A-204)',
    scopeNote: 'Own household only. Can pay rent, submit repair work orders, and message manager/vendors.',
  },
};

const MODULE_LABELS = [
  { key: 'properties', label: 'Properties' },
  { key: 'units', label: 'Units & Turnovers' },
  { key: 'owners', label: 'Owners & Payouts' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'leases', label: 'Leases & Renewals' },
  { key: 'billing', label: 'Rent & Collections' },
  { key: 'deposits', label: 'Security Deposits' },
  { key: 'expenses', label: 'Expenses & Bills' },
  { key: 'maintenance', label: 'Maintenance & WOs' },
  { key: 'reports', label: 'Financial Reports' },
  { key: 'settings', label: 'Settings & RBAC' },
];

const INITIAL_SESSIONS = [
  { id: 'SES-01', user: 'Robert King (Admin)', device: 'Chrome · Windows · New York, NY', lastActive: 'Just now', active: true },
  { id: 'SES-02', user: 'Sarah Jenkins (Manager)', device: 'Safari · macOS · Brooklyn, NY', lastActive: '14 min ago', active: true },
  { id: 'SES-03', user: 'Claire Bennett (Owner)', device: 'Edge · Windows · Manhattan, NY', lastActive: '1 hr ago', active: true },
  { id: 'SES-04', user: 'Rebecca Miller (Tenant)', device: 'Mobile Safari · iOS · Brooklyn, NY', lastActive: '2 hr ago', active: true },
];

const RBAC_CATEGORIES = [
  {
    id: 'tenants',
    title: 'Tenants Access Control',
    subtitle: 'Manage permissions to View, Add, Edit, and Remove tenant & resident records',
    icon: Users,
    viewKey: 'canViewTenants',
    items: [
      {
        key: 'canViewTenants',
        label: 'View Tenants & Directory',
        desc: 'Allows viewing the full tenant directory, unit assignments, contact info, and household profiles.',
        icon: Eye,
      },
      {
        key: 'canAddTenants',
        label: 'Add & Onboard Residents',
        desc: 'Allows enrolling new tenants into vacant units, creating login accounts, and issuing onboarding invites.',
        icon: UserPlus,
        highlight: true,
      },
      {
        key: 'canEditTenants',
        label: 'Edit Resident Profiles & Notes',
        desc: 'Allows updating resident contact details, lease notes, emergency contacts, and vehicle permits.',
        icon: Sliders,
      },
      {
        key: 'canDeleteTenants',
        label: 'Remove / Delete Tenant Records',
        desc: 'Allows permanently archiving or deleting tenant household records from the building roster.',
        icon: Trash2,
      },
    ],
  },
  {
    id: 'properties',
    title: 'Properties Access Control',
    subtitle: 'Manage permissions to View, Add, Edit, and Remove portfolio properties & units',
    icon: Building2,
    viewKey: 'canViewProperties',
    items: [
      {
        key: 'canViewProperties',
        label: 'View Properties & Units',
        desc: 'Allows browsing the portfolio building catalog, unit turnover statuses, occupancy rates, and floor plans.',
        icon: Eye,
      },
      {
        key: 'canAddProperties',
        label: 'Add / Register New Properties',
        desc: 'Allows adding and onboarding new physical building entities and developments into the portfolio.',
        icon: Building2,
        highlight: true,
      },
      {
        key: 'canEditProperties',
        label: 'Edit Property Details & Units',
        desc: 'Allows modifying building specifications, unit counts, amenities, floor plans, and addresses.',
        icon: Sliders,
      },
      {
        key: 'canDeleteProperties',
        label: 'Remove / Delete Properties',
        desc: 'Allows permanently archiving, decommissioning, or removing property entities from the active portfolio.',
        icon: Trash2,
      },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();

  if (user?.role && !['admin', 'super_admin'].includes(user.role)) {
    return <ProfileSettings />;
  }

  const [activeTab, setActiveTab] = useState('company');
  const [portalState, setPortalState] = useState(() => getAdminPortalState());
  const [settings, setSettings] = useState(() => ({
    allowPartialRentPayments: true,
    autoApplyTenantCredits: true,
    requireDepositDualReview: true,
    exportRetentionYears: '7 Years (IRS & State Compliance)',
    reportExportFormat: 'CSV + PDF Statement Bundle',
    ...getAdminPortalState().settings,
  }));

  // Admin Change Password State
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [isUpdatingAdminPassword, setIsUpdatingAdminPassword] = useState(false);

  const handleAdminPasswordUpdate = async (e) => {
    e.preventDefault();
    if (!adminCurrentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (adminNewPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setIsUpdatingAdminPassword(true);
    try {
      await authService.changePassword(adminCurrentPassword, adminNewPassword);
      setAdminCurrentPassword('');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      toast.success('Admin password updated successfully in database!');
    } catch (err) {
      toast.error(err.message || 'Failed to update admin password');
    } finally {
      setIsUpdatingAdminPassword(false);
    }
  };

  // Available Accounts for Granular RBAC Assignment
  const managersList = useMemo(() => {
    const custom = getManagers().filter((m) => !m.archived);
    const standard = [
      {
        id: 'manager@rentlock.com',
        name: 'Sarah Jenkins',
        email: 'manager@rentlock.com',
        role: 'manager',
        title: 'Lead Operations Manager',
        properties: 'Sunrise Residency, Harborview Lofts, Metro Business Park, Green Valley Villas',
      },
    ];
    const combined = [...standard];
    custom.forEach((c) => {
      const email = (c.email || `${c.name.toLowerCase().replace(/\s+/g, '.')}@rentlock.com`).toLowerCase();
      const name = (c.name || '').trim().toLowerCase();
      const alreadyExists = combined.some(
        (x) => x.email.toLowerCase() === email || x.name.trim().toLowerCase() === name
      );
      if (!alreadyExists) {
        combined.push({
          id: email,
          name: c.name,
          email,
          role: 'manager',
          title: c.role || 'Property Manager',
          properties: Array.isArray(c.properties) ? c.properties.join(', ') : 'Assigned Buildings',
        });
      }
    });
    return combined;
  }, []);

  const ownersList = useMemo(() => {
    const custom = getOwners().filter((o) => !o.archived);
    const standard = [
      {
        id: 'owner@rentlock.com',
        name: 'Claire Bennett',
        email: 'owner@rentlock.com',
        role: 'owner',
        title: 'Primary Holding Owner',
        properties: 'Sunrise Residency, Green Valley Villas, Metro Business Park',
      },
    ];
    const combined = [...standard];
    custom.forEach((c) => {
      const email = (c.email || `${c.name.toLowerCase().replace(/\s+/g, '.')}@rentlock.com`).toLowerCase();
      const name = (c.name || '').trim().toLowerCase();
      const alreadyExists = combined.some(
        (x) => x.email.toLowerCase() === email || x.name.trim().toLowerCase() === name
      );
      if (!alreadyExists) {
        combined.push({
          id: email,
          name: c.name,
          email,
          role: 'owner',
          title: 'Property Asset Owner',
          properties: Array.isArray(c.properties) ? c.properties.join(', ') : 'Owned Properties',
        });
      }
    });
    return combined;
  }, []);

  const allUsersForRbac = useMemo(() => {
    return [...managersList, ...ownersList];
  }, [managersList, ownersList]);

  // Granular RBAC State
  const sanitizePerms = (perms) => {
    if (!perms) return perms;
    const clean = { ...perms };
    if (!clean.canViewTenants) {
      clean.canAddTenants = false;
      clean.canEditTenants = false;
      clean.canDeleteTenants = false;
    }
    if (!clean.canViewProperties) {
      clean.canAddProperties = false;
      clean.canEditProperties = false;
      clean.canDeleteProperties = false;
    }
    return clean;
  };

  const [rbacConfigMode, setRbacConfigMode] = useState('specific_user'); // 'specific_user' | 'role_tier'
  const [selectedUserKey, setSelectedUserKey] = useState('manager@rentlock.com');
  const [selectedRoleTier, setSelectedRoleTier] = useState('manager');
  const [permsDraft, setPermsDraft] = useState(() => {
    return sanitizePerms(getUserEffectivePermissions('manager@rentlock.com'));
  });

  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  const [rbacReason, setRbacReason] = useState('');
  const [previewRole, setPreviewRole] = useState(null);
  const [activeRbacCategory, setActiveRbacCategory] = useState('all');

  const visibleCategories = useMemo(() => {
    if (activeRbacCategory === 'all') return RBAC_CATEGORIES;
    return RBAC_CATEGORIES.filter((c) => c.id === activeRbacCategory);
  }, [activeRbacCategory]);

  const totalPermissionsCount = useMemo(() => {
    return RBAC_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
  }, []);

  const totalAllowedCount = useMemo(() => {
    return RBAC_CATEGORIES.reduce((acc, cat) => {
      return acc + cat.items.filter((item) => !!permsDraft[item.key]).length;
    }, 0);
  }, [permsDraft]);

  const currentSelectedUser = useMemo(() => {
    return (
      allUsersForRbac.find((u) => u.email.toLowerCase() === selectedUserKey.toLowerCase()) ||
      managersList[0]
    );
  }, [allUsersForRbac, selectedUserKey, managersList]);

  const handleSelectUser = (emailKey) => {
    setSelectedUserKey(emailKey);
    const perms = getUserEffectivePermissions(emailKey);
    setPermsDraft(sanitizePerms(perms));
  };

  const handleSelectRoleTier = (roleKey) => {
    setSelectedRoleTier(roleKey);
    const state = getAdminPortalState();
    const rolePerms = state.rolePermissions?.[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey];
    setPermsDraft(sanitizePerms({ ...rolePerms, role: roleKey, spendingCap: rolePerms.spendingCap || 0 }));
  };

  const handleTogglePerm = (key) => {
    setPermsDraft((prev) => {
      const nextVal = !prev[key];
      const updated = {
        ...prev,
        [key]: nextVal,
      };

      // Hierarchical RBAC rules:
      // If View Tenants is turned OFF, automatically restrict Add, Edit, and Delete for Tenants
      if (key === 'canViewTenants' && !nextVal) {
        updated.canAddTenants = false;
        updated.canEditTenants = false;
        updated.canDeleteTenants = false;
      }

      // If View Properties is turned OFF, automatically restrict Add, Edit, and Delete for Properties
      if (key === 'canViewProperties' && !nextVal) {
        updated.canAddProperties = false;
        updated.canEditProperties = false;
        updated.canDeleteProperties = false;
      }

      return updated;
    });
  };

  const handleResetUserToDefault = () => {
    const next = resetUserToRoleDefault(
      selectedUserKey,
      `Reverted ${currentSelectedUser?.name || selectedUserKey} to default role permissions`
    );
    setPortalState(next);
    const refreshed = getUserEffectivePermissions(selectedUserKey);
    setPermsDraft(sanitizePerms(refreshed));
    toast.success(`Reset ${currentSelectedUser?.name || selectedUserKey} to default role permissions.`);
  };

  const commitRbacUpdate = () => {
    if (!rbacReason.trim()) {
      toast.error('Please enter a mandatory audit reason for changing account permissions.');
      return;
    }
    let next;
    const targetLabel =
      rbacConfigMode === 'specific_user'
        ? `${currentSelectedUser?.name || selectedUserKey} (${currentSelectedUser?.role})`
        : `${ROLE_META[selectedRoleTier]?.label || selectedRoleTier} (Role Tier Default)`;

    if (rbacConfigMode === 'specific_user') {
      next = saveUserPermissions(selectedUserKey, permsDraft, `${rbacReason.trim()} [${targetLabel}]`);
      toast.success(`Permissions for ${currentSelectedUser?.name || selectedUserKey} saved & applied immediately.`);
    } else {
      next = saveRoleTierPermissions(selectedRoleTier, permsDraft, `${rbacReason.trim()} [${targetLabel}]`);
      toast.success(`${ROLE_META[selectedRoleTier]?.label || selectedRoleTier} role tier defaults saved & applied.`);
    }
    setPortalState(next);
    setIsRbacModalOpen(false);
    setRbacReason('');
  };

  const saveCompanySettings = () => {
    const next = updateAdminPortalState((prev) => ({
      ...prev,
      settings,
      auditLogs: [
        {
          id: createAuditId(),
          timestamp: formatNowStamp(),
          user: 'Robert King (Admin)',
          action: 'Updated Company Defaults',
          target: `${settings.companyName} · ${settings.accountingBasis}`,
          beforeAfter: `${settings.currency} · ${settings.dateFormat}`,
          reason: 'Saved company defaults & module rules',
          effectiveDate: new Date().toLocaleDateString('en-US'),
        },
        ...(prev.auditLogs || []),
      ],
    }));
    setPortalState(next);
    toast.success('U.S. company profile & defaults saved.');
  };

  // Backup & Session State
  const [lastBackupRun, setLastBackupRun] = useState('Today 03:00 AM (Encrypted S3 US-East)');
  const [lastRestoreCheck, setLastRestoreCheck] = useState('Verified 11/10/2026 · 0 errors');
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [rbacDraft] = useState(() => getAdminPortalState().roleMatrix);

  const handleTriggerBackup = () => {
    const stamp = formatNowStamp();
    setLastBackupRun(`${stamp} (Manual Encrypted Snapshot)`);
    const next = updateAdminPortalState((prev) => ({
      ...prev,
      auditLogs: [
        {
          id: createAuditId(),
          timestamp: stamp,
          user: 'Robert King (Admin)',
          action: 'Executed Manual S3 Backup',
          target: 'AWS S3 US-East Vault',
          beforeAfter: 'Immutable encrypted snapshot created',
          reason: 'Admin verification snapshot',
          effectiveDate: stamp.split(',')[0],
        },
        ...(prev.auditLogs || []),
      ],
    }));
    setPortalState(next);
    toast.success('Encrypted S3 backup snapshot created.');
  };

  const handleVerifyRestore = () => {
    const stamp = formatNowStamp();
    setLastRestoreCheck(`Verified ${stamp} · Integrity 100%`);
    toast.success('Sandbox restore verification completed with zero checksum mismatches.');
  };

  const handleDownloadGovernanceExport = () => {
    const payload = JSON.stringify(
      {
        exportedAt: formatNowStamp(),
        settings,
        roleMatrix: rbacDraft,
        auditLogs: portalState.auditLogs || [],
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RentLock-Governance-Settings-Export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Governance & audit export downloaded.');
  };

  const handleRevokeSession = (sesId, userLabel) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sesId ? { ...s, active: false, lastActive: 'Revoked' } : s))
    );
    const stamp = formatNowStamp();
    const next = updateAdminPortalState((prev) => ({
      ...prev,
      auditLogs: [
        {
          id: createAuditId(),
          timestamp: stamp,
          user: 'Robert King (Admin)',
          action: 'Revoked Active Session',
          target: userLabel,
          beforeAfter: 'Session Active -> Revoked',
          reason: 'Security session revocation from Settings',
          effectiveDate: stamp.split(',')[0],
        },
        ...(prev.auditLogs || []),
      ],
    }));
    setPortalState(next);
    toast.success(`Revoked active session for ${userLabel}.`);
  };

  const handleClearAllData = () => {
    setCleanMode();
    toast.success('All dummy/test records cleared! Ready to test fresh flow from 0 records.');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleLoadSampleData = () => {
    setDemoMode();
    toast.success('Sample demo portfolio loaded!');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Platform Settings & Access Controls"
        subtitle="U.S. portfolio defaults, Role-Based Access Controls (RBAC), backups, and audit log."
        breadcrumbs={[{ label: 'Governance' }, { label: 'Settings' }]}
      />

      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-gray-200">
        {[
          { id: 'company', label: 'Company Defaults (U.S.)' },
          { id: 'rbac', label: 'Account Access & RBAC' },
          { id: 'security', label: 'Change Password' },
          // { id: 'backups', label: 'Backups, Audit & Sessions' },
          // { id: 'health', label: 'Connection Health (5)' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Company Defaults */}
      {activeTab === 'company' && (
        <Card className="p-6 max-w-4xl space-y-5">
          <h3 className="text-base font-bold text-gray-900">Operating Entity & Locale Defaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Legal Management Entity" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
            <Input label="Federal EIN (Masked Display)" value={settings.ein} onChange={(e) => setSettings({ ...settings, ein: e.target.value })} />
            <Input label="Support Email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} />
            <Input label="Support U.S. Phone" value={settings.supportPhone} onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })} />
          </div>
          <Input label="Registered U.S. Office Address" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          <Button icon={Save} onClick={saveCompanySettings}>Save Company Defaults</Button>
        </Card>
      )}

      {/* TAB 3: Change Password Dedicated Tab */}
      {activeTab === 'security' && (
        <Card className="p-6 max-w-4xl space-y-6">
          <form onSubmit={handleAdminPasswordUpdate} className="space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-gray-900">Change Admin Password</h3>
                <p className="text-xs text-gray-500">Update the primary administrator account password ({user?.email || 'admin@rentlock.com'}).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Current Password *"
                  type="password"
                  icon={Lock}
                  value={adminCurrentPassword}
                  onChange={(e) => setAdminCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <Input
                label="New Password *"
                type="password"
                icon={Lock}
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                helperText="Must be at least 6 characters"
                required
              />
              <Input
                label="Confirm New Password *"
                type="password"
                icon={Lock}
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button
                type="submit"
                icon={KeyRound}
                loading={isUpdatingAdminPassword}
                className="px-6"
              >
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: Account Access & RBAC Controls */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Role-Based Access Control (RBAC) Governance
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure access permissions for Managers &amp; Owners — control View, Add, Edit, and Remove access for Tenants and Properties.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setRbacConfigMode('specific_user');
                    const perms = getUserEffectivePermissions(selectedUserKey);
                    setPermsDraft(perms);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    rbacConfigMode === 'specific_user'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👤 Configure Specific User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRbacConfigMode('role_tier');
                    handleSelectRoleTier(selectedRoleTier);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    rbacConfigMode === 'role_tier'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🛡️ Role Tier Defaults
                </button>
              </div>
            </div>

            {/* MODE 1: Specific User Overrides */}
            {rbacConfigMode === 'specific_user' && (
              <div className="space-y-6">
                {/* User Selector Pills - Grouped by Role */}
                <div className="space-y-4">
                  {/* Property Managers */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Property Managers ({managersList.length}):
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {managersList.map((m) => {
                        const isSelected = selectedUserKey.toLowerCase() === m.email.toLowerCase();
                        const perms = getUserEffectivePermissions(m.email);
                        return (
                          <button
                            key={m.email}
                            type="button"
                            onClick={() => handleSelectUser(m.email)}
                            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {m.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <p className="font-bold leading-tight">{m.name}</p>
                              <p className="text-[10px] text-gray-400 font-normal">Manager · {m.email}</p>
                            </div>
                            {perms.isCustomOverride && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" title="Custom override active" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Property Owners */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Property Owners ({ownersList.length}):
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {ownersList.map((o) => {
                        const isSelected = selectedUserKey.toLowerCase() === o.email.toLowerCase();
                        const perms = getUserEffectivePermissions(o.email);
                        return (
                          <button
                            key={o.email}
                            type="button"
                            onClick={() => handleSelectUser(o.email)}
                            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-50 border-purple-400 text-purple-900 ring-2 ring-purple-500/20 shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                              isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {o.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <p className="font-bold leading-tight">{o.name}</p>
                              <p className="text-[10px] text-gray-400 font-normal">Owner · {o.email}</p>
                            </div>
                            {perms.isCustomOverride && (
                              <span className="w-2 h-2 rounded-full bg-purple-600 ring-2 ring-white" title="Custom override active" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected User Account Summary Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/50 border border-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-sm">
                      {currentSelectedUser?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{currentSelectedUser?.name}</h4>
                        <Badge variant={currentSelectedUser?.role === 'manager' ? 'info' : 'purple'}>
                          {currentSelectedUser?.role === 'manager' ? 'Property Manager' : 'Property Owner'}
                        </Badge>
                        {permsDraft.isCustomOverride ? (
                          <Badge variant="success">Custom RBAC Active</Badge>
                        ) : (
                          <Badge variant="gray">Inheriting Role Defaults</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {currentSelectedUser?.email} · Scope: <strong>{currentSelectedUser?.properties || 'Assigned Portfolio'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {permsDraft.isCustomOverride && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={RotateCcw}
                        onClick={handleResetUserToDefault}
                        title="Remove custom overrides and restore role tier defaults"
                      >
                        Reset to Role Defaults
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Eye}
                      onClick={() => setPreviewRole(previewRole === currentSelectedUser?.email ? null : currentSelectedUser?.email)}
                    >
                      {previewRole === currentSelectedUser?.email ? 'Hide Preview' : 'Preview Capabilities'}
                    </Button>
                  </div>
                </div>

                {/* Collapsible Capability Preview Drawer */}
                {previewRole === currentSelectedUser?.email && (
                  <div className="p-4.5 rounded-2xl bg-white border border-indigo-200 shadow-xs space-y-3 transition-all">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-gray-900">
                          Active Capability Breakdown for {currentSelectedUser?.name}:
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {totalAllowedCount} Allowed
                        </span>
                        <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                          {totalPermissionsCount - totalAllowedCount} Restricted
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                      {RBAC_CATEGORIES.flatMap((c) => c.items).map((item) => {
                        const allowed = !!permsDraft[item.key];
                        return (
                          <div
                            key={item.key}
                            className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2 border transition-all ${
                              allowed
                                ? 'bg-emerald-50/50 border-emerald-200/80 text-gray-900'
                                : 'bg-gray-50/70 border-gray-200 text-gray-400'
                            }`}
                          >
                            <span className="font-semibold truncate">{item.label}</span>
                            <span
                              className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200/80 text-gray-600'
                              }`}
                            >
                              {allowed ? 'Allowed' : 'Locked'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: Global Role Tier Defaults */}
            {rbacConfigMode === 'role_tier' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Select Role Tier to Configure Global Defaults:
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Changes here establish the baseline for all accounts under this role that don&apos;t have custom overrides.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['manager', 'owner', 'admin', 'tenant'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleSelectRoleTier(r)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          selectedRoleTier === r
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {ROLE_META[r]?.label || r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <p className="text-sm font-bold text-indigo-950">{ROLE_META[selectedRoleTier]?.label} Tier Baseline</p>
                  <p className="text-xs text-indigo-800 mt-0.5">{ROLE_META[selectedRoleTier]?.scopeNote}</p>
                </div>
              </div>
            )}

            {/* Granular Permission Modules & Categories */}
            <div className="space-y-6 pt-2">
              {/* Category Filter Pills & Summary Counter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Permissions &amp; Capabilities Matrix:
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {totalAllowedCount} of {totalPermissionsCount} Allowed
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    type="button"
                    onClick={() => setActiveRbacCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeRbacCategory === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    All Access ({totalPermissionsCount})
                  </button>
                  {RBAC_CATEGORIES.map((cat) => {
                    const activeCount = cat.items.filter((item) => !!permsDraft[item.key]).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveRbacCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          activeRbacCategory === cat.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <span>{cat.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-normal ${
                            activeRbacCategory === cat.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {activeCount}/{cat.items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grouped Permission Cards */}
              <div className="space-y-5">
                {visibleCategories.map((cat) => {
                  const isViewAllowed = cat.viewKey ? !!permsDraft[cat.viewKey] : true;
                  const visibleItems = cat.items.filter((item) => item.key === cat.viewKey || isViewAllowed);
                  const activeCount = cat.items.filter((item) => !!permsDraft[item.key]).length;
                  const isAllActive = activeCount === cat.items.length;
                  const isNoneActive = activeCount === 0;

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl border border-gray-200/90 bg-white overflow-hidden shadow-xs hover:border-gray-300 transition-colors"
                    >
                      {/* Category Header */}
                      <div className="p-4 sm:px-5 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60 shadow-xs">
                            <cat.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{cat.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{cat.subtitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border transition-all ${
                              isAllActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isNoneActive
                                ? 'bg-gray-100 text-gray-600 border-gray-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAllActive ? 'bg-emerald-500' : isNoneActive ? 'bg-gray-400' : 'bg-indigo-500'
                              }`}
                            />
                            {activeCount} of {cat.items.length} Allowed
                          </span>
                        </div>
                      </div>

                      {/* Divided Rows of Permissions */}
                      <div className="divide-y divide-gray-100">
                        {visibleItems.map((item) => {
                          const isAllowed = !!permsDraft[item.key];
                          const ItemIcon = item.icon || Shield;

                          return (
                            <div
                              key={item.key}
                              className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors ${
                                item.highlight && isAllowed
                                  ? 'bg-emerald-50/20 hover:bg-emerald-50/30'
                                  : 'hover:bg-gray-50/70'
                              }`}
                            >
                              <div className="flex items-start gap-3.5">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                                    isAllowed
                                      ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                      : 'bg-gray-100 text-gray-400 border-gray-200'
                                  }`}
                                >
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900">{item.label}</span>
                                    {item.highlight && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                        Primary Role Action
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed max-w-2xl">
                                    {item.desc}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center ml-auto">
                                <span
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border transition-all ${
                                    isAllowed
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-gray-100 text-gray-500 border-gray-200'
                                  }`}
                                >
                                  {isAllowed ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Allowed</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                                      <span>Restricted</span>
                                    </>
                                  )}
                                </span>
                                <Toggle
                                  checked={isAllowed}
                                  onChange={() => handleTogglePerm(item.key)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {!isViewAllowed && (
                        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
                          <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>View access is restricted. Add, Edit, and Remove capabilities are hidden and locked.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Security & Session Guardrails Card */}
            {/* <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Platform Authentication &amp; Session Safeguards</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Global login security thresholds applied across all user portals.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-900">Enforce Two-Factor Authentication (MFA)</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">Mandates SMS or Authenticator verification for Admin, Owner &amp; Manager accounts.</p>
                  </div>
                  <Toggle
                    checked={settings.mfaRequired}
                    onChange={(val) => setSettings({ ...settings, mfaRequired: val })}
                  />
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-900">Idle Session Inactivity Timeout</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">Automatically ends inactive portal sessions to prevent unauthorized device access.</p>
                  </div>
                  <Select
                    value={String(settings.sessionTimeoutMins)}
                    options={['15 mins', '30 mins', '60 mins']}
                    onChange={(e) => setSettings({ ...settings, sessionTimeoutMins: Number(parseInt(e.target.value)) || 30 })}
                  />
                </div>
              </div>
            </div> */}

            {/* Save Permissions Action Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-50 via-white to-indigo-50/40 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Updates apply immediately in real time and are recorded in the <strong>Governance Audit Log</strong>.
                </span>
              </div>
              <Button icon={ShieldCheck} onClick={() => setIsRbacModalOpen(true)}>
                {rbacConfigMode === 'specific_user'
                  ? `Save Permissions for ${currentSelectedUser?.name || selectedUserKey}`
                  : `Save ${ROLE_META[selectedRoleTier]?.label || selectedRoleTier} Tier Baseline`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Backups, Audit Log & Active Sessions (Disabled) */}
      {false && activeTab === 'backups' && (
        <div className="space-y-6">
          {/* Portfolio Flow Testing & Data Control Card */}
          <Card className="p-6 space-y-4 border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-indigo-600" />
                  Portfolio Flow Testing &amp; Data Control
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Test your real estate operations end-to-end starting with an empty portfolio, or restore demo sample data anytime.
                </p>
              </div>
              <Badge variant={isDemoMode() ? 'info' : 'success'}>
                {isDemoMode() ? 'Demo Sample Mode Active' : 'Clean Flow Mode Active (0 Records)'}
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 text-xs text-gray-600 space-y-1.5">
              <p>
                <strong>Current State:</strong> {isDemoMode()
                  ? 'Sample demo properties, units, tenants, and transactions are currently loaded.'
                  : 'All lists start completely empty (0 records). You can test onboarding properties, units, tenants, owners, leases, rent billing, and work orders step-by-step from scratch.'}
              </p>
              <p className="text-gray-500">
                Login accounts (Admin, Owner, Manager, Tenant) and security safeguards remain permanently functional in all modes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="secondary"
                icon={Trash2}
                onClick={handleClearAllData}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Reset to Blank Slate (Clear All Data)
              </Button>
              <Button
                icon={DatabaseBackup}
                onClick={handleLoadSampleData}
              >
                Load Sample Demo Portfolio
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <DatabaseBackup className="w-4 h-4 text-indigo-600" />
                Data Backup, Restore &amp; Exports
              </h3>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Latest Automated Snapshot</span>
                  <span className="font-semibold text-gray-900">{lastBackupRun}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Restore Integrity Check</span>
                  <span className="font-semibold text-emerald-700">{lastRestoreCheck}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Retention Window</span>
                  <span className="font-semibold text-gray-900">{settings.exportRetentionYears}</span>
                </div>
              </div>
              <Toggle
                label="Enable Daily Encrypted S3 Cloud Backup (03:00 AM ET)"
                checked={settings.autoBackupDaily}
                onChange={(val) => setSettings({ ...settings, autoBackupDaily: val })}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={DatabaseBackup} onClick={handleTriggerBackup}>
                  Run Backup Now
                </Button>
                <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={handleVerifyRestore}>
                  Verify Restore Checksum
                </Button>
                <Button size="sm" variant="secondary" icon={Download} onClick={handleDownloadGovernanceExport}>
                  Export Governance JSON
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Active Sessions &amp; Login History</h3>
              <div className="space-y-2.5">
                {sessions.map((ses) => (
                  <div
                    key={ses.id}
                    className="p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{ses.user}</p>
                      <p className="text-gray-500">
                        {ses.device} · {ses.lastActive}
                      </p>
                    </div>
                    {ses.active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={LogOut}
                        onClick={() => handleRevokeSession(ses.id, ses.user)}
                      >
                        Revoke
                      </Button>
                    ) : (
                      <Badge status="Inactive">Revoked</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Governance &amp; Policy Audit Trail ({(portalState.auditLogs || []).length})
                </h3>
                <p className="text-xs text-gray-500">
                  All RBAC edits, cap escalations, policy overrides, backups, and session revocations are recorded with timestamp &amp; reason.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold text-gray-500 uppercase">
                    <th className="py-2 pr-3">Timestamp</th>
                    <th className="py-2 px-3">Actor</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Target</th>
                    <th className="py-2 px-3">Change Summary</th>
                    <th className="py-2 pl-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(portalState.auditLogs || []).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-nowrap">{log.user}</td>
                      <td className="py-2.5 px-3 font-medium text-indigo-700">{log.action}</td>
                      <td className="py-2.5 px-3 text-gray-700">{log.target}</td>
                      <td className="py-2.5 px-3 text-gray-600">{log.beforeAfter}</td>
                      <td className="py-2.5 pl-3 text-gray-700">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: Connection Health (Disabled) */}
      {false && activeTab === 'health' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Connected Infrastructure &amp; Fallback Safeguards</h3>
              <p className="text-xs text-gray-500">Live payment gateway, email, 10DLC SMS, QuickBooks export, and daily encrypted S3 backups.</p>
            </div>
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => toast.success('All 5 integrations healthy.')}>
              Run Health Check
            </Button>
          </div>
          <div className="space-y-3">
            {(portalState.connectionHealth || []).map((c) => (
              <div key={c.service} className="p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-sm text-gray-900">{c.service}</p>
                  <p className="text-gray-500 mt-0.5">Last sync: {c.lastSync} · Fallback: <strong>{c.fallbackMode}</strong></p>
                </div>
                <Badge status={c.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* RBAC Audit Modal */}
      <Modal
        isOpen={isRbacModalOpen}
        onClose={() => setIsRbacModalOpen(false)}
        title={
          rbacConfigMode === 'specific_user'
            ? `Confirm RBAC Permissions for ${currentSelectedUser?.name || selectedUserKey}`
            : `Confirm ${ROLE_META[selectedRoleTier]?.label || selectedRoleTier} Tier Defaults Update`
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRbacModalOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={commitRbacUpdate}>Save &amp; Log RBAC Change</Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
            Permission updates take effect immediately for <strong>{rbacConfigMode === 'specific_user' ? currentSelectedUser?.name : selectedRoleTier}</strong> across all active sessions and are permanently logged in the Governance Audit Trail.
          </div>
          <Input
            label="Mandatory Audit Reason *"
            placeholder={
              rbacConfigMode === 'specific_user'
                ? `e.g. Configured tenant enrollment & ${formatUsd(permsDraft.spendingCap || 1000)} maintenance cap for ${currentSelectedUser?.name}`
                : `e.g. Updated standard role capabilities for ${selectedRoleTier}`
            }
            value={rbacReason}
            onChange={(e) => setRbacReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
