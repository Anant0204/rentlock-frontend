import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Bed, Bath, ChevronDown } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getProperties } from '../../data/mockProperties';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

let nextTempId = 10000;
const generateUnitId = () => {
  nextTempId += 1;
  return Date.now() + nextTempId;
};

export default function AddUnit() {
  const navigate = useNavigate();
  const rawProps = getProperties().filter((p) => !p.archived);
  const properties = rawProps.length > 0
    ? rawProps
    : [{ id: 1, name: 'Sunrise Residency' }];

  const [form, setForm] = useState({
    propertyId: properties[0]?.id || 1,
    unitNumber: '',
    building: 'Main Building',
    floor: '1',
    size: '900',
    beds: '2',
    baths: '2',
    rent: '2150',
    parkingSlot: '',
    furnished: 'Unfurnished',
    status: 'Vacant',
  });

  const [recurringCharges, setRecurringCharges] = useState([
    { id: 1, label: 'Pet Rent', amount: '' },
  ]);
  const [meters, setMeters] = useState([
    { id: 1, type: 'Electric', number: '' },
  ]);

  useEffect(() => {
    // If backend has live properties, make sure we have the latest list
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        if (!form.propertyId) {
          setForm((prev) => ({ ...prev, propertyId: items[0].id }));
        }
      }
    }).catch(() => {});
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.propertyId || !form.unitNumber || !form.rent) {
      return toast.error('Property, Unit #, and Market Rent are required');
    }
    const prop = properties.find((p) => String(p.id) === String(form.propertyId));
    const newUnit = {
      id: generateUnitId(),
      propertyId: Number(form.propertyId),
      propertyName: prop?.name || 'Sunrise Residency',
      building: form.building,
      block: form.building,
      unitNumber: form.unitNumber,
      floor: Number(form.floor) || 1,
      size: Number(form.size) || 900,
      bhk: `${form.beds} BD / ${form.baths} BA`,
      beds: Number(form.beds) || 2,
      baths: Number(form.baths) || 2,
      rent: Number(form.rent) || 2150,
      deposit: 0,
      maintenanceFee: 0,
      recurringCharges: recurringCharges.filter((c) => c.label && c.amount).map((c) => ({ ...c, amount: Number(c.amount) })),
      meters: meters.filter((m) => m.number),
      meterNumber: meters[0]?.number || '—',
      parkingSlot: form.parkingSlot || null,
      furnished: form.furnished,
      status: form.status,
      archived: false,
      tenant: null,
    };

    // 1. Save to local storage for immediate offline reactivity
    const existing = JSON.parse(localStorage.getItem('custom_units') || '[]');
    localStorage.setItem('custom_units', JSON.stringify([...existing, newUnit]));

    // 2. Call backend API to persist to MySQL database
    try {
      await apiClient.post('/units', {
        propertyId: Number(form.propertyId),
        unitNumber: form.unitNumber,
        floor: Number(form.floor) || 1,
        bedrooms: Number(form.beds) || 2,
        bathrooms: Number(form.baths) || 2,
        sqft: Number(form.size) || 900,
        rentAmount: Number(form.rent) || 2150,
        depositAmount: Number(form.rent) || 2150,
        status: form.status || 'Vacant',
      });
    } catch (apiErr) {
      console.warn('[AddUnit] API save fallback:', apiErr.message);
    }

    toast.success(`Unit ${form.unitNumber} added to ${newUnit.propertyName}`);
    navigate('/units');
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <PageHeader
        title="Add New Unit"
        subtitle="Configure physical specs, market rent ($/mo), optional recurring charges & utility meters"
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Units', path: '/units' }, { label: 'Add Unit' }]}
        actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/units')}>Back</Button>}
      />

      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        {/* CARD 1: UNIT DETAILS */}
        <Card className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-5">Unit Details</h3>
          
          <div className="space-y-5">
            {/* Row 1: Property *, Building / Block, Unit # * */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Property <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.propertyId}
                    onChange={(e) => update('propertyId', e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name.toLowerCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Building / Block
                </label>
                <input
                  type="text"
                  placeholder="Main Building"
                  value={form.building}
                  onChange={(e) => update('building', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Unit # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., A-101"
                  value={form.unitNumber}
                  onChange={(e) => update('unitNumber', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>

            {/* Row 2: Floor, Beds / Baths, Size (sq ft) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Floor
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="1"
                  value={form.floor}
                  onChange={(e) => update('floor', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              {/* Combined Beds / Baths - Manual Number Inputs */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Beds / Baths
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Beds manual number input */}
                  <div className="relative flex items-center">
                    <Bed className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="2 Bed"
                      value={form.beds}
                      onChange={(e) => update('beds', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                      title="Number of Bedrooms (e.g. 1, 2, 3)"
                    />
                  </div>

                  {/* Baths manual number input */}
                  <div className="relative flex items-center">
                    <Bath className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="2 Bath"
                      value={form.baths}
                      onChange={(e) => update('baths', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                      title="Number of Bathrooms (e.g. 1, 1.5, 2, 2.5)"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Size (sq ft)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="900"
                  value={form.size}
                  onChange={(e) => update('size', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* CARD 2: PRICING & RECURRING CHARGES */}
        <Card className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-5">Pricing &amp; Recurring Charges</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Market Rent ($ / month) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  placeholder="$2,150"
                  value={form.rent}
                  onChange={(e) => update('rent', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>

            {/* Info callout */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
              <div className="w-4 h-4 rounded-full border border-blue-600 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-serif font-bold">
                i
              </div>
              <div className="text-xs text-blue-950 leading-relaxed">
                <p className="font-bold text-blue-950 mb-0.5">Security Deposit Rule</p>
                <p>
                  Security deposit amount is <strong className="font-bold text-blue-900">entered on the lease</strong> (tracked separately in the Trust / Liability Deposit Register).
                </p>
              </div>
            </div>
          </div>

          {/* Optional Recurring Charges Subsection */}
          <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                OPTIONAL UNIT RECURRING CHARGES (PET RENT, PARKING, STORAGE)
              </p>
              <button
                type="button"
                onClick={() => setRecurringCharges((prev) => [...prev, { id: generateUnitId(), label: '', amount: '' }])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Charge
              </button>
            </div>

            {recurringCharges.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-6">
                  <input
                    type="text"
                    placeholder="Pet Rent"
                    value={row.label}
                    onChange={(e) => setRecurringCharges((prev) => prev.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
                <div className="col-span-5">
                  <input
                    type="number"
                    placeholder="$/month"
                    value={row.amount}
                    onChange={(e) => setRecurringCharges((prev) => prev.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => setRecurringCharges((prev) => prev.filter((r) => r.id !== row.id))}
                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CARD 3: ADDITIONAL INFO & UTILITY METERS */}
        <Card className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-5">Additional Info &amp; Utility Meters</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Assigned Parking Space
              </label>
              <input
                type="text"
                placeholder="e.g., P-A01"
                value={form.parkingSlot}
                onChange={(e) => update('parkingSlot', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Furnished Status
              </label>
              <div className="relative">
                <select
                  value={form.furnished}
                  onChange={(e) => update('furnished', e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                >
                  {['Unfurnished', 'Semi-Furnished', 'Fully Furnished'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Unit Status
              </label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                >
                  {['Vacant', 'Reserved', 'Turnover', 'Under Repair', 'Occupied'].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Utility Meters Subsection */}
          <div className="space-y-3 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                UTILITY METERS
              </p>
              <button
                type="button"
                onClick={() => setMeters((prev) => [...prev, { id: generateUnitId(), type: 'Gas', number: '' }])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Meter
              </button>
            </div>

            {meters.map((m) => (
              <div key={m.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4">
                  <div className="relative">
                    <select
                      value={m.type}
                      onChange={(e) => setMeters((prev) => prev.map((x) => (x.id === m.id ? { ...x, type: e.target.value } : x)))}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                    >
                      {['Electric', 'Gas', 'Water', 'Submeter'].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-7">
                  <input
                    type="text"
                    placeholder="e.g., CONED-88412"
                    value={m.number}
                    onChange={(e) => setMeters((prev) => prev.map((x) => (x.id === m.id ? { ...x, number: e.target.value } : x)))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
                <div className="col-span-1 text-right">
                  {meters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMeters((prev) => prev.filter((x) => x.id !== m.id))}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" icon={Save} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
            Create Unit
          </Button>
          <Button variant="secondary" onClick={() => navigate('/units')} size="lg">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
