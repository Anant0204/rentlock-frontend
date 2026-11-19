import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, User, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import apiClient from '../../services/apiClient';
import { getProperties } from '../../data/mockProperties';
import { getUnits } from '../../data/mockUnits';
import { getTenants, saveTenantLocal, updateTenant } from '../../data/mockTenants';
import { formatUsd } from '../../utils/formatters';

export default function AddTenant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [propertiesList, setPropertiesList] = useState(() => getProperties().filter((p) => !p.archived));
  const [unitsList, setUnitsList] = useState(() => getUnits().filter((u) => !u.archived));

  useEffect(() => {
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
  }, []);

  const [selectedProperty, setSelectedProperty] = useState(() => propertiesList[0]?.name || '');

  useEffect(() => {
    if (propertiesList.length > 0 && (!selectedProperty || !propertiesList.some((p) => p.name === selectedProperty))) {
      setSelectedProperty(propertiesList[0].name);
    }
  }, [propertiesList, selectedProperty]);

  const filteredUnits = useMemo(() => {
    const propObj = propertiesList.find((p) => p.name === selectedProperty);
    return unitsList.filter(
      (u) =>
        (u.propertyName === selectedProperty || (propObj && String(u.propertyId) === String(propObj.id))) &&
        (u.status === 'Vacant' || u.status === 'Turnover' || !u.status)
    );
  }, [unitsList, selectedProperty, propertiesList]);

  const [selectedUnit, setSelectedUnit] = useState(() => filteredUnits[0]?.unitNumber || '');

  useEffect(() => {
    if (filteredUnits.length > 0 && (!selectedUnit || !filteredUnits.some((u) => u.unitNumber === selectedUnit))) {
      setSelectedUnit(filteredUnits[0].unitNumber);
    }
  }, [filteredUnits, selectedUnit]);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    dob: '',
    smsOptIn: true,
    address: '',
    rent: filteredUnits[0]?.rent ? String(filteredUnits[0].rent) : (propertiesList.length > 0 ? '2000' : ''),
    deposit: filteredUnits[0]?.deposit ? String(filteredUnits[0].deposit) : (propertiesList.length > 0 ? '2000' : ''),
    notes: '',
  });

  const handlePropertyChange = (propName) => {
    setSelectedProperty(propName);
    const propObj = propertiesList.find((p) => p.name === propName);
    const nextUnits = unitsList.filter(
      (u) =>
        (u.propertyName === propName || (propObj && String(u.propertyId) === String(propObj.id))) &&
        (u.status === 'Vacant' || u.status === 'Turnover' || !u.status)
    );
    setSelectedUnit(nextUnits[0]?.unitNumber || '');
    if (nextUnits[0]) {
      setForm((prev) => ({
        ...prev,
        rent: String(nextUnits[0].rent || prev.rent),
        deposit: String(nextUnits[0].deposit || prev.deposit),
      }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Resident full legal name is required.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Valid email address is required.');
      return;
    }

    const propObj = propertiesList.find((p) => p.name === selectedProperty) || propertiesList[0];
    const unitObj = unitsList.find(
      (u) =>
        (u.propertyName === selectedProperty || String(u.propertyId) === String(propObj?.id)) &&
        String(u.unitNumber) === String(selectedUnit)
    );

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.mobile?.trim() || '+1 (347) 555-0190',
        mobile: form.mobile?.trim() || '+1 (347) 555-0190',
        password: form.password?.trim() || 'demo123',
        propertyId: propObj ? Number(propObj.id) : undefined,
        propertyName: selectedProperty || propObj?.name,
        unitId: unitObj ? Number(unitObj.id) : undefined,
        unitNumber: selectedUnit || unitObj?.unitNumber,
        status: 'Active',
        moveInDate: new Date().toISOString().slice(0, 10),
        privateNotes: form.notes || 'Added via Tenant Onboarding Wizard.',
        createPortalLogin: true,
      };

      const res = await apiClient.post('/tenants', payload);
      const created = res?.data || res;

      const tenantId = created?.id || Date.now();
      saveTenantLocal({
        id: tenantId,
        name: form.name.trim(),
        mobile: form.mobile || '+1 (347) 555-0190',
        email: form.email.trim().toLowerCase(),
        password: form.password?.trim() || 'demo123',
        dob: form.dob || '1992-01-15',
        address: form.address || `${propObj?.address || ''}${selectedUnit ? `, Unit ${selectedUnit}` : ''}`,
        propertyId: propObj?.id || 1,
        propertyName: selectedProperty || 'Sunrise Residency',
        unitId: unitObj?.id || null,
        unitNumber: selectedUnit || 'TBD',
        moveInDate: new Date().toISOString().slice(0, 10),
        rent: Number(form.rent) || 0,
        deposit: Number(form.deposit) || 0,
        dueAmount: 0,
        leaseEnd: '2027-11-30',
        status: 'Active',
        smsOptIn: form.smsOptIn,
        notes: form.notes || 'Added via Tenant Onboarding Wizard.',
        ...created,
      });

      toast.success(`${form.name} enrolled and saved to database!`);
      navigate('/tenants');
    } catch (err) {
      console.warn('Backend API create tenant failed, saving locally:', err?.message);
      const existing = getTenants();
      const nextId = existing.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1;

      saveTenantLocal({
        id: nextId,
        name: form.name.trim(),
        photo: null,
        mobile: form.mobile || '+1 (347) 555-0190',
        email: form.email.trim(),
        password: form.password?.trim() || 'demo123',
        dob: form.dob || '1992-01-15',
        address: form.address || `${propObj?.address || ''}${selectedUnit ? `, Unit ${selectedUnit}` : ''}`,
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

      toast.success(`${form.name} enrolled (saved locally).`);
      navigate('/tenants');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Add Tenant / Resident"
        subtitle="U.S. resident enrollment with portal login, lease terms, and unit assignment."
        onBack={() => navigate('/tenants')}
        steps={['Identity', 'Unit & Terms', 'Review & Enroll']}
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Building2 className="w-4 h-4" /> Step 2: Property & Unit Assignment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Property"
                  value={selectedProperty}
                  options={propertiesList.length > 0 ? propertiesList.map((p) => p.name) : ['None Available — Create Property First']}
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

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Step 3: Review Resident Enrollment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm">
                <div><p className="text-xs text-gray-500">Name</p><p className="font-bold text-gray-900">{form.name || '—'}</p></div>
                <div><p className="text-xs text-gray-500">Phone / Email</p><p className="font-bold text-gray-900">{form.mobile || '—'} · {form.email || '—'}</p></div>
                <div><p className="text-xs text-gray-500">Login Password</p><p className="font-bold text-gray-900">{form.password ? '•••••••• (Custom)' : 'demo123 (Default)'}</p></div>
                <div><p className="text-xs text-gray-500">Property & Unit</p><p className="font-bold text-indigo-700">{selectedProperty ? `${selectedProperty} · ${selectedUnit || 'Unassigned'}` : 'Unassigned'}</p></div>
                <div className="sm:col-span-2"><p className="text-xs text-gray-500">Rent / Trust Deposit</p><p className="font-bold text-gray-900">{form.rent ? formatUsd(form.rent) : '—'} / {form.deposit ? formatUsd(form.deposit) : '—'}</p></div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <Button variant="secondary" icon={ArrowLeft} disabled={step === 1 || isSubmitting} onClick={() => setStep((s) => Math.max(1, s - 1))}>
              Back
            </Button>
            {step < 3 ? (
              <Button icon={ArrowRight} onClick={() => setStep((s) => Math.min(3, s + 1))}>
                Continue
              </Button>
            ) : (
              <Button icon={CheckCircle2} onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Enrolling Resident...' : 'Complete Enrollment'}
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
              <p className="text-xs text-gray-500 truncate">{form.email || 'Resident'}</p>
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
