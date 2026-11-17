import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  ArrowLeft, MapPin, Edit, Archive, Users, DoorOpen, DollarSign,
  FileText, Building2, AlertCircle, Save, Layers, UserCheck, CheckCircle2
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import StatCard from '../../components/shared/StatCard';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { getProperties, archiveProperty, updateProperty } from '../../data/mockProperties';
import { getUnits } from '../../data/mockUnits';
import { getTenants } from '../../data/mockTenants';
import { formatCurrency, getStatusColor, formatDate } from '../../utils/formatters';
import { useTable } from '../../hooks/useTable';
import toast from 'react-hot-toast';

function UnitsTab({ propertyId }) {
  const navigate = useNavigate();
  const units = getUnits().filter((u) => u.propertyId === propertyId);
  const table = useTable(units, 10);
  const columns = [
    { key: 'unitNumber', label: 'Unit', sortable: true },
    { key: 'floor', label: 'Floor', sortable: true },
    { key: 'bhk', label: 'Layout', sortable: true },
    { key: 'rent', label: 'Market Rent', sortable: true, align: 'right', render: (v) => formatCurrency(v) },
    { key: 'status', label: 'Status', render: (v) => <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold ${getStatusColor(v)}`}>{v}</span> },
  ];
  return <Table columns={columns} data={table.data} page={table.page} totalPages={table.totalPages} onPageChange={table.setPage} onRowClick={(r) => navigate(`/units/${r.id}`)} />;
}

function TenantsTab({ propertyId }) {
  const navigate = useNavigate();
  const tenants = getTenants().filter((t) => t.propertyId === propertyId);
  return (
    <div className="space-y-2">
      {tenants.map((t) => (
        <div key={t.id} onClick={() => navigate(`/tenants/${t.id}`)} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-indigo-200 transition-all">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">{t.name.charAt(0)}</div>
          <div className="flex-1 text-sm font-bold text-gray-700">{t.name} <span className="text-xs text-gray-400 block font-medium">Unit {t.unitNumber}</span></div>
          <div className="text-right text-sm font-black text-indigo-600">{formatCurrency(t.rent)}/mo</div>
        </div>
      ))}
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(() => getProperties().find((p) => String(p.id) === String(id)));

  useEffect(() => {
    if (!property) {
      apiClient.get('/properties?limit=100').then((res) => {
        const items = res?.items || res;
        if (Array.isArray(items)) {
          const found = items.find((p) => String(p.id) === String(id));
          if (found) {
            setProperty(found);
            setEditForm(found);
          }
        }
      }).catch(() => {});
    }
  }, [id, property]);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(property || {});

  if (!property) return <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest">Property not found</div>;

  const occupancyRate = property.totalUnits ? Math.round((property.occupiedUnits / property.totalUnits) * 100) : 0;
  const fin = property.financials || {};
  const estEquity = (fin.marketValue || 0) - (fin.mortgageBalance || 0);

  const confirmArchive = () => {
    archiveProperty(property.id, true);
    toast.success('Property archived. Linked units, leases, and financial history remain preserved.');
    setIsArchiveModalOpen(false);
    navigate('/properties');
  };

  const handleUpdate = () => {
    updateProperty(property.id, editForm);
    setProperty({ ...property, ...editForm });
    setIsEditModalOpen(false);
    toast.success('Property updated');
  };

  const handleCompleteRequirement = (reqId) => {
    const updatedReqs = (property.requirements || []).map((r) => {
      if (r.id !== reqId) return r;
      const d = new Date(r.dueDate || '2026-12-01');
      if (r.recurrence === 'Quarterly') d.setMonth(d.getMonth() + 3);
      else if (r.recurrence === 'Monthly') d.setMonth(d.getMonth() + 1);
      else d.setFullYear(d.getFullYear() + 1);
      return { ...r, status: 'Completed', nextDueDate: d.toISOString().split('T')[0], completedOn: new Date().toLocaleDateString('en-US') };
    });
    updateProperty(property.id, { requirements: updatedReqs });
    setProperty((prev) => ({ ...prev, requirements: updatedReqs }));
    toast.success('Requirement completed — next cycle due date generated and history logged');
  };

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Total Units" value={property.totalUnits} icon={DoorOpen} color="blue" />
            <StatCard title="Occupied" value={property.occupiedUnits} icon={Users} color="green" />
            <StatCard title="Monthly Billed" value={formatCurrency(property.monthlyRevenue)} icon={DollarSign} color="cyan" />
            <StatCard title="Pending Dues" value={formatCurrency(property.pendingDues)} icon={DollarSign} color="red" />
          </div>
          <Card>
            <h3 className="text-sm font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <FileText className="w-4 h-4 text-indigo-500" /> U.S. Property Record Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                ['Category', property.category || property.type || 'Residential', Layers],
                ['Floors', property.floors || 4, Layers],
                ['Manager', typeof property.manager === 'object' && property.manager !== null ? property.manager.name : (property.manager || 'Sarah Jenkins'), Users],
                ['ZIP Code', property.zip || property.zipCode || '—', MapPin],
                ['Parcel / Tax ID', property.parcelId || `TAX-${property.id}048`, Building2],
                ['Mgmt Start Date', formatDate(property.managementStartDate || property.createdAt), Layers],
                ['Owners & Shares', typeof property.owner === 'object' && property.owner !== null ? property.owner.name : (property.owner || 'Claire Bennett (100%)'), UserCheck],
                ['Street Address', property.address, MapPin],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-[13px] font-bold text-gray-700">{value}</p>
                </div>
              ))}
            </div>
            {property.amenities?.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="text-[10px] px-2.5 py-1 rounded bg-gray-50 text-gray-600 font-bold border border-gray-100">{a}</span>
                ))}
              </div>
            )}
          </Card>
        </div>
      ),
    },
    { key: 'units', label: 'Units', count: property.totalUnits, content: <UnitsTab propertyId={property.id} /> },
    { key: 'tenants', label: 'Tenants', count: property.occupiedUnits, content: <TenantsTab propertyId={property.id} /> },
    {
      key: 'financials',
      label: 'Financials & Equity',
      content: (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Purchase Price" value={formatCurrency(fin.purchasePrice || 0)} color="blue" />
            <StatCard title="Est. Market Value" value={formatCurrency(fin.marketValue || 0)} color="green" />
            <StatCard title="Mortgage Balance" value={formatCurrency(fin.mortgageBalance || 0)} color="amber" />
            <StatCard title="Estimated Equity" value={formatCurrency(estEquity)} color="purple" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 border-t border-gray-100 pt-4 text-xs">
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Valuation Source</p><p className="font-bold text-gray-800 mt-1">{fin.valuationSource || '—'}</p></div>
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Assessed Value ({fin.taxYear || '2026'})</p><p className="font-bold text-gray-800 mt-1">{formatCurrency(fin.assessedValue || 0)}</p></div>
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Lender</p><p className="font-bold text-gray-800 mt-1">{fin.lender || 'Unencumbered'}</p></div>
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Loan Number</p><p className="font-bold text-gray-800 mt-1">{fin.loanNumber || '—'}</p></div>
          </div>
        </Card>
      ),
    },
    {
      key: 'requirements',
      label: 'Requirements & Compliance',
      count: (property.requirements || []).length,
      content: (
        <Card>
          <div className="space-y-3">
            {(property.requirements || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No compliance requirements added for this building.</p>
            ) : (property.requirements || []).map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div>
                  <p className="text-sm font-bold text-gray-900">{req.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{req.category} · Assignee: {req.assignee} · Recurrence: {req.recurrence} · Due: {req.nextDueDate || req.dueDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={req.status === 'Completed' ? 'success' : 'warning'}>{req.status}</Badge>
                  <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => handleCompleteRequirement(req.id)}>
                    Mark Complete &amp; Schedule Next
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Properties', path: '/properties' }, { label: property.name }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/properties')} className="py-2 text-xs font-bold">Back</Button>
            <Button variant="secondary" icon={Edit} onClick={() => setIsEditModalOpen(true)} className="py-2 text-xs font-bold">Edit</Button>
            {!property.archived && (
              <Button variant="danger" icon={Archive} size="sm" onClick={() => setIsArchiveModalOpen(true)} className="py-2 text-xs font-bold">Archive</Button>
            )}
          </div>
        }
      />

      <div className="bg-[#1e1b4b] rounded-2xl p-6 mb-4 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <h1 className="text-3xl font-black tracking-tight text-white">{property.name}</h1>
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none font-black text-[10px] uppercase tracking-widest">{property.status}</Badge>
            </div>
            <p className="flex items-center gap-2 text-indigo-200/80 text-[14px] font-bold mb-4">
              <MapPin className="w-4 h-4 text-indigo-400" /> {property.address}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-100 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 opacity-50" /> {property.type}
              </span>
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-100/70">Code: {property.code}</span>
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-100/70">Manager: {property.manager}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="text-center px-4 border-r border-white/10">
              <p className="text-2xl font-black">{occupancyRate}%</p>
              <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest mt-1 opacity-70">Occupancy</p>
            </div>
            <div className="text-center px-2">
              <p className="text-2xl font-black text-emerald-400">{property.occupiedUnits}</p>
              <p className="text-[10px] text-emerald-300/70 uppercase font-bold tracking-widest mt-1">Occupied</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} defaultTab="overview" />

      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Property"
        size="sm"
        footer={<><Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button><Button variant="danger" onClick={confirmArchive}>Confirm Archive</Button></>}
      >
        <div className="text-center py-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
          <p className="font-bold text-gray-900">Archive {property.name}?</p>
          <p className="text-xs text-gray-500 mt-1">Units, leases, receipts, and owner allocations remain preserved for audit and tax reporting.</p>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Property"
        size="lg"
        footer={<Button onClick={handleUpdate} icon={Save} className="bg-indigo-600 font-black">Save Changes</Button>}
      >
        <div className="grid grid-cols-2 gap-4 p-1">
          <Input label="Name" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Street Address" value={editForm.street || editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, street: e.target.value, address: e.target.value })} />
          <Select label="Use Type" value={editForm.type || 'Residential'} options={['Residential', 'Commercial', 'Mixed-Use', 'Industrial / Warehouse']} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} />
          <Select label="Category" value={editForm.category || 'Multifamily'} options={['Multifamily', 'Single-Family', 'Townhome', 'Office', 'Warehouse']} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
          <Input label="Assigned Manager" value={editForm.manager || ''} onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })} />
          <Input label="ZIP Code" value={editForm.zip || ''} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} />
          <Input label="Owners" value={editForm.owner || ''} onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })} />
          <Select label="Status" value={editForm.status || 'Active'} options={['Active', 'Onboarding', 'Under Maintenance']} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
