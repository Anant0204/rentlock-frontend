import { useState, useMemo, useEffect } from 'react';
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

  const properties = useMemo(() => getProperties().filter((p) => !p.archived), []);
  const units = useMemo(() => getUnits().filter((u) => !u.archived), []);
  const tenants = useMemo(() => getTenants(), []);

  const initialProperty = incomingApplicant?.propertyName || properties[0]?.name || 'Sunrise Residency';
  const propertyUnits = useMemo(() => units.filter((u) => u.propertyName === initialProperty), [units, initialProperty]);
  const initialUnit = incomingApplicant?.unitNumber || propertyUnits[0]?.unitNumber || 'B-101';

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    propertyName: initialProperty,
    unitNumber: initialUnit,
    coSigners: [
      {
        name: incomingApplicant?.applicantName || tenants[0]?.name || 'Jordan Alvarez',
        role: 'Primary Tenant',
        email: incomingApplicant?.email || tenants[0]?.email || 'j.alvarez@example.com',
      },
      { name: 'Robert King', role: 'Landlord / Agent', email: 'robert.king@rentlock.com' },
    ],
    leaseType: 'Fixed-Term',
    startDate: incomingApplicant?.proposedMoveIn || '2026-12-01',
    endDate: '2027-11-30',
    moveInDate: incomingApplicant?.proposedMoveIn || '2026-12-01',
    noticeDays: '60',
    reminders: { d90: true, d60: true, d30: true, d7: true },
    monthlyRent: String(incomingApplicant?.targetRent || propertyUnits.find((u) => u.unitNumber === initialUnit)?.rent || 1750),
    deposit: String(incomingApplicant?.targetRent || propertyUnits.find((u) => u.unitNumber === initialUnit)?.deposit || 1750),
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

  const activeUnitsForProp = useMemo(
    () => units.filter((u) => u.propertyName === form.propertyName),
    [units, form.propertyName]
  );

  const recurringAddonsTotal = useMemo(
    () => form.recurringAddons.reduce((sum, a) => sum + (Number(a.amount) || 0), 0),
    [form.recurringAddons]
  );

  const handlePropertySwitch = (propName) => {
    const matchedProp = properties.find((p) => p.name === propName);
    const propUnits = units.filter((u) => u.propertyName === propName);
    const nextUnit = propUnits[0];
    setForm((prev) => ({
      ...prev,
      propertyName: propName,
      unitNumber: nextUnit?.unitNumber || '',
      stateJurisdiction: matchedProp?.state || prev.stateJurisdiction,
      templateVersion: `${matchedProp?.state || 'NY'} Standard ${matchedProp?.type === 'Commercial' ? 'Commercial NNN' : 'Residential'} Lease v4.2`,
      monthlyRent: nextUnit ? String(nextUnit.rent) : prev.monthlyRent,
      deposit: nextUnit ? String(nextUnit.deposit) : prev.deposit,
    }));
  };

  const addCoSigner = () => {
    setForm((prev) => ({
      ...prev,
      coSigners: [...prev.coSigners, { name: '', role: 'Co-Signer', email: '' }],
    }));
  };

  const updateCoSigner = (idx, field, val) => {
    setForm((prev) => ({
      ...prev,
      coSigners: prev.coSigners.map((c, i) => (i === idx ? { ...c, [field]: val } : c)),
    }));
  };

  const removeCoSigner = (idx) => {
    if (form.coSigners.length <= 1) return;
    setForm((prev) => ({ ...prev, coSigners: prev.coSigners.filter((_, i) => i !== idx) }));
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
    if (form.reminders.d90) activeReminders.push(90);
    if (form.reminders.d60) activeReminders.push(60);
    if (form.reminders.d30) activeReminders.push(30);
    if (form.reminders.d7) activeReminders.push(7);

    updateLease(nextId, {
      id: nextId,
      tenantId: 90 + nextId,
      tenantName: primarySigner.name.trim(),
      coSigners: form.coSigners,
      propertyId: matchedProp?.id || 1,
      propertyName: form.propertyName,
      unitId: matchedUnit?.id || 1,
      unitNumber: form.unitNumber || 'TBD',
      leaseType: form.leaseType,
      startDate: form.startDate,
      endDate: form.leaseType === 'Fixed-Term' ? form.endDate : null,
      moveInDate: form.moveInDate,
      noticeDays: Number(form.noticeDays) || 60,
      reminders: activeReminders,
      monthlyRent: Number(form.monthlyRent) || 0,
      deposit: Number(form.deposit) || 0,
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
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Users className="w-4 h-4" /> Step 1: Property, Unit & Lease Signers
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Property" value={form.propertyName} options={properties.map((p) => p.name)} onChange={(e) => handlePropertySwitch(e.target.value)} />
                <Select label="Unit Number" value={form.unitNumber} options={activeUnitsForProp.map((u) => u.unitNumber)} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Participants & Co-Signers</h4>
                  <Button size="sm" variant="secondary" icon={Plus} onClick={addCoSigner}>Add Signer</Button>
                </div>
                {form.coSigners.map((signer, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 items-end">
                    <div className="sm:col-span-4">
                      <Input label="Full Name" value={signer.name} onChange={(e) => updateCoSigner(idx, 'name', e.target.value)} />
                    </div>
                    <div className="sm:col-span-3">
                      <Select label="Role" value={signer.role} options={['Primary Tenant', 'Co-Signer', 'Guarantor', 'Landlord / Agent']} onChange={(e) => updateCoSigner(idx, 'role', e.target.value)} />
                    </div>
                    <div className="sm:col-span-4">
                      <Input label="Email (E-Sign)" value={signer.email} onChange={(e) => updateCoSigner(idx, 'email', e.target.value)} />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeCoSigner(idx)}
                        className="p-2.5 rounded-lg text-rose-500 hover:bg-rose-50"
                        title="Remove Signer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Automated Expiry & Renewal Reminders</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  {[
                    { key: 'd90', label: '90 Days Before' },
                    { key: 'd60', label: '60 Days Before' },
                    { key: 'd30', label: '30 Days Before' },
                    { key: 'd7', label: '7 Days Before' },
                  ].map((rem) => (
                    <label key={rem.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.reminders[rem.key]}
                        onChange={(e) => setForm({ ...form, reminders: { ...form.reminders, [rem.key]: e.target.checked } })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="font-medium text-gray-700">{rem.label}</span>
                    </label>
                  ))}
                </div>
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
              <Button icon={ArrowRight} onClick={() => setStep((s) => Math.min(4, s + 1))}>
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
        <Card className="lg:col-span-4 p-6 sticky top-24 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900">Contract Overview</h3>
            <Badge status={form.leaseType === 'Fixed-Term' ? 'Active' : 'In Progress'} />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Property / Unit</span><span className="font-bold text-gray-900">{form.propertyName} · {form.unitNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Jurisdiction</span><span className="font-bold text-indigo-700">{form.stateJurisdiction} · {form.leaseType}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Term</span><span className="font-semibold text-gray-800">{formatDate(form.startDate)} → {form.leaseType === 'Fixed-Term' ? formatDate(form.endDate) : 'Rolling'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Base Monthly Rent</span><span className="font-bold text-gray-900">{formatUsd(form.monthlyRent)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Recurring Add-ons</span><span className="font-semibold text-gray-800">{formatUsd(recurringAddonsTotal)}</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
              <span className="font-bold text-gray-800">Total Monthly Billing</span>
              <span className="font-black text-indigo-700">{formatUsd(Number(form.monthlyRent || 0) + recurringAddonsTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Trust Security Deposit</span>
              <span className="font-bold text-emerald-700">{formatUsd(form.deposit)}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
            <p className="font-bold text-gray-700">Signers Roster ({form.coSigners.length})</p>
            {form.coSigners.map((s, idx) => (
              <div key={idx} className="flex justify-between text-gray-600">
                <span className="truncate max-w-[140px]">{s.name || 'Unnamed'}</span>
                <span className="font-semibold text-gray-800">{s.role}</span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Security deposits are tracked separately in Trust Liability and never auto-recognized as rental income.
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
