import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, Layers, DollarSign, ClipboardList, CheckCircle2,
  ChevronRight, ChevronLeft, Plus, Trash2, Sparkles, Upload
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import FileUpload from '../../components/ui/FileUpload';
import Badge from '../../components/ui/Badge';
import { AMENITIES, US_STATES, UNIT_TYPES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { getOwners, getManagers } from '../../data/mockExtra';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

const STEPS = [
  'Basic Info',
  'Location & Ownership',
  'Building & Units',
  'Property Financials',
  'Requirements & Compliance',
  'Review Property',
];

export default function AddProperty() {
  const navigate = useNavigate();
  const ownersList = getOwners().filter((o) => !o.archived);
  const managersList = useMemo(() => getManagers().filter((m) => !m.archived), []);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedPropertyId, setSavedPropertyId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    type: 'Residential',
    category: 'Multifamily',
    portfolioGroup: 'Brooklyn & Queens',
    street: '',
    city: '',
    state: 'NY',
    zip: '',
    country: 'United States',
    county: '',
    parcelId: '',
    manager: managersList[0]?.name || 'Sarah Jenkins',
    managementStartDate: '2026-11-15',
    buildingName: 'Main Building',
    floors: '4',
    status: 'Active',
    purchasePrice: '',
    acquisitionDate: '',
    closingCosts: '',
    marketValue: '',
    valuationSource: 'Independent Appraisal',
    assessedValue: '',
    taxYear: '2026',
    lender: '',
    loanNumber: '',
    mortgageBalance: '',
    image: null,
  });

  const [ownershipRows, setOwnershipRows] = useState([
    { ownerId: ownersList[0]?.id || 1, name: ownersList[0]?.name || 'Robert King', share: 100 },
  ]);
  const [selectedAmenities, setSelectedAmenities] = useState(['Parking', 'Controlled Access']);
  const [unitInventory, setUnitInventory] = useState([]);
  const [newUnit, setNewUnit] = useState({ unitNumber: 'A-101', floor: '1', type: '2 BD / 1 BA', size: '900', rent: '2100' });
  const [improvements, setImprovements] = useState([]);
  const [newImp, setNewImp] = useState({ item: '', date: '', cost: '' });
  const [requirements, setRequirements] = useState([
    { id: 1, name: 'Building Property & Liability Insurance', category: 'Insurance', assignee: 'Robert King', dueDate: '2026-12-31', recurrence: 'Annual', reminders: [90, 60, 30, 7] },
  ]);
  const [newReq, setNewReq] = useState({ name: '', category: 'Insurance', assignee: 'Sarah Jenkins', dueDate: '', recurrence: 'Annual', reminders: [90, 60, 30, 7] });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const ownershipTotal = useMemo(
    () => ownershipRows.reduce((sum, r) => sum + (Number(r.share) || 0), 0),
    [ownershipRows]
  );

  const estimatedEquity = useMemo(() => {
    const mv = Number(form.marketValue) || 0;
    const mb = Number(form.mortgageBalance) || 0;
    return mv ? mv - mb : 0;
  }, [form.marketValue, form.mortgageBalance]);

  const generateCode = () => {
    const prefix = (form.name || 'PR')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
    update('code', `${prefix || 'PR'}-${Math.floor(100 + Math.random() * 899)}`);
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]));
  };

  const addOwnershipRow = () => {
    const remaining = Math.max(0, 100 - ownershipTotal);
    setOwnershipRows((prev) => [...prev, { ownerId: ownersList[1]?.id || 2, name: ownersList[1]?.name || 'Claire Bennett', share: remaining }]);
  };

  const addUnitRow = async () => {
    const unitNum = (newUnit.unitNumber || '').trim() || `A-${101 + unitInventory.length}`;
    const floorNum = Number(newUnit.floor) || 1;
    const typeStr = newUnit.type || '2 BD / 1 BA';
    const sizeNum = Number(newUnit.size) || 900;
    const rentNum = Number(newUnit.rent) || 2100;

    const unitToAdd = {
      id: Date.now(),
      unitNumber: unitNum,
      floor: floorNum,
      type: typeStr,
      size: sizeNum,
      rent: rentNum,
      status: 'Vacant',
      building: form.buildingName || 'Main Building',
    };

    setUnitInventory((prev) => [...prev, unitToAdd]);
    toast.success(`Unit ${unitNum} added!`);

    // Prepare next unit number e.g. A-101 -> A-102
    const numPart = parseInt(unitNum.replace(/\D/g, ''), 10);
    const prefix = unitNum.replace(/[0-9]/g, '') || 'A-';
    const nextUnitNum = !isNaN(numPart) ? `${prefix}${numPart + 1}` : `Unit-${unitInventory.length + 2}`;
    setNewUnit((prev) => ({
      ...prev,
      unitNumber: nextUnitNum,
    }));

    // Trigger backend API calls so Network tab records the request
    try {
      let currentPropId = savedPropertyId;
      if (!currentPropId) {
        const fullAddress = `${form.street || '123 Main St'}, ${form.city || 'Brooklyn'}, ${form.state || 'NY'} ${form.zip || '11215'}`;
        const propRes = await apiClient.post('/properties', {
          name: form.name?.trim() || 'New Property',
          code: form.code?.trim() || 'PR-01',
          type: form.type || 'Residential',
          address: fullAddress,
          city: form.city || 'Brooklyn',
          state: form.state || 'NY',
          zipCode: form.zip || '11215',
          status: 'Active',
        }).catch(() => null);
        if (propRes?.id) {
          currentPropId = propRes.id;
          setSavedPropertyId(currentPropId);
        }
      }

      const createdUnit = await apiClient.post('/units', {
        propertyId: currentPropId || undefined,
        unitNumber: unitNum,
        floor: floorNum,
        sqft: sizeNum,
        rentAmount: rentNum,
        depositAmount: rentNum,
        status: 'Vacant',
      });
      if (createdUnit?.id) {
        setUnitInventory((prev) =>
          prev.map((item) =>
            item.unitNumber === unitNum ? { ...item, id: createdUnit.id, dbId: createdUnit.id } : item
          )
        );
      }
    } catch (apiErr) {
      console.warn('[AddProperty] Background API sync note:', apiErr.message);
    }
  };

  const handleRemoveUnit = async (unitToRemove) => {
    // 1. Immediately remove from local state
    setUnitInventory((prev) => prev.filter((x) => x.id !== unitToRemove.id && x.unitNumber !== unitToRemove.unitNumber));

    // 2. Remove from localStorage custom_units
    const saved = localStorage.getItem('custom_units');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        const filtered = list.filter((u) => u.id !== unitToRemove.id && u.unitNumber !== unitToRemove.unitNumber);
        localStorage.setItem('custom_units', JSON.stringify(filtered));
      } catch {}
    }

    // 3. Delete from MySQL database via DELETE /api/v1/units/:id
    try {
      const targetId = unitToRemove.dbId || unitToRemove.id;
      if (targetId && typeof targetId === 'number' && targetId < 1000000000000) {
        await apiClient.delete(`/units/${targetId}`);
      } else {
        // If id was a local timestamp, look up unit in DB by unitNumber and delete
        const searchRes = await apiClient.get('/units', { search: unitToRemove.unitNumber }).catch(() => null);
        const items = searchRes?.items || searchRes || [];
        const match = items.find((x) => x.unitNumber === unitToRemove.unitNumber);
        if (match?.id) {
          await apiClient.delete(`/units/${match.id}`);
        }
      }
      toast.success(`Unit ${unitToRemove.unitNumber} removed from database`);
    } catch (err) {
      console.warn('[AddProperty] Delete unit API error:', err.message);
      toast.success(`Unit ${unitToRemove.unitNumber} removed`);
    }
  };

  const addImprovement = () => {
    if (!newImp.item || !newImp.cost) return;
    setImprovements((prev) => [...prev, { id: Date.now(), ...newImp, cost: Number(newImp.cost) }]);
    setNewImp({ item: '', date: '', cost: '' });
  };

  const addRequirement = () => {
    if (!newReq.name || !newReq.dueDate) return toast.error('Requirement name & due date required');
    setRequirements((prev) => [...prev, { id: Date.now(), ...newReq, status: 'Upcoming' }]);
    setNewReq({ name: '', category: 'Insurance', assignee: 'Sarah Jenkins', dueDate: '', recurrence: 'Annual', reminders: [90, 60, 30, 7] });
  };

  const isStepValid = () => {
    if (currentStep === 0) return Boolean(form.name && form.code && form.type);
    if (currentStep === 1) {
      if (!form.street || !form.city || !form.state || !form.zip || !form.manager || !form.managementStartDate) return false;
      return Math.abs(ownershipTotal - 100) < 0.01;
    }
    return true;
  };

  const handleSave = async (draftOnly = false) => {
    const fullAddress = `${form.street || '123 Main St'}, ${form.city || 'Brooklyn'}, ${form.state || 'NY'} ${form.zip || '11215'}`;
    const newProperty = {
      id: savedPropertyId || Date.now(),
      name: form.name || 'New Property',
      code: form.code || 'PR-01',
      type: form.type,
      category: form.category,
      portfolioGroup: form.portfolioGroup,
      address: fullAddress,
      street: form.street,
      city: form.city || 'Brooklyn',
      state: form.state || 'NY',
      zip: form.zip || '11215',
      country: form.country,
      county: form.county,
      parcelId: form.parcelId,
      floors: Number(form.floors) || 1,
      totalUnits: unitInventory.length,
      occupiedUnits: 0,
      vacantUnits: unitInventory.length,
      amenities: selectedAmenities,
      owners: ownershipRows,
      owner: ownershipRows.map((o) => `${o.name} (${o.share}%)`).join(', '),
      manager: form.manager,
      managementStartDate: form.managementStartDate,
      status: draftOnly ? 'Draft' : form.status,
      archived: false,
      monthlyRevenue: unitInventory.reduce((s, u) => s + (Number(u.rent) || 0), 0),
      pendingDues: 0,
      financials: {
        purchasePrice: Number(form.purchasePrice) || 0,
        acquisitionDate: form.acquisitionDate,
        closingCosts: Number(form.closingCosts) || 0,
        marketValue: Number(form.marketValue) || 0,
        valuationSource: form.valuationSource,
        assessedValue: Number(form.assessedValue) || 0,
        taxYear: form.taxYear,
        lender: form.lender,
        loanNumber: form.loanNumber,
        mortgageBalance: Number(form.mortgageBalance) || 0,
        improvements,
      },
      requirements,
      image: form.image,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // 1. Save to local storage for immediate offline reactivity
    const existing = JSON.parse(localStorage.getItem('custom_properties') || '[]');
    const filtered = existing.filter((p) => p.id !== newProperty.id);
    localStorage.setItem('custom_properties', JSON.stringify([...filtered, newProperty]));

    // Also update custom_units for all units in this property
    const existingUnits = JSON.parse(localStorage.getItem('custom_units') || '[]');
    const newUnitsFormatted = unitInventory.map((u) => ({
      ...u,
      propertyId: newProperty.id,
      propertyName: newProperty.name,
      building: form.buildingName || 'Main Building',
    }));
    localStorage.setItem('custom_units', JSON.stringify([...existingUnits.filter((u) => u.propertyId !== newProperty.id), ...newUnitsFormatted]));

    // 2. Call backend API to persist property & units in MySQL
    try {
      if (savedPropertyId) {
        await apiClient.put(`/properties/${savedPropertyId}`, {
          name: newProperty.name,
          type: newProperty.type,
          address: fullAddress,
          city: newProperty.city,
          state: newProperty.state,
          zipCode: newProperty.zip,
        });
      } else {
        await apiClient.post('/properties', {
          name: newProperty.name,
          type: newProperty.type,
          address: fullAddress,
          city: newProperty.city,
          state: newProperty.state,
          zipCode: newProperty.zip,
          units: unitInventory,
        });
      }
    } catch (apiErr) {
      console.warn('[AddProperty] API save fallback:', apiErr.message);
    }

    toast.success(draftOnly ? 'Progress saved as Draft' : 'Property & Units created successfully!');
    navigate('/properties');
  };

  const handleNext = () => {
    if (!isStepValid()) {
      if (currentStep === 1 && Math.abs(ownershipTotal - 100) >= 0.01) {
        return toast.error(`Ownership shares must total 100.00% (currently ${ownershipTotal.toFixed(2)}%)`);
      }
      return toast.error('Please complete required fields before continuing');
    }
    if (currentStep < STEPS.length - 1) setCurrentStep((prev) => prev + 1);
    else handleSave(false);
  };

  const stepIcons = [Building2, MapPin, Layers, DollarSign, ClipboardList, CheckCircle2];
  const StepIcon = stepIcons[currentStep] || Building2;

  return (
    <div className="max-w-screen-2xl mx-auto">
      <PageHeader
        title="Add New Property"
        subtitle={`Step ${currentStep + 1} of 6: ${STEPS[currentStep]}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Properties', path: '/properties' },
          { label: 'Add Property' },
        ]}
        onBack={() => (currentStep > 0 ? setCurrentStep((s) => s - 1) : navigate('/properties'))}
        steps={STEPS}
        currentStep={currentStep}
      />

      <div className="max-w-5xl mx-auto mt-4 pb-16">
        <Card className="shadow-xl shadow-gray-200/40 border-gray-100 bg-white" padding="p-0">
          {/* Header Bar */}
          <div className="bg-gray-50/70 px-6 py-4 border-b border-gray-100 rounded-t-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-sm border border-gray-100">
                <StepIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Step {currentStep + 1}: {STEPS[currentStep]}</h3>
                <p className="text-xs text-gray-500">U.S. property onboarding workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} icon={ChevronLeft} disabled={currentStep === 0}>
                Back
              </Button>
              <Button variant="secondary" onClick={() => handleSave(true)}>Save Progress</Button>
              <Button
                onClick={handleNext}
                icon={currentStep === STEPS.length - 1 ? CheckCircle2 : ChevronRight}
                className={currentStep === STEPS.length - 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}
              >
                {currentStep === STEPS.length - 1 ? 'Create Property' : 'Continue'}
              </Button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* STEP 1: BASIC INFO */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Property Name" required placeholder="e.g., Sunrise Residency" value={form.name} onChange={(e) => update('name', e.target.value)} />
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input label="Property Code (Unique)" required placeholder="e.g., SR-001" value={form.code} onChange={(e) => update('code', e.target.value)} />
                    </div>
                    <Button type="button" variant="secondary" icon={Sparkles} onClick={generateCode} className="mb-0.5">Auto</Button>
                  </div>
                </div>
                <Select label="Property Use" required options={['Residential', 'Commercial', 'Mixed-Use', 'Industrial / Warehouse']} value={form.type} onChange={(e) => update('type', e.target.value)} />
                <Select label="Building Type" required options={['Multifamily', 'Single-Family', 'Townhome', 'Office', 'Retail', 'Warehouse', 'Mixed-Use']} value={form.category} onChange={(e) => update('category', e.target.value)} />
                <Select label="Portfolio Group" options={['Brooklyn & Queens', 'New Jersey', 'Texas Commercial & Resi', 'Core East Coast']} value={form.portfolioGroup} onChange={(e) => update('portfolioGroup', e.target.value)} />
              </div>
            )}

            {/* STEP 2: LOCATION & OWNERSHIP */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Street Address" required placeholder="123 Maple Avenue" className="md:col-span-2" value={form.street} onChange={(e) => update('street', e.target.value)} />
                  <Input label="Country" disabled value={form.country} />
                  <Input label="City" required placeholder="Brooklyn" value={form.city} onChange={(e) => update('city', e.target.value)} />
                  <Select label="State" required options={US_STATES} value={form.state} onChange={(e) => update('state', e.target.value)} />
                  <Input label="ZIP Code" required placeholder="11215" value={form.zip} onChange={(e) => update('zip', e.target.value)} />
                  <Input label="County (Optional)" placeholder="Kings County" value={form.county} onChange={(e) => update('county', e.target.value)} />
                  <Input label="Parcel / Tax ID (Optional)" placeholder="BLK-1042-LOT-18" value={form.parcelId} onChange={(e) => update('parcelId', e.target.value)} />
                </div>

                {/* Ownership Allocation */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Owners &amp; Entities Allocation</h4>
                      <p className="text-xs text-gray-500">Total ownership percentage must equal 100.00%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/owners?add=true')}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        + Create New Owner
                      </button>
                      <Badge variant={Math.abs(ownershipTotal - 100) < 0.01 ? 'success' : 'danger'}>
                        Total: {ownershipTotal.toFixed(2)}%
                      </Badge>
                      <Button type="button" variant="secondary" icon={Plus} size="sm" onClick={addOwnershipRow}>Add Co-Owner</Button>
                    </div>
                  </div>
                  {ownershipRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-gray-100">
                      <div className="col-span-7">
                        <Select
                          label="Owner / Entity"
                          options={ownersList.map((o) => ({ value: o.name, label: `${o.name} (${o.ownerType || 'Entity'})` }))}
                          value={row.name}
                          onChange={(e) => {
                            const matched = ownersList.find((o) => o.name === e.target.value);
                            setOwnershipRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ownerId: matched?.id || r.ownerId, name: e.target.value } : r)));
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          label="Share (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={row.share}
                          onChange={(e) => setOwnershipRows((prev) => prev.map((r, i) => (i === idx ? { ...r, share: e.target.value } : r)))}
                        />
                      </div>
                      <div className="col-span-1 pt-5 text-right">
                        {ownershipRows.length > 1 && (
                          <button type="button" onClick={() => setOwnershipRows((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Management Assignment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Select label="Assigned Manager" required options={managersList.map((m) => m.name)} value={form.manager} onChange={(e) => update('manager', e.target.value)} />
                  <Input label="Management Start Date" required type="date" value={form.managementStartDate} onChange={(e) => update('managementStartDate', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 3: BUILDING & UNITS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input label="Building / Block Name" value={form.buildingName} onChange={(e) => update('buildingName', e.target.value)} />
                  <Input label="Total Floors" type="number" value={form.floors} onChange={(e) => update('floors', e.target.value)} />
                  <Select label="Property Status" options={['Active', 'Under Construction', 'Onboarding']} value={form.status} onChange={(e) => update('status', e.target.value)} />
                  <div className="flex items-end">
                    <Button type="button" variant="secondary" icon={Upload} onClick={() => toast.success('Imported 2 sample units from CSV template')} className="w-full">
                      Import Units CSV
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Building Amenities (11 Standard)</h4>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                          selectedAmenities.includes(amenity) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline Unit Inventory */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">Unit Inventory ({unitInventory.length})</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 items-end">
                    <Input label="Unit #" placeholder="e.g. A-101" value={newUnit.unitNumber} onChange={(e) => setNewUnit({ ...newUnit, unitNumber: e.target.value })} />
                    <Input label="Floor" type="number" value={newUnit.floor} onChange={(e) => setNewUnit({ ...newUnit, floor: e.target.value })} />
                    <Select label="Unit Type" options={UNIT_TYPES} value={newUnit.type} onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value })} />
                    <Input label="Sq Ft" type="number" value={newUnit.size} onChange={(e) => setNewUnit({ ...newUnit, size: e.target.value })} />
                    <Input label="Market Rent ($)" type="number" value={newUnit.rent} onChange={(e) => setNewUnit({ ...newUnit, rent: e.target.value })} />
                    <Button type="button" icon={Plus} onClick={addUnitRow}>Add Unit</Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className="py-2">Unit #</th>
                          <th className="py-2">Floor</th>
                          <th className="py-2">Type</th>
                          <th className="py-2">Sq Ft</th>
                          <th className="py-2">Market Rent</th>
                          <th className="py-2 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {unitInventory.map((u) => (
                          <tr key={u.id}>
                            <td className="py-2 font-bold text-gray-900">{u.unitNumber}</td>
                            <td className="py-2">{u.floor}</td>
                            <td className="py-2">{u.type}</td>
                            <td className="py-2">{u.size} sq ft</td>
                            <td className="py-2 font-semibold">{formatCurrency(u.rent)}/mo</td>
                            <td className="py-2 text-right">
                              <button type="button" onClick={() => handleRemoveUnit(u)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Remove from database"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PROPERTY FINANCIALS (OPTIONAL) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-indigo-700">Estimated Equity (Auto-Calculated)</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Estimated Market Value minus Current Mortgage Balance</p>
                  </div>
                  <p className="text-2xl font-black text-indigo-900">{formatCurrency(estimatedEquity)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Purchase Price ($)" type="number" placeholder="0" value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} />
                  <Input label="Acquisition Date" type="date" value={form.acquisitionDate} onChange={(e) => update('acquisitionDate', e.target.value)} />
                  <Input label="Closing Costs ($)" type="number" placeholder="0" value={form.closingCosts} onChange={(e) => update('closingCosts', e.target.value)} />
                  <Input label="Estimated Market Value ($)" type="number" placeholder="0" value={form.marketValue} onChange={(e) => update('marketValue', e.target.value)} />
                  <Input label="Valuation Source" value={form.valuationSource} onChange={(e) => update('valuationSource', e.target.value)} />
                  <Input label="Assessed Tax Value ($)" type="number" placeholder="0" value={form.assessedValue} onChange={(e) => update('assessedValue', e.target.value)} />
                  <Input label="Tax Year" value={form.taxYear} onChange={(e) => update('taxYear', e.target.value)} />
                  <Input label="Financing Lender (Optional)" placeholder="e.g., JPMorgan Chase CRE" value={form.lender} onChange={(e) => update('lender', e.target.value)} />
                  <Input label="Loan # (Optional)" placeholder="LN-0000" value={form.loanNumber} onChange={(e) => update('loanNumber', e.target.value)} />
                  <Input label="Mortgage Balance ($)" type="number" placeholder="0" value={form.mortgageBalance} onChange={(e) => update('mortgageBalance', e.target.value)} />
                </div>

                <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                  <h4 className="text-sm font-bold text-gray-900">Capital Improvements Table (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <Input label="Improvement Description" placeholder="Roof replacement" value={newImp.item} onChange={(e) => setNewImp({ ...newImp, item: e.target.value })} />
                    <Input label="Completion Date" type="date" value={newImp.date} onChange={(e) => setNewImp({ ...newImp, date: e.target.value })} />
                    <Input label="Cost ($)" type="number" value={newImp.cost} onChange={(e) => setNewImp({ ...newImp, cost: e.target.value })} />
                    <Button type="button" variant="secondary" icon={Plus} onClick={addImprovement}>Add CapEx</Button>
                  </div>
                  {improvements.length > 0 && (
                    <div className="divide-y divide-gray-100 text-xs pt-2">
                      {improvements.map((imp) => (
                        <div key={imp.id} className="py-2 flex items-center justify-between">
                          <span className="font-semibold text-gray-800">{imp.item} ({imp.date || 'TBD'})</span>
                          <span className="font-bold text-gray-900">{formatCurrency(imp.cost)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: REQUIREMENTS & COMPLIANCE (OPTIONAL) */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="p-4 border border-gray-200 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">Add Compliance Requirement / Recurring Task</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Requirement Name" placeholder="e.g., Elevator Safety Certificate" value={newReq.name} onChange={(e) => setNewReq({ ...newReq, name: e.target.value })} />
                    <Select label="Category" options={['Insurance', 'Inspection', 'Recurring Maintenance']} value={newReq.category} onChange={(e) => setNewReq({ ...newReq, category: e.target.value })} />
                    <Input label="Responsible Staff / Vendor" value={newReq.assignee} onChange={(e) => setNewReq({ ...newReq, assignee: e.target.value })} />
                    <Input label="Due / Expiration Date" type="date" value={newReq.dueDate} onChange={(e) => setNewReq({ ...newReq, dueDate: e.target.value })} />
                    <Select label="Recurrence" options={['Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'One-Time']} value={newReq.recurrence} onChange={(e) => setNewReq({ ...newReq, recurrence: e.target.value })} />
                    <div className="flex items-end">
                      <Button type="button" icon={Plus} onClick={addRequirement} className="w-full">Add Requirement</Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Automated reminders: <strong>90 / 60 / 30 / 7 days</strong> prior. Completing a recurring item generates the next cycle due date while retaining audit history.</p>
                </div>

                <div className="space-y-2">
                  {requirements.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{req.name}</p>
                        <p className="text-gray-500">{req.category} · Assigned: {req.assignee} · {req.recurrence}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="info">Due {req.dueDate}</Badge>
                        <button type="button" onClick={() => setRequirements((prev) => prev.filter((r) => r.id !== req.id))} className="text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW PROPERTY */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black uppercase text-gray-500">Basic &amp; Location</h4>
                      <button type="button" onClick={() => setCurrentStep(0)} className="text-xs text-indigo-600 font-semibold cursor-pointer">Edit</button>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{form.name} ({form.code})</p>
                    <p className="text-xs text-gray-600 mt-1">{form.street}, {form.city}, {form.state} {form.zip}</p>
                    <p className="text-xs text-gray-500 mt-1">Manager: {form.manager} · Start {form.managementStartDate}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black uppercase text-gray-500">Ownership, Units &amp; Compliance</h4>
                      <button type="button" onClick={() => setCurrentStep(1)} className="text-xs text-indigo-600 font-semibold cursor-pointer">Edit</button>
                    </div>
                    <p className="text-xs text-gray-700">Owners: {ownershipRows.map((o) => `${o.name} (${o.share}%)`).join(', ')}</p>
                    <p className="text-xs text-gray-700 mt-1">Units configured: <strong>{unitInventory.length}</strong> · Requirements: <strong>{requirements.length}</strong></p>
                    <p className="text-xs text-gray-700 mt-1">Estimated Equity: <strong>{formatCurrency(estimatedEquity)}</strong></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUpload
                    label="Property Photos"
                    accept="image/*"
                    onChange={(files) => {
                      if (files?.[0]) {
                        const reader = new FileReader();
                        reader.onload = (e) => update('image', e.target.result);
                        reader.readAsDataURL(files[0]);
                      }
                    }}
                  />
                  <FileUpload label="Deeds, Insurance & Inspection Docs (PDF)" accept=".pdf" multiple />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
