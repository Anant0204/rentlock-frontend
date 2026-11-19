import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, Calendar, DollarSign, FileText, CheckCircle2, AlertTriangle,
  Plus, Trash2, Send, Save, FileDown, ArrowLeft, ArrowRight, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getProperties } from '../../data/mockProperties';
import { getUnits } from '../../data/mockUnits';
import { getTenants } from '../../data/mockTenants';
import { getLeases, updateLease } from '../../data/mockLeases';
import { updateAdminPortalState } from '../../data/adminPortalStore';
import { formatUsd, formatDate } from '../../utils/formatters';
import apiClient from '../../services/apiClient';

const JURISDICTIONS = ['NY', 'NJ', 'TX', 'CA', 'FL', 'IL', 'MA', 'PA', 'WA'];
const ADDENDA_LIST = [
  'Lead-Based Paint Disclosure (Pre-1978)',
  'Bedbug & Pest History Rider',
  'Pet Addendum & Weight Schedule',
  'Building Rules & Noise Policy',
  'Electronic Delivery & Portal Consent',
];

export default function CreateLease() {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingApplicant = location.state?.applicant || null;

  const [propertiesList, setPropertiesList] = useState(() => getProperties().filter((p) => !p.archived));
  const [unitsList, setUnitsList] = useState(() => getUnits().filter((u) => !u.archived));
  const [tenantsList, setTenantsList] = useState(() => getTenants().filter((t) => t.status !== 'Archived' && t.status !== 'Exited'));

  const refreshTenants = useCallback(() => {
    const local = getTenants().filter((t) => t.status !== 'Archived' && t.status !== 'Exited');
    setTenantsList(local);

    apiClient.get('/tenants?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        const valid = items.filter((t) => t.status !== 'Archived' && t.status !== 'Exited');
        setTenantsList(valid);
        try {
          localStorage.setItem('custom_tenants', JSON.stringify(items));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshTenants();

    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setPropertiesList(items.filter((p) => !p.archived));
      }
    }).catch(() => {});

    apiClient.get('/units?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setUnitsList(items.filter((u) => !u.archived));
      }
    }).catch(() => {});

    const handleSync = () => {
      refreshTenants();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('rentlock_tenants_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('rentlock_tenants_changed', handleSync);
    };
  }, [refreshTenants]);

  const properties = propertiesList;
  const units = unitsList;

  const initialProperty = incomingApplicant?.propertyName || properties[0]?.name || 'Sunrise Residency';
  const propertyUnits = useMemo(() => units.filter((u) => {
    return u.propertyName === initialProperty || u.property?.name === initialProperty;
  }), [units, initialProperty]);
  const initialUnit = incomingApplicant?.unitNumber || propertyUnits[0]?.unitNumber || 'B-101';

  // Find initial tenant belonging to this initial property and unit
  const initialMatchingTenant = tenantsList.find((t) =>
    (t.propertyName && t.propertyName.toLowerCase() === initialProperty.toLowerCase()) &&
    (t.unitNumber && String(t.unitNumber).trim().toLowerCase() === String(initialUnit).trim().toLowerCase())
  ) || tenantsList.find((t) => t.propertyName && t.propertyName.toLowerCase() === initialProperty.toLowerCase());

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    propertyName: initialProperty,
    unitNumber: initialUnit,
    coSigners: [
      {
        name: incomingApplicant?.applicantName || initialMatchingTenant?.name || '',
        role: 'Primary Tenant',
        email: incomingApplicant?.email || initialMatchingTenant?.email || '',
        tenantId: initialMatchingTenant?.id,
      },
      { name: 'Robert King', role: 'Landlord / Agent', email: 'robert.king@rentlock.com' },
    ],
    leaseType: 'Fixed-Term',
    startDate: incomingApplicant?.proposedMoveIn || '2026-12-01',
    endDate: '2027-11-30',
    moveInDate: incomingApplicant?.proposedMoveIn || '2026-12-01',
    noticeDays: '60',
    reminders: { d90: true, d60: true, d30: true, d7: true },
    monthlyRent: String(incomingApplicant?.targetRent || propertyUnits.find((u) => u.unitNumber === initialUnit)?.rent || initialMatchingTenant?.rent || 1750),
    deposit: String(incomingApplicant?.targetRent || propertyUnits.find((u) => u.unitNumber === initialUnit)?.deposit || initialMatchingTenant?.deposit || 1750),
    dueDay: '1st of Month',
    firstPaymentDate: incomingApplicant?.proposedMoveIn || '2026-12-01',
    recurringAddons: [{ label: 'Trash & Water Utility', amount: 45 }],
    lateFeeType: 'Percentage',
    lateFeeValue: '5',
    graceDays: '5',
    rentSchedule: [
      { year: 'Year 1', effective: incomingApplicant?.proposedMoveIn || '2026-11-30', increaseType: 'Base', increaseValue: 0 },
      { year: 'Year 2', effective: '2027-11-30', increaseType: 'Percentage (%)', increaseValue: 4.5 },
      { year: 'Year 3', effective: '2028-11-30', increaseType: 'Fixed Amount ($)', increaseValue: 75 },
      { year: 'Year 4', effective: '2029-11-30', increaseType: 'Percentage (%)', increaseValue: 5 },
    ],
    stateJurisdiction: properties.find((p) => p.name === initialProperty)?.state || 'NY',
    templateVersion: 'NY Standard Residential Lease v4.2',
    specialClauses: 'Quiet hours observed 10:00 PM – 7:00 AM. Tenant permits scheduled maintenance access with 24h advance notice.',
    addenda: ['Lead-Based Paint Disclosure (Pre-1978)', 'Building Rules & Noise Policy'],
  });

  const activeUnitsForProp = useMemo(() => {
    const matchedProp = properties.find((p) => p.name.toLowerCase() === form.propertyName.toLowerCase());
    const propId = matchedProp ? matchedProp.id : null;
    return units.filter((u) => {
      const matchName = u.propertyName && u.propertyName.toLowerCase() === form.propertyName.toLowerCase();
      const matchPropObj = u.property?.name && u.property.name.toLowerCase() === form.propertyName.toLowerCase();
      const matchId = propId && (u.propertyId === propId || String(u.propertyId) === String(propId));
      return matchName || matchPropObj || matchId;
    });
  }, [units, form.propertyName, properties]);

  // Filter tenants belonging specifically to the selected property and unit
  const relatedTenants = useMemo(() => {
    if (!form.propertyName) return [];
    const matchedProp = properties.find((p) => p.name.toLowerCase() === form.propertyName.toLowerCase());
    const propId = matchedProp ? matchedProp.id : null;

    // 1. Tenants belonging to this property
    const forProp = tenantsList.filter((t) => {
      const pNameMatch = t.propertyName && t.propertyName.toLowerCase() === form.propertyName.toLowerCase();
      const pIdMatch = propId && (String(t.propertyId) === String(propId));
      return pNameMatch || pIdMatch;
    });

    if (!form.unitNumber) return forProp;

    // 2. Tenants belonging specifically to this unit
    const forUnit = forProp.filter((t) => {
      const uNumMatch = t.unitNumber && String(t.unitNumber).trim().toLowerCase() === String(form.unitNumber).trim().toLowerCase();
      return uNumMatch;
    });

    // If there are tenants linked to this specific unit, put them first, then other tenants of this property
    if (forUnit.length > 0) {
      const others = forProp.filter((t) => !forUnit.some((u) => String(u.id) === String(t.id)));
      return [...forUnit, ...others];
    }

    return forProp;
  }, [tenantsList, form.propertyName, form.unitNumber, properties]);

  const recurringAddonsTotal = useMemo(
    () => form.recurringAddons.reduce((sum, a) => sum + (Number(a.amount) || 0), 0),
    [form.recurringAddons]
  );

  const termDuration = useMemo(() => {
    if (form.leaseType !== 'Fixed-Term') return 'Month-to-Month (Rolling)';
    if (!form.startDate || !form.endDate) return '12 Months (1 Year)';
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '12 Months (1 Year)';
    
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() >= start.getDate() - 2) months += 1;
    months = Math.max(1, months);
    
    if (months === 12) return '12 Months (1 Year)';
    if (months % 12 === 0) return `${months} Months (${months / 12} Years)`;
    return `${months} Months`;
  }, [form.leaseType, form.startDate, form.endDate]);

  const dueAtSigning = useMemo(() => {
    const rent = Number(form.monthlyRent) || 0;
    const dep = Number(form.deposit) || 0;
    return rent + dep + recurringAddonsTotal;
  }, [form.monthlyRent, form.deposit, recurringAddonsTotal]);

  // Auto-sync selected primary tenant whenever relatedTenants changes (e.g. tenant added/deleted or property/unit changed)
  useEffect(() => {
    const curName = form.coSigners[0]?.name;
    const exists = relatedTenants.find((t) => t.name === curName);

    if (exists) {
      if (form.coSigners[0]?.email !== exists.email || form.coSigners[0]?.tenantId !== exists.id) {
        setForm((prev) => ({
          ...prev,
          coSigners: prev.coSigners.map((c, i) =>
            i === 0
              ? {
                  ...c,
                  name: exists.name,
                  role: 'Primary Tenant',
                  email: exists.email || '',
                  tenantId: exists.id,
                }
              : c
          ),
        }));
      }
    } else {
      if (relatedTenants.length > 0) {
        const first = relatedTenants[0];
        setForm((prev) => ({
          ...prev,
          coSigners: prev.coSigners.map((c, i) =>
            i === 0
              ? {
                  ...c,
                  name: first.name,
                  role: 'Primary Tenant',
                  email: first.email || '',
                  tenantId: first.id,
                }
              : c
          ),
          monthlyRent: first.rent || first.monthlyRent ? String(first.rent || first.monthlyRent) : prev.monthlyRent,
          deposit: first.deposit ? String(first.deposit) : prev.deposit,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          coSigners: prev.coSigners.map((c, i) =>
            i === 0
              ? {
                  ...c,
                  name: '',
                  role: 'Primary Tenant',
                  email: '',
                  tenantId: undefined,
                }
              : c
          ),
        }));
      }
    }
  }, [relatedTenants]);

  const selectedTenant = useMemo(() => {
    const curName = form.coSigners[0]?.name;
    if (!curName) return null;
    return relatedTenants.find((t) => t.name === curName) || tenantsList.find((t) => t.name === curName) || null;
  }, [form.coSigners, relatedTenants, tenantsList]);

  const handlePropertySwitch = (propName) => {
    const matchedProp = properties.find((p) => p.name === propName);
    const propUnits = units.filter((u) => {
      const matchName = u.propertyName && u.propertyName.toLowerCase() === propName.toLowerCase();
      const matchPropObj = u.property?.name && u.property.name.toLowerCase() === propName.toLowerCase();
      const matchId = matchedProp && (u.propertyId === matchedProp.id || String(u.propertyId) === String(matchedProp.id));
      return matchName || matchPropObj || matchId;
    });
    const nextUnit = propUnits[0];

    // Find tenants belonging to this new property
    const newPropTenants = tenantsList.filter((t) => {
      if (t.status === 'Archived' || t.status === 'Exited') return false;
      const pNameMatch = t.propertyName && t.propertyName.toLowerCase() === propName.toLowerCase();
      const pIdMatch = matchedProp && (String(t.propertyId) === String(matchedProp.id));
      return pNameMatch || pIdMatch;
    });

    // Find tenant matching nextUnit if any
    const unitTenant = newPropTenants.find((t) =>
      t.unitNumber && nextUnit && String(t.unitNumber).trim().toLowerCase() === String(nextUnit.unitNumber).trim().toLowerCase()
    ) || newPropTenants[0];

    const newRent = nextUnit?.rent ? String(nextUnit.rent) : (unitTenant?.rent ? String(unitTenant.rent) : form.monthlyRent);
    const newDep = nextUnit?.deposit ? String(nextUnit.deposit) : newRent;

    setForm((prev) => ({
      ...prev,
      propertyName: propName,
      unitNumber: nextUnit?.unitNumber || '',
      coSigners: prev.coSigners.map((c, i) =>
        i === 0
          ? {
              ...c,
              name: unitTenant ? unitTenant.name : '',
              role: 'Primary Tenant',
              email: unitTenant ? unitTenant.email : '',
              tenantId: unitTenant ? unitTenant.id : undefined,
            }
          : c
      ),
      stateJurisdiction: matchedProp?.state || prev.stateJurisdiction,
      templateVersion: `${matchedProp?.state || 'NY'} Standard ${matchedProp?.type === 'Commercial' ? 'Commercial NNN' : 'Residential'} Lease v4.2`,
      monthlyRent: newRent,
      deposit: newDep,
    }));
  };

  const handleUnitSwitch = (uNum) => {
    const matchedUnit = activeUnitsForProp.find((u) => u.unitNumber === uNum);

    // Look for tenant specifically in this unit
    const unitTenant = relatedTenants.find((t) =>
      t.unitNumber && String(t.unitNumber).trim().toLowerCase() === String(uNum).trim().toLowerCase()
    ) || relatedTenants[0];

    const newRent = matchedUnit?.rent ? String(matchedUnit.rent) : (unitTenant?.rent ? String(unitTenant.rent) : form.monthlyRent);
    const newDep = matchedUnit?.deposit ? String(matchedUnit.deposit) : newRent;

    setForm((prev) => ({
      ...prev,
      unitNumber: uNum,
      coSigners: prev.coSigners.map((c, i) =>
        i === 0
          ? {
              ...c,
              name: unitTenant ? unitTenant.name : '',
              role: 'Primary Tenant',
              email: unitTenant ? unitTenant.email : '',
              tenantId: unitTenant ? unitTenant.id : undefined,
            }
          : c
      ),
      monthlyRent: newRent,
      deposit: newDep,
    }));
  };

  const handleSelectTenant = (val) => {
    if (!val) {
      setForm((prev) => ({
        ...prev,
        coSigners: prev.coSigners.map((c, i) =>
          i === 0 ? { ...c, name: '', role: 'Primary Tenant', email: '', tenantId: undefined } : c
        ),
      }));
      return;
    }

    const matched = relatedTenants.find((t) => t.name === val) || tenantsList.find((t) => t.name === val);
    if (matched) {
      setForm((prev) => ({
        ...prev,
        coSigners: prev.coSigners.map((c, i) =>
          i === 0
            ? {
                ...c,
                name: matched.name,
                role: 'Primary Tenant',
                email: matched.email || '',
                tenantId: matched.id,
              }
            : c
        ),
        monthlyRent: matched.rent || matched.monthlyRent ? String(matched.rent || matched.monthlyRent) : prev.monthlyRent,
        deposit: matched.deposit ? String(matched.deposit) : prev.deposit,
      }));
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!form.coSigners[0]?.name?.trim()) {
        toast.error('Please select a Tenant from the dropdown before continuing.');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const addAddon = () => {
    setForm((prev) => ({
      ...prev,
      recurringAddons: [...prev.recurringAddons, { label: 'Pet Rent', amount: 50 }],
    }));
  };

  const addRentStep = () => {
    setForm((prev) => {
      const nextYear = prev.rentSchedule.length + 1;
      const lastStep = prev.rentSchedule[prev.rentSchedule.length - 1];
      let nextEffective = '2030-11-30';
      if (lastStep?.effective) {
        const d = new Date(lastStep.effective);
        d.setFullYear(d.getFullYear() + 1);
        nextEffective = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '2030-11-30';
      }
      return {
        ...prev,
        rentSchedule: [
          ...prev.rentSchedule,
          {
            year: `Year ${nextYear}`,
            effective: nextEffective,
            increaseType: 'Percentage (%)',
            increaseValue: 5,
          },
        ],
      };
    });
  };

  const updateRentStep = (idx, field, val) => {
    setForm((prev) => ({
      ...prev,
      rentSchedule: prev.rentSchedule.map((row, i) =>
        i === idx ? { ...row, [field]: val } : row
      ),
    }));
  };

  const removeRentStep = (idxToRemove) => {
    setForm((prev) => ({
      ...prev,
      rentSchedule: prev.rentSchedule
        .filter((_, i) => i !== idxToRemove)
        .map((row, i) => ({
          ...row,
          year: `Year ${i + 1}`,
        })),
    }));
  };

  const computedRentSchedule = useMemo(() => {
    let currentBase = Number(form.monthlyRent) || 1750;
    return form.rentSchedule.map((row, idx) => {
      if (idx === 0) {
        return {
          ...row,
          baseRent: currentBase,
          newRent: currentBase,
        };
      }
      const val = Number(row.increaseValue) || 0;
      let newRent = currentBase;
      if (row.increaseType === 'Fixed Amount ($)') {
        newRent = Math.round(currentBase + val);
      } else {
        // Percentage (%)
        newRent = Math.round(currentBase * (1 + val / 100));
      }
      const result = {
        ...row,
        baseRent: currentBase,
        newRent,
      };
      currentBase = newRent; // Cascade next base rent
      return result;
    });
  }, [form.rentSchedule, form.monthlyRent]);

  const totalContractValue = useMemo(() => {
    if (!computedRentSchedule || computedRentSchedule.length === 0) {
      return (Number(form.monthlyRent || 0) + recurringAddonsTotal) * 12;
    }
    return computedRentSchedule.reduce((sum, row) => {
      const yearly = ((Number(row.newRent) || 0) + recurringAddonsTotal) * 12;
      return sum + yearly;
    }, 0);
  }, [computedRentSchedule, recurringAddonsTotal, form.monthlyRent]);

  const toggleAddendum = (name) => {
    setForm((prev) => ({
      ...prev,
      addenda: prev.addenda.includes(name)
        ? prev.addenda.filter((a) => a !== name)
        : [...prev.addenda, name],
    }));
  };

  const persistLease = (targetStatus) => {
    const primarySigner = form.coSigners.find((c) => c.role === 'Primary Tenant') || form.coSigners[0];
    if (!primarySigner?.name?.trim()) {
      toast.error('At least one Primary Tenant name is required.');
      return;
    }
    const existing = getLeases();
    const nextId = existing.reduce((max, l) => Math.max(max, Number(l.id) || 0), 0) + 1;
    const matchedProp = properties.find((p) => p.name === form.propertyName);
    const matchedUnit = units.find((u) => u.propertyName === form.propertyName && u.unitNumber === form.unitNumber);

    const activeReminders = [];
    if (form.reminders?.d90) activeReminders.push(90);
    if (form.reminders?.d60) activeReminders.push(60);
    if (form.reminders?.d30) activeReminders.push(30);
    if (form.reminders?.d7) activeReminders.push(7);

    const targetTenant =
      selectedTenant ||
      relatedTenants.find((t) => t.name === primarySigner.name.trim()) ||
      tenantsList.find((t) => t.name === primarySigner.name.trim());
    const realTenantId = primarySigner.tenantId || targetTenant?.id || 1;
    const realUnit =
      activeUnitsForProp.find((u) => u.unitNumber === form.unitNumber) ||
      units.find((u) => u.propertyName === form.propertyName && u.unitNumber === form.unitNumber);

    updateLease(nextId, {
      id: nextId,
      leaseNumber: `LSE-2026-${String(nextId).padStart(3, '0')}`,
      tenantId: realTenantId,
      tenantName: primarySigner.name.trim(),
      tenantEmail: primarySigner.email || targetTenant?.email || '',
      coSigners: form.coSigners,
      propertyId: matchedProp?.id || 1,
      propertyName: form.propertyName,
      unitId: realUnit?.id || matchedUnit?.id || 1,
      unitNumber: form.unitNumber || 'TBD',
      leaseType: form.leaseType,
      startDate: form.startDate,
      endDate: form.leaseType === 'Fixed-Term' ? form.endDate : null,
      moveInDate: form.moveInDate,
      noticeDays: Number(form.noticeDays) || 60,
      reminders: activeReminders,
      monthlyRent: Number(form.monthlyRent) || 0,
      rent: Number(form.monthlyRent) || 0,
      deposit: Number(form.deposit) || 0,
      securityDeposit: Number(form.deposit) || 0,
      dueDate: parseInt(form.dueDay, 10) || 1,
      firstPaymentDate: form.firstPaymentDate,
      recurringAddons: form.recurringAddons,
      lateFeeRule: `${form.lateFeeValue}${form.lateFeeType === 'Percentage' ? '%' : ' USD'} after ${form.graceDays}-day grace period`,
      rentSchedule: computedRentSchedule,
      stateJurisdiction: form.stateJurisdiction,
      templateVersion: form.templateVersion,
      specialClauses: form.specialClauses,
      addenda: form.addenda,
      signedPdf: targetStatus === 'Active',
      signers: form.coSigners.map((c) => ({
        name: c.name,
        role: c.role,
        signedAt: null,
        status: targetStatus === 'Draft' ? 'Draft' : 'Pending Signature',
      })),
      status: targetStatus,
      archived: false,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    if (Number(form.deposit) > 0) {
      updateAdminPortalState((prev) => ({
        ...prev,
        securityDeposits: [
          ...(prev.securityDeposits || []),
          {
            id: `DEP-${107 + (prev.securityDeposits?.length || 0)}`,
            propertyName: form.propertyName,
            unitNumber: form.unitNumber || 'TBD',
            tenantName: primarySigner.name.trim(),
            leaseId: `LSE-2026-${String(nextId).padStart(3, '0')}`,
            leaseStatus: targetStatus,
            heldAmount: Number(form.deposit),
            trustAccount: `${form.stateJurisdiction} Tenant Security Trust`,
            collectedDate: form.firstPaymentDate,
            proposedDeduction: 0,
            deductionReason: '',
            linkedInvoicePdf: null,
            dispositionDue: null,
            status: 'Held',
            managerReviewed: true,
          },
        ],
      }));
    }

    toast.success(
      targetStatus === 'Draft'
        ? 'Lease saved as Draft.'
        : 'Lease sent for E-Signature & Trust Deposit ledger registered.'
    );
    navigate('/leases');
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Create Lease Agreement"
        subtitle="Draft fixed-term or month-to-month U.S. leases with recurring charges, escalation schedules, and explicit state review disclaimers."
        onBack={() => navigate('/leases')}
        steps={['Participants', 'Timeline', 'Financials', 'Agreement']}
        currentStep={step}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-8 p-6 md:p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Users className="w-4 h-4" /> Step 1: Property, Unit & Tenant Selection
              </div>

              {/* Clean 3-Dropdown Grid: Property, Unit, Tenant */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Property *"
                  value={form.propertyName}
                  options={properties.map((p) => p.name)}
                  onChange={(e) => handlePropertySwitch(e.target.value)}
                />
                <Select
                  label="Unit Number *"
                  value={form.unitNumber}
                  options={activeUnitsForProp.map((u) => u.unitNumber)}
                  onChange={(e) => handleUnitSwitch(e.target.value)}
                />
                <Select
                  label="Tenant Name *"
                  placeholder={relatedTenants.length > 0 ? "Select Tenant..." : "No tenants found"}
                  value={form.coSigners[0]?.name || ''}
                  options={relatedTenants.map((t) => ({
                    value: t.name,
                    label: `${t.name}${t.unitNumber ? ` · Unit ${t.unitNumber}` : ''}`,
                  }))}
                  onChange={(e) => handleSelectTenant(e.target.value)}
                  disabled={relatedTenants.length === 0}
                />
              </div>

              {/* Selected Tenant Verified Details Card or Helpful Empty Banner */}
              {selectedTenant ? (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                      {selectedTenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">{selectedTenant.name}</h4>
                        <Badge variant="success">Tenant Verified</Badge>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {selectedTenant.email || 'No email registered'}
                        {(selectedTenant.phone || selectedTenant.mobile) && ` · ${selectedTenant.phone || selectedTenant.mobile}`}
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right text-xs text-gray-600 space-y-0.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-100">
                    <p>
                      <span className="text-gray-400">Assigned Unit:</span>{' '}
                      <span className="font-semibold text-gray-800">{selectedTenant.unitNumber ? `Unit ${selectedTenant.unitNumber}` : form.unitNumber || 'TBD'}</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Target Rent:</span>{' '}
                      <span className="font-semibold text-indigo-700">{formatUsd(selectedTenant.rent || form.monthlyRent)}/mo</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {relatedTenants.length === 0
                        ? `No active tenants found for "${form.propertyName}".`
                        : 'Please choose a tenant from the dropdown above.'}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {relatedTenants.length === 0
                        ? 'To create a lease for this property/unit, please enroll the tenant first in the Tenants directory.'
                        : 'The tenant dropdown is strictly limited to tenants associated with this property and unit to prevent mismatched leases.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Calendar className="w-4 h-4" /> Step 2: Lease Term, Notice & Renewal Milestones
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Lease Structure" value={form.leaseType} options={['Fixed-Term', 'Month-to-Month']} onChange={(e) => setForm({ ...form, leaseType: e.target.value })} />
                <Select label="Notice / Renewal Lead Window" value={form.noticeDays} options={['30', '60', '90']} onChange={(e) => setForm({ ...form, noticeDays: e.target.value })} />
                <Input label="Lease Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                {form.leaseType === 'Fixed-Term' ? (
                  <Input label="Lease End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                ) : (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 flex items-center">
                    Month-to-Month: Continues automatically until written {form.noticeDays}-day notice is recorded.
                  </div>
                )}
                <Input label="Scheduled Move-In Date" type="date" value={form.moveInDate} onChange={(e) => setForm({ ...form, moveInDate: e.target.value })} />
              </div>


            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <DollarSign className="w-4 h-4" /> Step 3: Base Rent, Trust Deposit, Add-ons & Escalation Schedule
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Monthly Base Rent (USD $)" type="number" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} />
                <Input label="Security Deposit (USD $ Held in Trust)" type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
                <Select label="Monthly Rent Due Day" value={form.dueDay} options={['1st of Month', '5th of Month', '15th of Month']} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
                <Input label="First Scheduled Charge Date" type="date" value={form.firstPaymentDate} onChange={(e) => setForm({ ...form, firstPaymentDate: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <Select label="Late Fee Model" value={form.lateFeeType} options={['Percentage', 'Flat USD']} onChange={(e) => setForm({ ...form, lateFeeType: e.target.value })} />
                <Input label={form.lateFeeType === 'Percentage' ? 'Late Fee (%)' : 'Late Fee ($)'} type="number" value={form.lateFeeValue} onChange={(e) => setForm({ ...form, lateFeeValue: e.target.value })} />
                <Input label="Grace Period (Days)" type="number" value={form.graceDays} onChange={(e) => setForm({ ...form, graceDays: e.target.value })} />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Additional Recurring Monthly Charges</h4>
                  <Button size="sm" variant="secondary" icon={Plus} onClick={addAddon}>Add Charge</Button>
                </div>
                {form.recurringAddons.map((addon, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-7">
                      <Input
                        value={addon.label}
                        placeholder="Charge label (e.g. Pet Rent, Reserved Parking)"
                        onChange={(e) => setForm({
                          ...form,
                          recurringAddons: form.recurringAddons.map((a, i) => (i === idx ? { ...a, label: e.target.value } : a)),
                        })}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        value={addon.amount}
                        onChange={(e) => setForm({
                          ...form,
                          recurringAddons: form.recurringAddons.map((a, i) => (i === idx ? { ...a, amount: e.target.value } : a)),
                        })}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, recurringAddons: form.recurringAddons.filter((_, i) => i !== idx) })}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Scheduled Rent Increase Steps</h4>
                  <Button size="sm" variant="secondary" icon={Plus} onClick={addRentStep}>Add Year Step</Button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-x-auto text-xs bg-white shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/90 text-gray-500 font-bold uppercase text-[11px] border-b border-gray-200">
                      <tr>
                        <th className="p-3">Term</th>
                        <th className="p-3">Effective Date</th>
                        <th className="p-3">Base Rent</th>
                        <th className="p-3">Increase Type</th>
                        <th className="p-3">Increase</th>
                        <th className="p-3">New Rent</th>
                        <th className="p-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {computedRentSchedule.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                            {row.year}
                          </td>
                          <td className="p-3">
                            <input
                              type="date"
                              value={row.effective}
                              onChange={(e) => updateRentStep(idx, 'effective', e.target.value)}
                              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                            {formatUsd(row.baseRent)}
                          </td>
                          <td className="p-3">
                            {idx === 0 ? (
                              <div className="inline-block rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500 font-medium select-none">
                                Base
                              </div>
                            ) : (
                              <div className="relative inline-block min-w-[130px]">
                                <select
                                  value={row.increaseType}
                                  onChange={(e) => updateRentStep(idx, 'increaseType', e.target.value)}
                                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-2.5 py-1 pr-7 text-xs text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                  <option value="Percentage (%)">Percentage (%)</option>
                                  <option value="Fixed Amount ($)">Fixed Amount ($)</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {idx === 0 ? (
                              <span className="text-gray-400 font-medium pl-3">—</span>
                            ) : (
                              <div className="relative inline-flex items-center w-28">
                                <span className="absolute left-2.5 text-xs font-semibold text-gray-500 pointer-events-none">
                                  {row.increaseType === 'Fixed Amount ($)' ? '+$' : '+'}
                                </span>
                                <input
                                  type="number"
                                  step={row.increaseType === 'Fixed Amount ($)' ? '5' : '0.25'}
                                  value={row.increaseValue}
                                  onChange={(e) => updateRentStep(idx, 'increaseValue', e.target.value)}
                                  className="w-full rounded-lg border border-gray-200 bg-white pl-6 pr-5 py-1 text-xs font-semibold text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                                {row.increaseType !== 'Fixed Amount ($)' && (
                                  <span className="absolute right-2 text-xs font-semibold text-gray-400 pointer-events-none">
                                    %
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                            {formatUsd(row.newRent)}
                          </td>
                          <td className="p-3 text-right">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => removeRentStep(idx)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete step"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <FileText className="w-4 h-4" /> Step 4: Jurisdiction, Special Clauses & E-Signature Dispatch
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Legal Compliance Notice (No Automatic Legal Guarantee)</p>
                  <p className="mt-0.5 leading-relaxed">
                    RentLock provides customizable U.S. lease templates by state jurisdiction, but does <strong>not</strong> guarantee automatic statutory or municipal compliance (including rent control, Good Cause, or local security deposit caps). Review terms with counsel before execution.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="State Jurisdiction" value={form.stateJurisdiction} options={JURISDICTIONS} onChange={(e) => setForm({ ...form, stateJurisdiction: e.target.value })} />
                <Input label="Lease Template & Version" value={form.templateVersion} onChange={(e) => setForm({ ...form, templateVersion: e.target.value })} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-gray-700">Special Clauses & Property Rules</label>
                  <span className="text-[11px] text-gray-500">{form.specialClauses.length} / 5,000 characters</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={form.specialClauses}
                  onChange={(e) => setForm({ ...form, specialClauses: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Attached Addenda & Disclosures</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ADDENDA_LIST.map((item) => (
                    <label key={item} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.addenda.includes(item)}
                        onChange={() => toggleAddendum(item)}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-gray-800 font-medium">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" icon={ArrowLeft} disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
              Back
            </Button>
            {step < 4 ? (
              <Button icon={ArrowRight} onClick={handleContinue}>
                Continue
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={Save} onClick={() => persistLease('Draft')}>
                  Save Draft
                </Button>
                <Button variant="secondary" icon={FileDown} onClick={() => toast.success(`Generated Draft Lease PDF (${form.templateVersion}).`)}>
                  Generate Draft PDF
                </Button>
                <Button icon={Send} onClick={() => persistLease('Pending Signature')}>
                  Send for E-Signature
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Right Sticky Contract Overview */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <Card className="p-5 md:p-6 space-y-5 rounded-2xl border border-gray-200/80 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Contract Overview</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Live lease summary &amp; billing</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                form.leaseType === 'Fixed-Term' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {form.leaseType}
              </span>
            </div>

            {/* Core Details */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500">Property / Unit</span>
                <span className="font-bold text-gray-900 text-right">{form.propertyName} · {form.unitNumber || 'TBD'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500">Jurisdiction / Template</span>
                <span className="font-bold text-indigo-700 text-right">{form.stateJurisdiction} · {form.templateVersion ? form.templateVersion.split(' ')[0] : 'State'} Lease</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500">Lease Term</span>
                <span className="font-semibold text-gray-800 text-right">
                  {formatDate(form.startDate)} → {form.leaseType === 'Fixed-Term' ? formatDate(form.endDate) : 'Rolling'}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500">Term Duration</span>
                <span className="font-bold text-indigo-900 bg-indigo-50/60 px-2 py-0.5 rounded-md text-[11px]">{termDuration}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500">Scheduled Move-In</span>
                <span className="font-semibold text-gray-800">{formatDate(form.moveInDate)}</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-2 text-xs">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Monthly Billing Breakdown</p>
              
              <div className="flex justify-between text-gray-600">
                <span>Base Monthly Rent</span>
                <span className="font-bold text-gray-900">{formatUsd(form.monthlyRent)}</span>
              </div>
              
              {form.recurringAddons.length > 0 ? (
                form.recurringAddons.map((addon, idx) => (
                  <div key={idx} className="flex justify-between text-gray-500 text-[11px] pl-2 border-l-2 border-indigo-200">
                    <span className="truncate max-w-[150px]">{addon.label || 'Add-on'}</span>
                    <span className="font-medium text-gray-700">{formatUsd(addon.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>Recurring Add-ons</span>
                  <span>$0.00</span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-200 text-sm">
                <span className="font-bold text-gray-800">Total Monthly Billing</span>
                <span className="font-black text-indigo-700">{formatUsd(Number(form.monthlyRent || 0) + recurringAddonsTotal)}</span>
              </div>
            </div>

            {/* Move-in / Due at Signing */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-950 uppercase tracking-wider text-[10px]">Total Due at Signing</span>
                <span className="font-black text-emerald-800 text-sm">{formatUsd(dueAtSigning)}</span>
              </div>
              <div className="space-y-1 text-[11px] text-emerald-900/80 pt-1 border-t border-emerald-200/60">
                <div className="flex justify-between">
                  <span>First Month's Rent</span>
                  <span className="font-semibold">{formatUsd(form.monthlyRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Trust Security Deposit (Escrow)</span>
                  <span className="font-semibold">{formatUsd(form.deposit)}</span>
                </div>
                {recurringAddonsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Move-in Add-ons</span>
                    <span className="font-semibold">{formatUsd(recurringAddonsTotal)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Escalation Schedule Preview */}
            {computedRentSchedule.length > 1 && (
              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-950 text-[10px] uppercase tracking-wider">Multi-Year Escalation Plan</span>
                  <span className="text-[10px] font-bold text-indigo-600">{computedRentSchedule.length} Years</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  {computedRentSchedule.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-gray-600">
                      <span className="font-medium text-gray-800">{s.year}</span>
                      <span className="font-bold text-gray-900">
                        {formatUsd(s.newRent)}/mo
                        {idx > 0 && <span className="text-emerald-600 text-[10px] ml-1">({s.increaseType === 'Fixed Amount ($)' ? `+$${s.increaseValue}` : `+${s.increaseValue}%`})</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1.5 border-t border-indigo-100 text-[11px]">
                  <span className="font-bold text-indigo-900">Est. Total Multi-Year Value</span>
                  <span className="font-black text-indigo-900">{formatUsd(totalContractValue)}</span>
                </div>
              </div>
            )}

            {/* Signers Roster */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-700">Signers Roster ({form.coSigners.length})</p>
                <span className="text-[10px] text-gray-400">E-Sign Ready</span>
              </div>
              {form.coSigners.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center text-gray-600 py-0.5">
                  <div className="truncate max-w-[160px]">
                    <span className="font-medium text-gray-900 block truncate">{s.name || 'Unnamed Signer'}</span>
                    <span className="text-[10px] text-gray-400 block truncate">{s.email || 'No email provided'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-gray-200 text-gray-700 shrink-0">
                    {s.role}
                  </span>
                </div>
              ))}
            </div>

            {/* Legal Notice */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Trust deposit is held in escrow under {form.stateJurisdiction} banking regulations and never recognized as rental income.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
