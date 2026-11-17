import { useState, useMemo, useEffect } from 'react';
import {
  Store, Plus, Search, ShieldCheck, Phone, Mail,
  DollarSign, CheckCircle2, Wrench, Star, Building2,
  Calendar, LayoutGrid, List, Zap, Wind, Flame,
  CreditCard, Sparkles, AlertTriangle, FileText, Check,
  Clock, MapPin, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Drawer from '../../components/ui/Drawer';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import apiClient from '../../services/apiClient';
import { formatUsd } from '../../utils/formatters';
import { getVendors, addVendor, deleteVendor } from '../../data/mockOperations';

const CATEGORIES = [
  'All Categories',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Landscaping & Snow',
  'Fire Safety',
  'Janitorial',
  'General Contractor',
];

const CATEGORY_ICONS = {
  Plumbing: { icon: Wrench, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  Electrical: { icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  HVAC: { icon: Wind, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  'Landscaping & Snow': { icon: Sparkles, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  'Fire Safety': { icon: Flame, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  Janitorial: { icon: Store, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  'General Contractor': { icon: Building2, color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

export default function VendorList() {
  const [vendors, setVendors] = useState(() => getVendors());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  useEffect(() => {
    apiClient.get('/operations/vendors').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setVendors(items);
        localStorage.setItem('custom_vendors', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  // Add Vendor Form State
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    category: 'Plumbing',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    paymentTerms: 'Net 30',
    paymentMethod: 'ACH Bank Transfer',
    coiExpiry: '2027-12-31',
    notes: '',
  });

  // Pay Form State
  const [payForm, setPayForm] = useState({
    amount: '1250',
    invoiceRef: 'INV-WO-302',
    date: new Date().toISOString().split('T')[0],
    memo: 'Service repair & valve replacement',
  });

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const matchCat = categoryFilter === 'All Categories' || v.category === categoryFilter;
      const q = (searchTerm || '').toLowerCase();
      const matchSearch =
        !q ||
        (v.name || '').toLowerCase().includes(q) ||
        (v.contactPerson || '').toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q) ||
        (v.phone || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [vendors, categoryFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = vendors.length;
    const coiValid = vendors.filter((v) => v.coiStatus === 'Valid').length;
    const openWos = vendors.reduce((s, v) => s + (v.openWorkOrders || 0), 0);
    const totalSpend = vendors.reduce((s, v) => s + (v.ytdSpend || 0), 0);
    return { total, coiValid, openWos, totalSpend };
  }, [vendors]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contactPerson.trim()) {
      toast.error('Vendor company name and contact person are required.');
      return;
    }
    const updated = addVendor(form);
    setVendors(updated);
    setIsAddOpen(false);
    setForm({
      name: '',
      contactPerson: '',
      category: 'Plumbing',
      phone: '',
      email: '',
      address: '',
      taxId: '',
      paymentTerms: 'Net 30',
      paymentMethod: 'ACH Bank Transfer',
      coiExpiry: '2027-12-31',
      notes: '',
    });
    toast.success(`Vendor ${form.name} added successfully!`);
  };

  const handlePayVendor = (e) => {
    e.preventDefault();
    const payAmt = Number(payForm.amount) || 0;
    if (payAmt <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    // Update vendor YTD spend in local state
    setVendors((prev) =>
      prev.map((v) =>
        v.id === selectedVendor.id ? { ...v, ytdSpend: (v.ytdSpend || 0) + payAmt } : v
      )
    );

    toast.success(`Payment of ${formatUsd(payAmt)} scheduled for ${selectedVendor?.name}!`);
    setIsPayOpen(false);
  };

  const openPayModal = (vendor) => {
    setSelectedVendor(vendor);
    setPayForm({
      amount: '1250',
      invoiceRef: `INV-${vendor.id}-301`,
      date: new Date().toISOString().split('T')[0],
      memo: `${vendor.category} maintenance service`,
    });
    setIsPayOpen(true);
  };

  const openDetailDrawer = (vendor) => {
    setSelectedVendor(vendor);
    setIsDetailOpen(true);
  };

  const confirmDelete = (vendor) => {
    setVendorToDelete(vendor);
    setIsDeleteOpen(true);
  };

  const handleDeleteVendor = () => {
    if (!vendorToDelete) return;
    const updated = deleteVendor(vendorToDelete.id);
    setVendors(updated);
    if (selectedVendor?.id === vendorToDelete.id) {
      setIsDetailOpen(false);
      setSelectedVendor(null);
    }
    toast.success(`Vendor "${vendorToDelete.name}" deleted successfully.`);
    setIsDeleteOpen(false);
    setVendorToDelete(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Vendors & Payees"
        subtitle="Manage building contractors, service providers, insurance verification, and payments."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Vendors & Payees' }]}
        actions={
          <Button icon={Plus} size="sm" onClick={() => setIsAddOpen(true)}>
            Add New Vendor
          </Button>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Vendors"
          value={stats.total}
          subtitle="Registered contractors"
          icon={Store}
          color="indigo"
        />
        <StatCard
          title="Jobs in Progress"
          value={stats.openWos}
          subtitle="Active work orders"
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="Insurance Verified"
          value={`${stats.coiValid} of ${stats.total}`}
          subtitle="Active COI certificates"
          icon={ShieldCheck}
          color="green"
        />
        <StatCard
          title="Total Paid YTD"
          value={formatUsd(stats.totalSpend)}
          subtitle="Total contractor payouts"
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Control Bar: Categories Filter, Search, and Grid/Table Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor name, contact person, trade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-gray-800"
            />
          </div>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const count =
              cat === 'All Categories'
                ? vendors.length
                : vendors.filter((v) => v.category === cat).length;
            const isSelected = categoryFilter === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center space-y-3">
            <Store className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">No vendors found matching your filter.</p>
            <Button size="sm" variant="secondary" onClick={() => { setSearchTerm(''); setCategoryFilter('All Categories'); }}>
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW - Clear, intuitive, modern layout */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((v) => {
            const catStyle = CATEGORY_ICONS[v.category] || {
              icon: Store,
              color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
            };
            const CatIcon = catStyle.icon;
            const isCoiValid = v.coiStatus === 'Valid';

            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-gray-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-5 space-y-4"
              >
                {/* Card Top: Trade Icon + Name + Rating */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${catStyle.color}`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-snug">{v.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-semibold text-gray-500">{v.category}</span>
                          <span className="text-gray-300">·</span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {v.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                        {v.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => confirmDelete(v)}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Vendor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Primary Contact Person & Communication */}
                  <div className="mt-4 p-3 bg-gray-50/80 rounded-xl space-y-2 text-xs border border-gray-100">
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="text-gray-500 font-medium">Contact Person:</span>
                      <strong className="text-gray-900">{v.contactPerson}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                      <a
                        href={`tel:${v.phone}`}
                        className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{v.phone}</span>
                      </a>
                      <a
                        href={`mailto:${v.email}`}
                        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors"
                        title={v.email}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </a>
                    </div>
                  </div>

                  {/* Live Status Indicators */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    {/* Insurance Status */}
                    <div
                      className={`p-2 rounded-xl border flex items-center gap-1.5 font-medium ${
                        isCoiValid
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50/70 border-amber-200 text-amber-800'
                      }`}
                    >
                      {isCoiValid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">
                        {isCoiValid ? 'Insurance OK' : 'Insurance Due'}
                      </span>
                    </div>

                    {/* Active Work Orders */}
                    <div className="p-2 rounded-xl border border-gray-200 bg-white flex items-center gap-1.5 text-gray-700 font-medium">
                      <Wrench className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">
                        {v.openWorkOrders > 0 ? `${v.openWorkOrders} Active Job${v.openWorkOrders > 1 ? 's' : ''}` : 'No active jobs'}
                      </span>
                    </div>
                  </div>

                  {/* Financial Stats */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Paid</span>
                      <strong className="text-gray-900 font-bold text-sm">{formatUsd(v.ytdSpend)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Terms</span>
                      <span className="text-gray-700 font-medium">{v.paymentTerms} · {v.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    icon={DollarSign}
                    onClick={() => openPayModal(v)}
                  >
                    Pay Vendor
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openDetailDrawer(v)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW - Simplified and spacious */
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-5">Vendor &amp; Service</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Insurance (COI)</th>
                  <th className="py-3.5 px-4">Active Jobs</th>
                  <th className="py-3.5 px-4">Payment Terms</th>
                  <th className="py-3.5 px-4">Total Paid</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((v) => {
                  const catStyle = CATEGORY_ICONS[v.category] || {
                    icon: Store,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
                  };
                  const CatIcon = catStyle.icon;
                  const isCoiValid = v.coiStatus === 'Valid';

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Vendor name + icon */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${catStyle.color}`}>
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{v.name}</p>
                            <p className="text-[11px] text-gray-500">{v.category} · ★ {v.rating}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact person */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-800">{v.contactPerson}</p>
                        <p className="text-[11px] text-indigo-600 font-medium">{v.phone}</p>
                      </td>

                      {/* Insurance status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isCoiValid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isCoiValid ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {isCoiValid ? 'Verified' : 'Expiring Soon'}
                        </span>
                      </td>

                      {/* Active Work Orders */}
                      <td className="py-3.5 px-4">
                        {v.openWorkOrders > 0 ? (
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {v.openWorkOrders} active
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">None</span>
                        )}
                      </td>

                      {/* Payment Terms */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-gray-800">{v.paymentTerms}</p>
                        <p className="text-[10px] text-gray-400">{v.paymentMethod}</p>
                      </td>

                      {/* Total Paid */}
                      <td className="py-3.5 px-4 font-bold text-gray-900 text-sm">
                        {formatUsd(v.ytdSpend)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="xs" onClick={() => openPayModal(v)}>
                            Pay
                          </Button>
                          <Button size="xs" variant="secondary" onClick={() => openDetailDrawer(v)}>
                            Details
                          </Button>
                          <button
                            type="button"
                            onClick={() => confirmDelete(v)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────── */}
      {/* 1. PAY VENDOR MODAL                            */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={`Pay Vendor · ${selectedVendor?.name || ''}`}
        size="md"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsPayOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handlePayVendor}>
              Confirm &amp; Send Payment
            </Button>
          </div>
        }
      >
        <form onSubmit={handlePayVendor} className="space-y-4 text-xs">
          {/* Summary Box */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-indigo-950">{selectedVendor?.name}</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                {selectedVendor?.category}
              </span>
            </div>
            <p className="text-indigo-800 text-[11px]">
              Payment Method: <strong>{selectedVendor?.paymentMethod}</strong> · Terms: <strong>{selectedVendor?.paymentTerms}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Amount (USD) *"
              type="number"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              required
            />
            <Input
              label="Disbursement Date"
              type="date"
              value={payForm.date}
              onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
            />
          </div>

          <Input
            label="Invoice / Work Order Reference #"
            placeholder="e.g. INV-WO-302"
            value={payForm.invoiceRef}
            onChange={(e) => setPayForm({ ...payForm, invoiceRef: e.target.value })}
          />

          <Input
            label="Memo / Work Description"
            placeholder="e.g. Emergency plumbing repair at Unit A-101"
            value={payForm.memo}
            onChange={(e) => setPayForm({ ...payForm, memo: e.target.value })}
          />
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* 2. ADD VENDOR MODAL                            */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Vendor / Contractor"
        size="lg"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit}>
              Save Vendor
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Company / Vendor Name *"
              required
              placeholder="e.g. Apex Electrical Services"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Primary Contact Person *"
              required
              placeholder="e.g. David Chen"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Trade / Service Category"
              value={form.category}
              options={['Plumbing', 'Electrical', 'HVAC', 'Landscaping & Snow', 'Fire Safety', 'Janitorial', 'General Contractor', 'Roofing', 'Pest Control']}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="+1 (718) 555-0142"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="service@vendor.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Tax ID / EIN (for 1099 compliance)"
              placeholder="XX-XXXXXXX"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Payment Terms"
              value={form.paymentTerms}
              options={['Net 30', 'Net 15', 'Due on Receipt', 'Bi-Weekly']}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
            />
            <Select
              label="Payment Method"
              value={form.paymentMethod}
              options={['ACH Bank Transfer', 'Check', 'Wire', 'Credit Card']}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Insurance (COI) Expiration Date"
              type="date"
              value={form.coiExpiry}
              onChange={(e) => setForm({ ...form, coiExpiry: e.target.value })}
            />
            <Input
              label="Business Address"
              placeholder="e.g. 142 Atlantic Ave, Brooklyn, NY"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <Input
            label="Internal Notes / Service Scope"
            placeholder="Specialized equipment, emergency dispatch rates, key codes..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* 3. VENDOR DETAILS DRAWER                       */}
      {/* ────────────────────────────────────────────── */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedVendor?.name || 'Vendor Profile'}
      >
        {selectedVendor && (
          <div className="space-y-6 text-xs text-gray-700">
            {/* Header Badge */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">{selectedVendor.name}</span>
                <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {selectedVendor.id}
                </span>
              </div>
              <p className="text-gray-500">{selectedVendor.category} Contractor · Rating ★ {selectedVendor.rating}</p>
              <div className="pt-2 flex flex-wrap gap-2 border-t border-gray-100">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  COI: {selectedVendor.coiStatus} (Exp: {selectedVendor.coiExpiry})
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
                  W-9 Tax Form on File
                </span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
              <p className="font-bold text-gray-900 text-sm">Primary Contact &amp; Location</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Contact Person</span>
                  <span className="font-bold text-gray-900">{selectedVendor.contactPerson}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Phone Number</span>
                  <a href={`tel:${selectedVendor.phone}`} className="font-bold text-indigo-600 hover:underline">
                    {selectedVendor.phone}
                  </a>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Email Address</span>
                  <a href={`mailto:${selectedVendor.email}`} className="font-bold text-gray-900 hover:underline">
                    {selectedVendor.email}
                  </a>
                </div>
                {selectedVendor.address && (
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Business Address</span>
                    <span className="font-medium text-gray-800">{selectedVendor.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial & Compliance */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
              <p className="font-bold text-gray-900 text-sm">Payment &amp; Tax Compliance</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Terms</span>
                  <span className="font-bold text-gray-900">{selectedVendor.paymentTerms}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="font-bold text-gray-900">{selectedVendor.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Tax ID / EIN</span>
                  <span className="font-mono font-bold text-gray-900">{selectedVendor.taxId || 'XX-XXXXXXX'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Paid YTD</span>
                  <span className="font-bold text-emerald-700 text-sm">{formatUsd(selectedVendor.ytdSpend)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedVendor.notes && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                <p className="font-bold text-gray-800">Internal Scope &amp; Notes</p>
                <p className="text-gray-600 leading-relaxed">{selectedVendor.notes}</p>
              </div>
            )}

            {/* Drawer Actions */}
            <div className="pt-2 space-y-2">
              <Button
                className="w-full"
                icon={DollarSign}
                onClick={() => {
                  setIsDetailOpen(false);
                  openPayModal(selectedVendor);
                }}
              >
                Pay This Vendor Now
              </Button>
              <button
                type="button"
                onClick={() => {
                  confirmDelete(selectedVendor);
                }}
                className="w-full py-2.5 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Vendor Profile</span>
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ────────────────────────────────────────────── */}
      {/* 4. DELETE VENDOR CONFIRMATION MODAL            */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Vendor / Payee"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDeleteVendor}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Vendor</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-gray-700">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to delete this vendor?</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                This will permanently remove <strong>{vendorToDelete?.name}</strong> from your active payee directory.
              </p>
            </div>
          </div>

          {vendorToDelete && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Vendor ID</span>
                <strong className="font-mono text-gray-900">{vendorToDelete.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service Category</span>
                <strong className="text-gray-900">{vendorToDelete.category}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Active Work Orders</span>
                <strong className={vendorToDelete.openWorkOrders > 0 ? 'text-amber-600 font-bold' : 'text-gray-700'}>
                  {vendorToDelete.openWorkOrders}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Settled (YTD)</span>
                <strong className="text-gray-900">{formatUsd(vendorToDelete.ytdSpend)}</strong>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
