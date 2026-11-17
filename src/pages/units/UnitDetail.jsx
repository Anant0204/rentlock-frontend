import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { ArrowLeft, Edit, DoorOpen, Archive, Trash2, Save, AlertTriangle, Plus, CreditCard } from 'lucide-react';
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
import { getLeases } from '../../data/mockLeases';
import { getInvoices } from '../../data/mockInvoices';
import { mockComplaints } from '../../data/mockExtra';
import { getAdminPortalState } from '../../data/adminPortalStore';
import { UNIT_TYPES } from '../../utils/constants';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unit, setUnit] = useState(() => getUnits().find((u) => String(u.id) === String(id)));

  useEffect(() => {
    if (!unit) {
      apiClient.get('/units?limit=100').then((res) => {
        const items = res?.items || res;
        if (Array.isArray(items)) {
          const found = items.find((u) => String(u.id) === String(id));
          if (found) {
            setUnit(found);
            setEditForm(found);
          }
        }
      }).catch(() => {});
    }
  }, [id, unit]);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(unit || {});
  const [chargeForm, setChargeForm] = useState({ label: 'Late Fee / Utility Charge', amount: '' });
  const [customCharges, setCustomCharges] = useState([]);

  if (!unit) return <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest opacity-40">Unit Not Found</div>;

  const lease = getLeases().find((l) => l.unitId === unit.id || (l.unitNumber === unit.unitNumber && l.propertyName === unit.propertyName));
  const invoices = getInvoices().filter((i) => i.unitNumber === unit.unitNumber && i.propertyName === unit.propertyName);
  const workOrders = mockComplaints.filter((w) => w.unitNumber === unit.unitNumber && w.propertyName === unit.propertyName);
  const deposits = getAdminPortalState().securityDeposits.filter((d) => d.unitNumber === unit.unitNumber && d.propertyName === unit.propertyName);

  // Explicit Developer Rule (PDF Page 7): Block Delete if linked leases, deposits, payments, or maintenance records exist!
  const hasLinkedRecords = Boolean(lease || invoices.length > 0 || workOrders.length > 0 || deposits.length > 0);

  const balanceDue = invoices.reduce((s, i) => s + (i.balance || 0), 0) + customCharges.reduce((s, c) => s + c.amount, 0);
  const agingBuckets = [
    { label: 'Current', amount: invoices.filter((i) => i.agingBucket === 'Current').reduce((s, i) => s + (i.balance || 0), 0) },
    { label: '1–30 Days', amount: invoices.filter((i) => i.agingBucket === '1-30').reduce((s, i) => s + (i.balance || 0), 0) },
    { label: '31–60 Days', amount: invoices.filter((i) => i.agingBucket === '31-60').reduce((s, i) => s + (i.balance || 0), 0) },
    { label: '61–90 Days', amount: 0 },
    { label: '90+ Days', amount: 0 },
  ];

  const handleArchive = () => {
    archiveUnit(unit.id, true);
    toast.success(`Unit ${unit.unitNumber} archived. Linked history retained.`);
    setIsRemoveModalOpen(false);
    navigate('/units');
  };

  const handleDelete = () => {
    if (hasLinkedRecords) return;
    deleteUnit(unit.id);
    toast.success(`Draft unit ${unit.unitNumber} deleted`);
    setIsRemoveModalOpen(false);
    navigate('/units');
  };

  const handleUpdate = () => {
    updateUnit(unit.id, editForm);
    setUnit({ ...unit, ...editForm });
    setIsEditModalOpen(false);
    toast.success('Unit specifications updated');
  };

  const handleAddCharge = () => {
    if (!chargeForm.amount) return;
    setCustomCharges((prev) => [...prev, { id: `CHG-${Date.now()}`, label: chargeForm.label, amount: Number(chargeForm.amount), date: '11/12/2026', status: 'Posted' }]);
    setChargeForm({ label: 'Maintenance Chargeback', amount: '' });
    setIsChargeModalOpen(false);
    toast.success('Charge posted to unit ledger');
  };

  const infoItems = [
    ['Property', unit.propertyName],
    ['Building / Block', unit.building || unit.block],
    ['Floor', unit.floor],
    ['Size', `${unit.size} sq ft`],
    ['Unit Type', unit.bhk],
    ['Furnished', unit.furnished],
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
            <Button variant="secondary" icon={Edit} onClick={() => setIsEditModalOpen(true)} className="py-2 text-xs font-bold">Edit</Button>
            <Button variant="danger" icon={hasLinkedRecords ? Archive : Trash2} size="sm" onClick={() => setIsRemoveModalOpen(true)} className="py-2 text-xs font-bold">
              {hasLinkedRecords ? 'Archive Unit' : 'Delete Draft Unit'}
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

      {/* Archive vs Delete Enforcement Modal (PDF Page 7) */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        title={hasLinkedRecords ? 'Archive Unit (Delete Blocked)' : 'Delete Unit'}
        size="sm"
        footer={
          hasLinkedRecords ? (
            <>
              <Button variant="secondary" onClick={() => setIsRemoveModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleArchive}>Archive Unit</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIsRemoveModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Confirm Permanent Delete</Button>
            </>
          )
        }
      >
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          {hasLinkedRecords ? (
            <>
              <p className="text-gray-900 font-black text-base">Deletion Blocked — Linked Records Exist</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Unit <strong>{unit.unitNumber}</strong> has linked leases, invoices, trust deposits, or work orders. Per U.S. audit policy, permanently deleting historical units is blocked. Use <strong>Archive Unit</strong> instead.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-900 font-black text-base">Delete Empty Draft Unit?</p>
              <p className="text-gray-500 text-xs leading-relaxed">No linked leases, deposits, payments, or work orders exist for Unit <strong>{unit.unitNumber}</strong>. Safe to delete permanently.</p>
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Update Unit Specs"
        size="lg"
        footer={<Button onClick={handleUpdate} icon={Save} className="font-black bg-[#4338ca] px-8">Save Changes</Button>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
          <Input label="Unit #" value={editForm.unitNumber || ''} onChange={(e) => setEditForm({ ...editForm, unitNumber: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Building / Block" value={editForm.building || editForm.block || ''} onChange={(e) => setEditForm({ ...editForm, building: e.target.value, block: e.target.value })} />
            <Input label="Floor" type="number" value={editForm.floor || 1} onChange={(e) => setEditForm({ ...editForm, floor: Number(e.target.value) })} />
          </div>
          <Select label="Unit Type" value={editForm.bhk || '2 BD / 2 BA'} options={UNIT_TYPES} onChange={(e) => setEditForm({ ...editForm, bhk: e.target.value })} />
          <Select label="Status" value={editForm.status || 'Vacant'} options={['Vacant', 'Occupied', 'Reserved', 'Turnover', 'Under Repair']} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
          <Input label="Market Rent ($)" type="number" value={editForm.rent || 0} onChange={(e) => setEditForm({ ...editForm, rent: Number(e.target.value) })} />
          <Input label="Unit Area (sq ft)" type="number" value={editForm.size || 0} onChange={(e) => setEditForm({ ...editForm, size: Number(e.target.value) })} />
          <Input label="Utility Meter #" value={editForm.meterNumber || ''} onChange={(e) => setEditForm({ ...editForm, meterNumber: e.target.value })} />
          <Input label="Parking Space" value={editForm.parkingSlot || ''} onChange={(e) => setEditForm({ ...editForm, parkingSlot: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
