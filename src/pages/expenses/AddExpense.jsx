import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, ArrowLeft, DollarSign, Building2, Calendar, FileText,
  Receipt, Plus, Trash2, AlertCircle, CheckCircle2, Tag, Layers,
  Wallet, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import apiClient from '../../services/apiClient';
import { getProperties } from '../../data/mockProperties';
import { getVendors } from '../../data/mockOperations';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { saveExpense } from './mockExpenses';
import { formatUsd } from '../../utils/formatters';

export default function AddExpense() {
  const navigate = useNavigate();

  // Active Properties & Vendors
  const [properties, setProperties] = useState(() => {
    return getProperties().filter((p) => !p.archived);
  });
  const [vendors, setVendors] = useState(() => getVendors());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enableSplit, setEnableSplit] = useState(false);

  // Form State - All fields start empty with clean placeholders
  const [form, setForm] = useState({
    propertyId: '',
    propertyName: '',
    category: '',
    expenseType: 'Operating',
    vendor: '',
    vendorId: undefined,
    workOrderRef: '',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    paymentState: 'Unpaid Bill',
    receiptFile: '',
    allocations: [],
  });

  // Fetch live properties & vendors from backend on mount
  useEffect(() => {
    // 1. Fetch live properties
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        const active = items.filter((p) => !p.archived);
        if (active.length > 0) {
          setProperties(active);
          try {
            localStorage.setItem('custom_properties', JSON.stringify(active));
          } catch {}
        }
      }
    }).catch(() => {});

    // 2. Fetch live vendors
    apiClient.get('/operations/vendors').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setVendors(items);
        try {
          localStorage.setItem('pm_vendors', JSON.stringify(items));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Multi-Property Allocation calculations (if split is enabled)
  const allocationSum = useMemo(() => {
    if (!enableSplit) return 100;
    return form.allocations.reduce((s, a) => s + (Number(a.percent) || 0), 0);
  }, [enableSplit, form.allocations]);

  const handleToggleSplit = (checked) => {
    setEnableSplit(checked);
    if (checked && form.allocations.length === 0) {
      const primaryProp = form.propertyName || properties[0]?.name || 'General Portfolio';
      setForm((prev) => ({
        ...prev,
        allocations: [{ propertyName: primaryProp, percent: 100 }],
      }));
    }
  };

  const addAllocationRow = () => {
    const remaining = Math.max(0, 100 - allocationSum);
    const unusedProp = properties.find((p) => !form.allocations.some((a) => a.propertyName === p.name))?.name || properties[0]?.name;
    setForm((prev) => ({
      ...prev,
      allocations: [...prev.allocations, { propertyName: unusedProp, percent: remaining }],
    }));
  };

  const handlePropertyChange = (selectedPropId) => {
    const matched = properties.find((p) => String(p.id) === String(selectedPropId));
    const propName = matched ? matched.name : '';
    setForm((prev) => ({
      ...prev,
      propertyId: selectedPropId,
      propertyName: propName,
      allocations: enableSplit && prev.allocations.length > 0
        ? prev.allocations.map((a, i) => (i === 0 ? { ...a, propertyName: propName } : a))
        : [{ propertyName: propName, percent: 100 }],
    }));
  };

  const handleVendorChange = (vendorVal) => {
    const matched = vendors.find(
      (v) => (v.name || '').toLowerCase() === (vendorVal || '').trim().toLowerCase()
    );
    setForm((prev) => ({
      ...prev,
      vendor: vendorVal,
      vendorId: matched?.id || matched?.dbId || undefined,
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validations
    if (!form.propertyId) {
      toast.error('Please select an assigned property.');
      return;
    }
    if (!form.category) {
      toast.error('Please select an expense category.');
      return;
    }
    if (!form.vendor.trim()) {
      toast.error('Please enter or select a vendor / payee.');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0 || isNaN(Number(form.amount))) {
      toast.error('Please enter a valid bill amount greater than $0.');
      return;
    }
    if (enableSplit && Math.round(allocationSum) !== 100) {
      toast.error('Multi-property cost allocation shares must total exactly 100%.');
      return;
    }

    const resolvedProp = properties.find((p) => String(p.id) === String(form.propertyId));
    const resolvedPropertyName = resolvedProp?.name || form.propertyName || 'General Portfolio';
    const numAmount = Number(form.amount);

    const expensePayload = {
      propertyId: resolvedProp ? Number(resolvedProp.id) : Number(form.propertyId),
      propertyName: resolvedPropertyName,
      vendor: form.vendor.trim(),
      vendorId: form.vendorId ? Number(form.vendorId) : undefined,
      category: form.category,
      expenseType: form.expenseType || 'Operating',
      description: form.description.trim() || `${form.category} - ${form.vendor.trim()}`,
      amount: numAmount,
      date: form.date || new Date().toISOString().slice(0, 10),
      dueDate: form.dueDate || '',
      paymentState: form.paymentState || 'Unpaid Bill',
      isPaid: form.paymentState === 'Paid',
      status: form.paymentState === 'Paid' ? 'Approved' : 'Pending',
      workOrderRef: form.workOrderRef.trim() || null,
      receiptFile: form.receiptFile.trim() || null,
      allocations: enableSplit && form.allocations.length > 0
        ? form.allocations
        : [{ propertyName: resolvedPropertyName, percent: 100 }],
      bill: true,
    };

    setIsSubmitting(true);
    try {
      await saveExpense(expensePayload);
      toast.success(`Expense bill of ${formatUsd(numAmount)} recorded successfully!`);
      navigate('/expenses');
    } catch (err) {
      console.error('Save expense failed:', err);
      toast.error('Failed to record expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header without multi-step wizard */}
      <PageHeader
        title="Add Expense / Vendor Bill"
        subtitle="Record operating and capital vendor bills, utility payables, and property disbursements."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Expenses & AP', path: '/expenses' },
          { label: 'Add Bill' },
        ]}
        actions={
          <Button variant="secondary" icon={ArrowLeft} size="sm" onClick={() => navigate('/expenses')}>
            Back to Expenses
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* SECTION 1: PROPERTY & VENDOR CLASSIFICATION */}
        <Card className="p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">1. Property & Expense Classification</h2>
              <p className="text-xs text-gray-500">Select the target property, vendor, and accounting category.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Property Selector */}
            <Select
              label="Assigned Property *"
              required
              placeholder="Select Property..."
              value={form.propertyId ? String(form.propertyId) : ''}
              options={properties.map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
              onChange={(e) => handlePropertyChange(e.target.value)}
            />

            {/* Expense Category */}
            <Select
              label="Category *"
              required
              placeholder="Select Category..."
              value={form.category}
              options={EXPENSE_CATEGORIES}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vendor / Payee Input with suggestions datalist */}
            <div className="md:col-span-2">
              <Input
                label="Vendor / Payee *"
                required
                placeholder="e.g. QuickFix Plumbing LLC or ConEdison"
                list="vendor-options"
                value={form.vendor}
                onChange={(e) => handleVendorChange(e.target.value)}
              />
              <datalist id="vendor-options">
                {vendors.map((v, idx) => (
                  <option key={idx} value={v.name}>
                    {v.category ? `${v.category}` : ''}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Accounting Classification */}
            <Select
              label="Accounting Classification"
              value={form.expenseType}
              options={['Operating', 'Capital']}
              onChange={(e) => setForm({ ...form, expenseType: e.target.value })}
            />
          </div>

          {/* Linked Work Order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Linked Work Order (Optional)"
              placeholder="e.g. WO-302"
              value={form.workOrderRef}
              onChange={(e) => setForm({ ...form, workOrderRef: e.target.value })}
            />
            <Input
              label="Invoice / Bill Ref # (Optional)"
              placeholder="e.g. INV-9021-B"
              value={form.receiptFile}
              onChange={(e) => setForm({ ...form, receiptFile: e.target.value })}
            />
          </div>
        </Card>

        {/* SECTION 2: BILL AMOUNT & PAYMENT TIMING */}
        <Card className="p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">2. Bill Amount & Payment Schedule</h2>
              <p className="text-xs text-gray-500">Enter payable total, invoice date, due date, and payment status.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1">
              <Input
                label="Total Bill Amount (USD $) *"
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {form.amount && Number(form.amount) > 0 && (
                <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Total Payable: {formatUsd(form.amount)}
                </p>
              )}
            </div>

            {/* Payment Status */}
            <Select
              label="Payment Status"
              value={form.paymentState}
              options={['Unpaid Bill', 'Paid', 'Partial']}
              onChange={(e) => setForm({ ...form, paymentState: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Date */}
            <Input
              label="Bill / Invoice Date *"
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            {/* Due Date */}
            <Input
              label="Payment Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </Card>

        {/* SECTION 3: DESCRIPTION / MEMO */}
        <Card className="p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">3. Line Item Description & Notes</h2>
              <p className="text-xs text-gray-500">Provide details for owner statements, audit trails, and 1099 reporting.</p>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
              Line Item Description *
            </label>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe repair scope, utility cycle, invoice reference or bill memo..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-400 hover:border-gray-300"
            />
          </div>

          {/* Optional Multi-Property Split Toggle */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableSplit}
                onChange={(e) => handleToggleSplit(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span>Split this bill across multiple properties (Optional cost allocation)</span>
            </label>

            {enableSplit && (
              <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">Property Allocation Shares</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={addAllocationRow}
                  >
                    Add Property Split
                  </Button>
                </div>

                <div className="space-y-2">
                  {form.allocations.map((al, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200">
                      <div className="col-span-7">
                        <Select
                          placeholder="Select property..."
                          value={al.propertyName}
                          options={properties.map((p) => p.name)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              allocations: prev.allocations.map((item, i) => (i === idx ? { ...item, propertyName: val } : item)),
                            }));
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          type="number"
                          placeholder="Share %"
                          value={al.percent}
                          onChange={(e) => {
                            const num = Number(e.target.value);
                            setForm((prev) => ({
                              ...prev,
                              allocations: prev.allocations.map((item, i) => (i === idx ? { ...item, percent: num } : item)),
                            }));
                          }}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {form.allocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                allocations: prev.allocations.filter((_, i) => i !== idx),
                              }));
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <p className={`text-xs font-bold flex items-center gap-1.5 ${Math.round(allocationSum) === 100 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  <AlertCircle className="w-4 h-4" /> Current Allocation Total: {allocationSum}% (Must equal 100%)
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* LIVE BILL SUMMARY & SUBMIT ACTIONS */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bill Summary:</span>
              <span className="text-xs font-semibold text-indigo-900">
                {form.vendor || 'No Vendor'} · {form.propertyName || 'No Property'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span>Category: <strong className="text-gray-900">{form.category || '—'}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-gray-900">{form.paymentState}</strong></span>
              {form.dueDate && (
                <>
                  <span>•</span>
                  <span>Due: <strong className="text-gray-900">{form.dueDate}</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:justify-end">
            <div className="text-right pr-2">
              <p className="text-[10px] uppercase font-bold text-gray-500">Total Payable</p>
              <p className="text-xl font-black text-indigo-700">
                {form.amount && Number(form.amount) > 0 ? formatUsd(form.amount) : '$0.00'}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/expenses')}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              icon={Save}
              loading={isSubmitting}
            >
              Save Expense / Bill
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
