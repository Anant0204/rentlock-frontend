import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { ArrowLeft, Edit, DoorOpen, Archive, Trash2, Save, AlertTriangle, Plus, CreditCard, Bed, Bath, ChevronDown, Info } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatCard from '../../components/shared/StatCard';
import { getUnits, archiveUnit, deleteUnit, updateUnit } from '../../data/mockUnits';
import { getProperties } from '../../data/mockProperties';
import { getLeases } from '../../data/mockLeases';
import { getInvoices } from '../../data/mockInvoices';
import { mockComplaints } from '../../data/mockExtra';
import { getAdminPortalState } from '../../data/adminPortalStore';
import { getUnitTypes, fetchUnitTypesFromBackend } from '../../utils/unitTypeStore';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rawProps = getProperties().filter((p) => !p.archived);
  const properties = rawProps.length > 0 ? rawProps : [{ id: 1, name: 'Sunrise Residency' }];
  const [unit, setUnit] = useState(() => getUnits().find((u) => String(u.id) === String(id)));
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(unit || {});
  const [chargeForm, setChargeForm] = useState({ label: 'Late Fee / Utility Charge', amount: '' });
  const [customCharges, setCustomCharges] = useState([]);
  const [unitTypes, setUnitTypes] = useState(() => getUnitTypes());

  useEffect(() => {
    fetchUnitTypesFromBackend().then((types) => {
      if (Array.isArray(types) && types.length > 0) {
        setUnitTypes(types);
      }
    });
  }, []);

  const updateEdit = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const addEditRecurringCharge = () => {
    const charges = editForm.recurringCharges || [];
    setEditForm((prev) => ({
      ...prev,
      recurringCharges: [...charges, { id: Date.now(), label: '', amount: '' }],
    }));
  };

  const removeEditRecurringCharge = (cId) => {
    setEditForm((prev) => ({
      ...prev,
      recurringCharges: (prev.recurringCharges || []).filter((c) => c.id !== cId),
    }));
  };

  const updateEditRecurringCharge = (cId, field, val) => {
    setEditForm((prev) => ({
      ...prev,
      recurringCharges: (prev.recurringCharges || []).map((c) => (c.id === cId ? { ...c, [field]: val } : c)),
    }));
  };

  const addEditMeter = () => {
    const meters = editForm.meters || [];
    setEditForm((prev) => ({
      ...prev,
      meters: [...meters, { id: Date.now(), type: 'Electric', number: '' }],
    }));
  };

  const removeEditMeter = (mId) => {
    setEditForm((prev) => ({
      ...prev,
      meters: (prev.meters || []).filter((m) => m.id !== mId),
    }));
  };

  const updateEditMeter = (mId, field, val) => {
    setEditForm((prev) => ({
      ...prev,
      meters: (prev.meters || []).map((m) => (m.id === mId ? { ...m, [field]: val } : m)),
    }));
  };

  const openEditModal = () => {
    fetchUnitTypesFromBackend().then((types) => {
      if (Array.isArray(types) && types.length > 0) setUnitTypes(types);
    });
    setEditForm({
      ...unit,
      propertyId: unit.propertyId || properties[0]?.id || 1,
      propertyName: unit.propertyName || properties[0]?.name || 'Sunrise Residency',
      building: unit.building || unit.block || 'Main Building',
      unitNumber: unit.unitNumber || '',
      floor: unit.floor || 1,
      beds: unit.beds ?? unit.bedrooms ?? 1,
      baths: unit.baths ?? (unit.bathrooms !== undefined ? Number(unit.bathrooms) : 1),
      unitType: unit.bhk || `${unit.beds ?? unit.bedrooms ?? 1} BD / ${unit.baths ?? unit.bathrooms ?? 1} BA`,
      bhk: unit.bhk || `${unit.beds ?? unit.bedrooms ?? 1} BD / ${unit.baths ?? unit.bathrooms ?? 1} BA`,
      size: unit.size || unit.sqft || 900,
      rent: unit.rent || unit.rentAmount || 2150,
      parkingSlot: unit.parkingSlot || '',
      furnished: unit.furnished || 'Unfurnished',
      status: unit.status || 'Vacant',
      recurringCharges: unit.recurringCharges?.length > 0 ? unit.recurringCharges : [{ id: 1, label: 'Pet Rent', amount: '' }],
      meters: unit.meters?.length > 0 ? unit.meters : [{ id: 1, type: 'Electric', number: unit.meterNumber && unit.meterNumber !== '—' ? unit.meterNumber : '' }],
    });
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    let isMounted = true;
    apiClient.get(`/units/${id}`)
      .then((data) => {
        if (isMounted && data) {
          const enriched = {
            ...data,
            propertyName: data.propertyName || data.property?.name || unit?.propertyName || 'General Portfolio',
            tenant: data.tenant || data.tenants?.[0]?.name || unit?.tenant || null,
            size: data.size || data.sqft || unit?.size,
            rent: Number(data.rent ?? data.rentAmount ?? unit?.rent ?? 0),
            deposit: Number(data.deposit ?? data.depositAmount ?? unit?.deposit ?? 0),
            beds: data.beds ?? data.bedrooms ?? unit?.beds ?? unit?.bedrooms ?? 1,
            baths: data.baths ?? (data.bathrooms !== undefined ? Number(data.bathrooms) : (unit?.baths ?? unit?.bathrooms ?? 1)),
            bhk: data.bhk || unit?.bhk || `${data.bedrooms ?? unit?.bedrooms ?? 1} BD / ${data.bathrooms ?? unit?.bathrooms ?? 1} BA`,
          };
          setUnit(enriched);
          setEditForm(enriched);
        }
      })
      .catch(() => {
        apiClient.get('/units?limit=100').then((res) => {
          const items = res?.items || res;
          if (isMounted && Array.isArray(items)) {
            const found = items.find((u) => String(u.id) === String(id));
            if (found) {
              setUnit(found);
              setEditForm(found);
            }
          }
        }).catch(() => {});
      });

    return () => { isMounted = false; };
  }, [id]);

  if (!unit) return <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest opacity-40">Unit Not Found</div>;

  const lease = (unit?.leases && unit.leases.length > 0 ? unit.leases[0] : null) ||
    getLeases().find((l) => String(l.unitId) === String(unit?.id) || (l.unitNumber === unit?.unitNumber && l.propertyName === unit?.propertyName));
  const invoices = (unit?.invoices && unit.invoices.length > 0 ? unit.invoices :
    getInvoices().filter((i) => i.unitNumber === unit?.unitNumber && i.propertyName === unit?.propertyName));
  const workOrders = (unit?.tickets && unit.tickets.length > 0 ? unit.tickets :
    mockComplaints.filter((w) => w.unitNumber === unit?.unitNumber && w.propertyName === unit?.propertyName));
  const deposits = getAdminPortalState().securityDeposits.filter((d) => d.unitNumber === unit?.unitNumber && d.propertyName === unit?.propertyName);

  // Check if linked leases, deposits, payments, or maintenance records exist
  const hasLinkedRecords = Boolean(
    (unit?.leases && unit.leases.length > 0) ||
    (unit?.tenants && unit.tenants.length > 0) ||
    unit?.tenant ||
    unit?.status === 'Occupied' ||
    lease ||
    invoices.length > 0 ||
    workOrders.length > 0 ||
    deposits.length > 0
  );

  const balanceDue = invoices.reduce((s, i) => s + (i.balance || 0), 0) + customCharges.reduce((s, c) => s + c.amount, 0);
  const agingBuckets = [
    { label: 'Current', amount: invoices.filter((i) => i.agingBucket === 'Current').reduce((s, i) => s + (i.balance || 0), 0) },
    { label: '1–30 Days', amount: invoices.filter((i) => i.agingBucket === '1-30').reduce((s, i) => s + (i.balance || 0), 0) },
    { label: '31–60 Days', amount: invoices.filter((i) => i.agingBucket === '31-60').reduce((s, i) => s + (i.balance || 0), 0) },
    { label: '61–90 Days', amount: 0 },
    { label: '90+ Days', amount: 0 },
  ];

  const handleArchive = async () => {
    try {
      setIsDeleting(true);
      await archiveUnit(unit.id, true);
      toast.success(`Unit ${unit.unitNumber} archived. Linked history retained.`);
      setIsRemoveModalOpen(false);
      navigate('/units');
    } catch (err) {
      console.error('Archive unit error:', err);
      toast.error(err.response?.data?.message || err.message || `Failed to archive unit ${unit.unitNumber}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteUnit(unit.id);
      toast.success(`Unit ${unit.unitNumber} deleted successfully`);
      setIsRemoveModalOpen(false);
      navigate('/units');
    } catch (err) {
      console.error('Delete unit error:', err);
      toast.error(err.response?.data?.message || err.message || `Failed to delete unit ${unit.unitNumber}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const beds = Number(editForm.beds ?? editForm.bedrooms ?? 1);
      const baths = Number(editForm.baths ?? editForm.bathrooms ?? 1);
      const rent = Number(editForm.rent || editForm.rentAmount || 2150);
      const size = Number(editForm.size || editForm.sqft || 900);
      const floor = Number(editForm.floor || 1);
      const prop = properties.find((p) => String(p.id) === String(editForm.propertyId));

      const payload = {
        ...editForm,
        propertyId: Number(editForm.propertyId) || unit.propertyId,
        propertyName: prop?.name || editForm.propertyName || unit.propertyName,
        building: editForm.building || 'Main Building',
        block: editForm.building || 'Main Building',
        unitNumber: editForm.unitNumber,
        floor,
        bedrooms: beds,
        bathrooms: baths,
        beds,
        baths,
        sqft: size,
        size,
        rentAmount: rent,
        rent,
        depositAmount: rent,
        bhk: editForm.unitType || `${beds} BD / ${baths} BA`,
        unitType: editForm.unitType || `${beds} BD / ${baths} BA`,
        parkingSlot: editForm.parkingSlot || null,
        furnished: editForm.furnished || 'Unfurnished',
        status: editForm.status || 'Vacant',
        meterNumber: editForm.meters?.[0]?.number || '—',
        meters: editForm.meters?.filter((m) => m.number) || [],
        recurringCharges: editForm.recurringCharges?.filter((c) => c.label && c.amount).map((c) => ({ ...c, amount: Number(c.amount) })) || [],
      };

      await updateUnit(unit.id, payload);
      setUnit({ ...unit, ...payload });
      setIsEditModalOpen(false);
      toast.success('Unit specifications updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update unit');
    }
  };

  const handleAddCharge = () => {
    if (!chargeForm.amount) return;
    setCustomCharges((prev) => [...prev, { id: `CHG-${Date.now()}`, label: chargeForm.label, amount: Number(chargeForm.amount), date: '11/12/2026', status: 'Posted' }]);
    setChargeForm({ label: 'Maintenance Chargeback', amount: '' });
    setIsChargeModalOpen(false);
    toast.success('Charge posted to unit ledger');
  };

  const unitLayout = unit.bhk || (unit.bedrooms !== undefined || unit.beds !== undefined
    ? `${unit.bedrooms ?? unit.beds} BD / ${unit.bathrooms ?? unit.baths} BA`
    : '—');
  const unitBeds = unit.bedrooms ?? unit.beds ?? 1;
  const unitBaths = unit.bathrooms ?? unit.baths ?? 1;

  const infoItems = [
    ['Property', unit.propertyName],
    ['Building / Block', unit.building || unit.block || '—'],
    ['Floor', unit.floor],
    ['Size', `${unit.size} sq ft`],
    ['Unit Type', unitLayout],
    ['Beds / Baths', `${unitBeds} Bed / ${unitBaths} Bath`],
    ['Furnished', unit.furnished || 'Unfurnished'],
    ['Market Rent', `${formatCurrency(unit.rent)}/mo`],
    ['Utility Meter', unit.meterNumber || '—'],
    ['Parking Space', unit.parkingSlot || '—'],
    ['Current Resident', unit.tenant || 'Unoccupied'],
  ];

  const tabs = [
    {
      key: 'info',
      label: 'Specifications',
      content: (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-5">
            {infoItems.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[13px] font-bold text-gray-700">{value}</p>
              </div>
            ))}
          </div>
          {unit.recurringCharges?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Optional Unit Recurring Charges</p>
              <div className="flex flex-wrap gap-2">
                {unit.recurringCharges.map((rc, i) => (
                  <Badge key={i} variant="info">{rc.label}: {formatCurrency(rc.amount)}/mo</Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      ),
    },
    {
      key: 'lease',
      label: 'Lease & Tenants',
      content: lease ? (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Active / Linked Lease ({lease.leaseType})</h3>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/leases/${lease.id}`)}>Open Full Lease →</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                ['Primary Tenant', lease.tenantName],
                ['Start Date', formatDate(lease.startDate)],
                ['End Date', formatDate(lease.endDate)],
                ['Monthly Rent', formatCurrency(lease.monthlyRent)],
                ['Security Deposit', formatCurrency(lease.deposit)],
                ['Due Day', `${lease.dueDate}st of month`],
                ['Notice Period', lease.noticePeriod],
                ['Renewal / Escalation', lease.rentIncreaseRule],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-[13px] font-bold text-gray-700">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Rent Increase History" subtitle="Approved base rent schedule for this unit" />
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 uppercase border-b border-gray-100">
                    <th className="py-2">Period</th>
                    <th className="py-2">Effective Date</th>
                    <th className="py-2">Monthly Rent</th>
                    <th className="py-2">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(lease.rentSchedule || [{ year: 'Current Term', effective: lease.startDate, monthlyRent: lease.monthlyRent, change: 'Base' }]).map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-bold text-gray-900">{row.year}</td>
                      <td className="py-2.5 text-gray-600">{formatDate(row.effective)}</td>
                      <td className="py-2.5 font-semibold">{formatCurrency(row.monthlyRent)}</td>
                      <td className="py-2.5"><Badge variant="info">{row.change}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="text-sm text-gray-400 font-bold py-12 text-center italic">No active tenancy linked to Unit {unit.unitNumber}.</p>
        </Card>
      ),
    },
    {
      key: 'ledger',
      label: 'Financial Ledger',
      count: invoices.length + customCharges.length,
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Unit Balance Due</p>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(balanceDue)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {agingBuckets.map((b) => (
                <div key={b.label} className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{b.label}</p>
                  <p className="text-xs font-black text-gray-800">{formatCurrency(b.amount)}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setIsChargeModalOpen(true)}>+ Add Charge</Button>
              <Button size="sm" icon={CreditCard} onClick={() => navigate('/rent-payments?tab=collections')}>Record Payment</Button>
            </div>
          </div>

          <div className="space-y-2">
            {invoices.length === 0 && customCharges.length === 0 ? (
              <Card><p className="text-sm text-gray-400 font-bold py-10 text-center italic">No ledger transactions for this unit yet.</p></Card>
            ) : (
              <>
                {customCharges.map((chg) => (
                  <div key={chg.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                    <div className="flex-1">
                      <p className="text-[13px] font-black text-gray-800">{chg.id} — {chg.label}</p>
                      <p className="text-[11px] text-gray-400 font-bold">{chg.date}</p>
                    </div>
                    <p className="text-[14px] font-black text-indigo-600">{formatCurrency(chg.amount)}</p>
                    <Badge variant="info">{chg.status}</Badge>
                  </div>
                ))}
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                    <div className="flex-1">
                      <p className="text-[13px] font-black text-gray-800">{inv.id} — {inv.month}</p>
                      <p className="text-[11px] text-gray-400 font-bold">Due {formatDate(inv.dueDate)} · Paid {formatCurrency(inv.paid)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-black text-indigo-600">{formatCurrency(inv.total)}</p>
                      <p className="text-[11px] text-gray-500">Bal: {formatCurrency(inv.balance)}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase ${getStatusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Separate Security Deposits Table */}
          <Card padding="p-5">
            <CardHeader title="Security Deposits (Held in Trust)" subtitle="Separate trust liability ledger — never mixed with rent revenue" />
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 uppercase border-b border-gray-100">
                    <th className="py-2">Deposit ID</th>
                    <th className="py-2">Resident</th>
                    <th className="py-2">Trust Account</th>
                    <th className="py-2">Held Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deposits.length > 0 ? deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 font-bold text-gray-900">{d.id}</td>
                      <td className="py-2.5">{d.tenantName}</td>
                      <td className="py-2.5 text-gray-600">{d.trustAccount}</td>
                      <td className="py-2.5 font-bold text-emerald-700">{formatCurrency(d.heldAmount)}</td>
                      <td className="py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getStatusColor(d.status)}`}>{d.status}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">No security deposit held for this unit yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Units', path: '/units' }, { label: unit.unitNumber }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/units')} className="py-2 text-xs font-bold">Back</Button>
            <Button variant="secondary" icon={Edit} onClick={openEditModal} className="py-2 text-xs font-bold">Edit</Button>
            <Button variant="danger" icon={Trash2} size="sm" onClick={() => setIsRemoveModalOpen(true)} className="py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">
              {hasLinkedRecords ? 'Remove / Archive' : 'Delete Unit'}
            </Button>
          </div>
        }
      />

      <div className="bg-[#4338ca] rounded-[1.5rem] p-7 mb-6 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-1">{unit.unitNumber}</h1>
            <p className="text-white/75 font-bold mb-5 flex items-center gap-2">
              <DoorOpen className="w-4 h-4 opacity-70" /> {unit.propertyName} · {unit.building || `Block ${unit.block}`} · Floor {unit.floor}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-white/20 bg-white/10 ${unit.status === 'Occupied' ? 'text-emerald-300' : 'text-amber-300'}`}>{unit.status}</span>
              <span className="text-[10px] px-3 py-1 rounded-full bg-white/10 border border-white/20 font-black uppercase tracking-widest">{unit.bhk} · {unit.size} sq ft</span>
              <span className="text-[10px] px-3 py-1 rounded-full bg-white/10 border border-white/20 font-black tracking-widest">{formatCurrency(unit.rent)}/mo</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/15 text-center min-w-[160px]">
            <p className="text-xs text-white/70 font-black uppercase tracking-widest mb-1">Market Rent</p>
            <p className="text-3xl font-black">{formatCurrency(unit.rent)}</p>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} defaultTab="info" />

      {/* Archive vs Delete Modal */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => !isDeleting && setIsRemoveModalOpen(false)}
        title={hasLinkedRecords ? 'Remove or Archive Unit' : 'Delete Unit'}
        size={hasLinkedRecords ? 'md' : 'sm'}
        footer={
          hasLinkedRecords ? (
            <div className="flex flex-wrap items-center justify-end gap-2 w-full">
              <Button variant="secondary" disabled={isDeleting} onClick={() => setIsRemoveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" disabled={isDeleting} onClick={handleArchive} icon={Archive}>
                Archive Unit
              </Button>
              <Button variant="danger" disabled={isDeleting} onClick={handleDelete} icon={Trash2} className="bg-rose-600 hover:bg-rose-700 text-white">
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" disabled={isDeleting} onClick={() => setIsRemoveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={isDeleting} onClick={handleDelete} icon={Trash2} className="bg-rose-600 hover:bg-rose-700 text-white">
                {isDeleting ? 'Deleting...' : 'Delete Unit'}
              </Button>
            </div>
          )
        }
      >
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          {hasLinkedRecords ? (
            <>
              <p className="text-gray-900 font-black text-base">Active or Linked Records Detected</p>
              <p className="text-gray-500 text-xs leading-relaxed max-w-md">
                Unit <strong>{unit.unitNumber}</strong> is currently <strong>{unit.status}</strong>
                {unit.tenant ? ` with resident ${unit.tenant}` : ''}.
                You can <strong>Archive</strong> this unit to retire it while preserving historical leases and invoices, or <strong>Permanently Delete</strong> it to remove the unit and clean up associated records.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-900 font-black text-base">Delete Unit {unit.unitNumber}?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                This unit will be permanently deleted from the system. This action cannot be undone.
              </p>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        title="Post Charge to Unit Ledger"
        size="sm"
        footer={<Button onClick={handleAddCharge}>Post Charge</Button>}
      >
        <div className="space-y-4">
          <Input label="Charge Description" value={chargeForm.label} onChange={(e) => setChargeForm({ ...chargeForm, label: e.target.value })} />
          <Input label="Amount ($ USD)" type="number" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} />
        </div>
      </Modal>

      {/* Edit Unit Modal - Exact match to Add Unit layout */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Unit"
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} icon={Save} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6">
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* SECTION 1: UNIT DETAILS */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Unit Details</h3>
            
            <div className="space-y-4">
              {/* Row 1: Property *, Building / Block, Unit # * */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Property <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.propertyId}
                      onChange={(e) => updateEdit('propertyId', e.target.value)}
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
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Building / Block
                  </label>
                  <input
                    type="text"
                    placeholder="Main Building"
                    value={editForm.building || ''}
                    onChange={(e) => updateEdit('building', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Unit # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., A-101"
                    value={editForm.unitNumber || ''}
                    onChange={(e) => updateEdit('unitNumber', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
              </div>

              {/* Row 2: Floor, Beds / Baths, Unit Type, Size (sq ft) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Floor
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="1"
                    value={editForm.floor || 1}
                    onChange={(e) => updateEdit('floor', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>

                {/* Combined Beds / Baths */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Beds / Baths
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative flex items-center">
                      <Bed className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="2 Bed"
                        value={editForm.beds ?? 1}
                        onChange={(e) => updateEdit('beds', e.target.value ? Math.floor(Math.abs(Number(e.target.value))) : '')}
                        className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-2 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                        title="Number of Bedrooms"
                      />
                    </div>

                    <div className="relative flex items-center">
                      <Bath className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="2 Bath"
                        value={editForm.baths !== undefined ? Math.floor(Number(editForm.baths)) : 1}
                        onChange={(e) => updateEdit('baths', e.target.value ? Math.floor(Math.abs(Number(e.target.value))) : '')}
                        className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-2 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                        title="Number of Bathrooms"
                      />
                    </div>
                  </div>
                </div>

                {/* Unit Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Unit Type
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.unitType || (unitTypes.includes(editForm.bhk) ? editForm.bhk : unitTypes[0] || '')}
                      onChange={(e) => updateEdit('unitType', e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                    >
                      {unitTypes.length === 0 ? (
                        <option value="">No unit types defined</option>
                      ) : (
                        unitTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    Size (sq ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="900"
                    value={editForm.size || ''}
                    onChange={(e) => updateEdit('size', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICING & RECURRING CHARGES */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Pricing &amp; Recurring Charges</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Market Rent ($ / month) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="2150"
                  value={editForm.rent || ''}
                  onChange={(e) => updateEdit('rent', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Security Deposit Rule</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Security deposit amount is entered on the lease (tracked separately in the Trust / Liability Deposit Register).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional recurring charges */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Optional Unit Recurring Charges (Pet Rent, Parking, Storage)
                </label>
                <button
                  type="button"
                  onClick={addEditRecurringCharge}
                  className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Charge</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {editForm.recurringCharges?.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-6">
                      <input
                        type="text"
                        placeholder="Charge description (e.g., Pet Rent)"
                        value={c.label}
                        onChange={(e) => updateEditRecurringCharge(c.id, 'label', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="number"
                        placeholder="$/month"
                        value={c.amount}
                        onChange={(e) => updateEditRecurringCharge(c.id, 'amount', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      {editForm.recurringCharges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditRecurringCharge(c.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: ADDITIONAL INFO & UTILITY METERS */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Additional Info &amp; Utility Meters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Assigned Parking Space
                </label>
                <input
                  type="text"
                  placeholder="e.g., P-A01"
                  value={editForm.parkingSlot || ''}
                  onChange={(e) => updateEdit('parkingSlot', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Furnished Status
                </label>
                <div className="relative">
                  <select
                    value={editForm.furnished || 'Unfurnished'}
                    onChange={(e) => updateEdit('furnished', e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                  >
                    <option value="Unfurnished">Unfurnished</option>
                    <option value="Furnished">Furnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Unit Status
                </label>
                <div className="relative">
                  <select
                    value={editForm.status || 'Vacant'}
                    onChange={(e) => updateEdit('status', e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Turnover">Turnover</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Occupied">Occupied</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Utility Meters */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Utility Meters
                </label>
                <button
                  type="button"
                  onClick={addEditMeter}
                  className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Meter</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {editForm.meters?.map((m) => (
                  <div key={m.id} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-5">
                      <div className="relative">
                        <select
                          value={m.type}
                          onChange={(e) => updateEditMeter(m.id, 'type', e.target.value)}
                          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 pr-8 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                        >
                          <option value="Electric">Electric</option>
                          <option value="Water">Water</option>
                          <option value="Gas">Gas</option>
                          <option value="Trash">Trash</option>
                          <option value="Internet">Internet</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        placeholder="e.g., CONED-88412"
                        value={m.number}
                        onChange={(e) => updateEditMeter(m.id, 'number', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      {editForm.meters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditMeter(m.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
