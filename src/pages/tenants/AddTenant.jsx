import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, User, ShieldCheck, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { getProperties } from '../../data/mockProperties';
import { getUnits } from '../../data/mockUnits';
import { getTenants, updateTenant } from '../../data/mockTenants';
import { formatUsd } from '../../utils/formatters';

export default function AddTenant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const properties = useMemo(() => getProperties().filter((p) => !p.archived), []);
  const units = useMemo(() => getUnits().filter((u) => !u.archived), []);

  const [selectedProperty, setSelectedProperty] = useState(() => properties[0]?.name || '');
  const filteredUnits = useMemo(
    () => units.filter((u) => u.propertyName === selectedProperty && (u.status === 'Vacant' || u.status === 'Turnover')),
    [units, selectedProperty]
  );
  const [selectedUnit, setSelectedUnit] = useState(() => filteredUnits[0]?.unitNumber || '');

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    dob: '',
    idType: "Driver's License / State ID",
    ssnLast4: '',
    screeningConsent: true,
    smsOptIn: true,
    occupation: '',
    company: '',
    familyMembers: '1',
    emergencyContact: '',
    address: '',
    rent: filteredUnits[0]?.rent ? String(filteredUnits[0].rent) : (properties.length > 0 ? '2000' : ''),
    deposit: filteredUnits[0]?.deposit ? String(filteredUnits[0].deposit) : (properties.length > 0 ? '2000' : ''),
    notes: '',
  });

  const handlePropertyChange = (propName) => {
    setSelectedProperty(propName);
    const nextUnits = units.filter((u) => u.propertyName === propName && (u.status === 'Vacant' || u.status === 'Turnover'));
    setSelectedUnit(nextUnits[0]?.unitNumber || '');
    if (nextUnits[0]) {
      setForm((prev) => ({
        ...prev,
        rent: String(nextUnits[0].rent || prev.rent),
        deposit: String(nextUnits[0].deposit || prev.deposit),
      }));
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Resident full name and email are required.');
      return;
    }
    const propObj = properties.find((p) => p.name === selectedProperty);
    const unitObj = units.find((u) => u.propertyName === selectedProperty && u.unitNumber === selectedUnit);
    const existing = getTenants();
    const nextId = existing.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1;

    updateTenant(nextId, {
      id: nextId,
      name: form.name.trim(),
      photo: null,
      mobile: form.mobile || '+1 (347) 555-0190',
      email: form.email.trim(),
      password: form.password?.trim() || 'demo123',
      dob: form.dob || '1992-01-15',
      ssnLast4: form.ssnLast4 ? form.ssnLast4.slice(-4) : '0000',
      screeningStatus: form.screeningConsent ? 'Consent Verified · Approved' : 'Pending Consent',
      address: form.address || `${propObj?.address || ''}${selectedUnit ? `, Unit ${selectedUnit}` : ''}`,
      familyMembers: Number(form.familyMembers) || 1,
      emergencyContact: form.emergencyContact || '+1 (347) 555-0199',
      occupation: form.occupation || 'Resident',
      company: form.company || 'Employer on File',
      propertyId: propObj?.id || 1,
      propertyName: selectedProperty || 'Unassigned',
      unitId: unitObj?.id || 1,
      unitNumber: selectedUnit || 'TBD',
      moveInDate: new Date().toISOString().slice(0, 10),
      moveOutDate: null,
      rent: Number(form.rent) || 0,
      deposit: Number(form.deposit) || 0,
      dueAmount: 0,
      leaseEnd: '2027-11-30',
      status: 'Active',
      smsOptIn: form.smsOptIn,
      notes: form.notes || 'Added via Tenant Onboarding Wizard.',
    });

    toast.success(`${form.name} enrolled! Login created with ${form.password ? 'custom password' : 'default demo123'}.`);
    navigate('/tenants');
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Add Tenant / Resident"
        subtitle="U.S. resident enrollment with consent-based verification, SMS opt-in, and trust deposit tracking."
        onBack={() => navigate('/tenants')}
        steps={['Identity', 'Screening & Household', 'Unit & Terms', 'Review & Enroll']}
        currentStep={step}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 md:p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <User className="w-4 h-4" /> Step 1: Primary Resident Contact
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Legal Name *" placeholder="e.g. Jordan Alvarez" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input label="U.S. Mobile Phone *" placeholder="+1 (347) 555-0190" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                <Input label="Email Address *" type="email" placeholder="resident@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input
                  label="Tenant Login Password *"
                  type="password"
                  placeholder="Set password (e.g. demo123)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  helperText="Resident will use this password to sign into the Tenant Portal."
                />
                <Input label="Date of Birth" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
              <Input label="Prior U.S. Street Address" placeholder="Street, Apt, City, State, ZIP" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smsOptIn}
                  onChange={(e) => setForm({ ...form, smsOptIn: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600"
                />
                <span>Resident opted in to receive rent & maintenance updates via SMS (TCPA 10DLC compliant; STOP supported).</span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" /> Step 2: Screening Consent & Household
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Photo ID Verified" value={form.idType} options={["Driver's License / State ID", 'U.S. Passport', 'Business EIN (Commercial)']} onChange={(e) => setForm({ ...form, idType: e.target.value })} />
                <Input label="SSN Last 4 Digits (Masked)" maxLength={4} placeholder="e.g. 4821" value={form.ssnLast4} onChange={(e) => setForm({ ...form, ssnLast4: e.target.value.replace(/\D/g, '') })} />
                <Input label="Occupation" placeholder="e.g. Product Designer" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
                <Input label="Employer / Company" placeholder="e.g. Northbeam Studio LLC" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <Input label="Household Occupants" type="number" value={form.familyMembers} onChange={(e) => setForm({ ...form, familyMembers: e.target.value })} />
                <Input label="Emergency Contact (+1 Phone)" placeholder="+1 (347) 555-0199" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.screeningConsent}
                  onChange={(e) => setForm({ ...form, screeningConsent: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600"
                />
                <span>FCRA written applicant screening consent recorded. Full credit bureau reports are excluded from general operational storage.</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Building2 className="w-4 h-4" /> Step 3: Property & Unit Assignment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Property"
                  value={selectedProperty}
                  options={properties.length > 0 ? properties.map((p) => p.name) : ['None Available — Create Property First']}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                />
                <Select
                  label="Available Unit"
                  value={selectedUnit}
                  options={filteredUnits.length > 0 ? filteredUnits.map((u) => `${u.unitNumber}`) : ['None Vacant — Assign Later']}
                  onChange={(e) => {
                    setSelectedUnit(e.target.value);
                    const picked = filteredUnits.find((u) => u.unitNumber === e.target.value);
                    if (picked) setForm((prev) => ({ ...prev, rent: String(picked.rent), deposit: String(picked.deposit) }));
                  }}
                />
                <Input label="Target Monthly Rent (USD)" type="number" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} />
                <Input label="Security Deposit Held in Trust (USD)" type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
              </div>
              <Input label="Internal Operational Notes (Staff Only)" placeholder="Gate notes, pet details, move-in timing..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Step 4: Review Resident Enrollment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm">
                <div><p className="text-xs text-gray-500">Name</p><p className="font-bold text-gray-900">{form.name || '—'}</p></div>
                <div><p className="text-xs text-gray-500">Phone / Email</p><p className="font-bold text-gray-900">{form.mobile || '—'} · {form.email || '—'}</p></div>
                <div><p className="text-xs text-gray-500">Login Password</p><p className="font-bold text-gray-900">{form.password ? '•••••••• (Custom)' : 'demo123 (Default)'}</p></div>
                <div><p className="text-xs text-gray-500">Property & Unit</p><p className="font-bold text-indigo-700">{selectedProperty ? `${selectedProperty} · ${selectedUnit || 'Unassigned'}` : 'Unassigned'}</p></div>
                <div><p className="text-xs text-gray-500">Rent / Trust Deposit</p><p className="font-bold text-gray-900">{form.rent ? formatUsd(form.rent) : '—'} / {form.deposit ? formatUsd(form.deposit) : '—'}</p></div>
                <div><p className="text-xs text-gray-500">Screening & SSN Last 4</p><p className="font-bold text-gray-900">{form.screeningConsent ? 'Consent Verified' : 'Pending'} (••••{form.ssnLast4 || '0000'})</p></div>
                <div><p className="text-xs text-gray-500">SMS Opt-In</p><p className="font-bold text-gray-900">{form.smsOptIn ? 'Yes (Enabled)' : 'No (Email/Portal only)'}</p></div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <Button variant="secondary" icon={ArrowLeft} disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
              Back
            </Button>
            {step < 4 ? (
              <Button icon={ArrowRight} onClick={() => setStep((s) => Math.min(4, s + 1))}>
                Continue
              </Button>
            ) : (
              <Button icon={CheckCircle2} onClick={handleSubmit}>
                Complete Enrollment
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6 h-fit space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              {form.name ? form.name.slice(0, 2).toUpperCase() : 'NT'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-gray-900 truncate">{form.name || 'New Resident'}</p>
              <p className="text-xs text-gray-500 truncate">{form.occupation || 'Applicant'}</p>
            </div>
          </div>
          <div className="space-y-2.5 text-xs border-t border-gray-100 pt-3">
            <div className="flex justify-between"><span className="text-gray-500">Property</span><span className="font-bold text-gray-800">{selectedProperty || 'Unassigned'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Unit</span><span className="font-bold text-indigo-600">{selectedUnit || 'Unassigned'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Monthly Rent</span><span className="font-bold text-gray-900">{form.rent ? formatUsd(form.rent) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Trust Deposit</span><span className="font-bold text-gray-900">{form.deposit ? formatUsd(form.deposit) : '—'}</span></div>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 text-[11px] text-purple-800 leading-relaxed">
            Once enrolled, draft a formal U.S. lease agreement from Leases → Create Lease so recurring invoices and trust deposit rules link cleanly.
          </div>
        </Card>
      </div>
    </div>
  );
}
