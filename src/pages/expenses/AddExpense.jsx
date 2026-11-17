import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, ArrowRight, Plus, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { getProperties } from '../../data/mockProperties';
import { mockVendors } from '../../data/mockExtra';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { saveExpense } from './mockExpenses';
import { formatUsd } from '../../utils/formatters';

export default function AddExpense() {
  const navigate = useNavigate();
  const properties = useMemo(() => getProperties().filter((p) => !p.archived), []);
  const vendors = mockVendors || [];

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    dueDate: '2026-11-30',
    category: EXPENSE_CATEGORIES[0] || 'Repairs & Maintenance',
    expenseType: 'Operating',
    vendor: vendors[0]?.name || 'QuickFix Plumbing LLC',
    workOrderRef: '',
    description: '',
    amount: '',
    paymentState: 'Unpaid Bill',
    receiptFile: 'Vendor-Invoice-PDF.pdf',
    allocations: [{ propertyName: properties[0]?.name || 'Sunrise Residency', percent: 100 }],
  });

  const allocationSum = useMemo(
    () => form.allocations.reduce((s, a) => s + (Number(a.percent) || 0), 0),
    [form.allocations]
  );

  const addAllocation = () => {
    const remaining = Math.max(0, 100 - allocationSum);
    const nextProp = properties.find((p) => !form.allocations.some((a) => a.propertyName === p.name))?.name || properties[0]?.name;
    setForm((prev) => ({
      ...prev,
      allocations: [...prev.allocations, { propertyName: nextProp, percent: remaining }],
    }));
  };

  const handleSubmit = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid USD amount.');
      return;
    }
    if (Math.round(allocationSum) !== 100) {
      toast.error('Multi-property cost allocations must sum exactly to 100%.');
      return;
    }
    saveExpense({
      date: form.date,
      dueDate: form.dueDate,
      propertyName: form.allocations[0]?.propertyName || 'Sunrise Residency',
      category: form.category,
      expenseType: form.expenseType,
      vendor: form.vendor,
      workOrderRef: form.workOrderRef || null,
      description: form.description || `${form.category} vendor bill`,
      amount: Number(form.amount),
      allocations: form.allocations,
      paymentState: form.paymentState,
      bill: true,
      status: form.paymentState === 'Paid' ? 'Approved' : 'Pending',
    });
    toast.success(`Expense / bill saved (${formatUsd(form.amount)}).`);
    navigate('/expenses');
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Add Expense / Vendor Bill"
        subtitle="5-step U.S. accounts payable entry with Operating vs Capital classification and multi-property percentage split."
        onBack={() => navigate('/expenses')}
        steps={['1. Details', '2. Amount & Allocation', '3. Payment State', '4. Proof PDF', '5. Review']}
        currentStep={step}
      />

      <Card className="max-w-3xl p-6 md:p-8 space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Step 1: Expense Classification & Work Order Link</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Accounting Classification" value={form.expenseType} options={['Operating', 'Capital']} onChange={(e) => setForm({ ...form, expenseType: e.target.value })} />
              <Select label="Category" value={form.category} options={EXPENSE_CATEGORIES} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input label="Vendor / Payee" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              <Input label="Linked Work Order (Optional)" placeholder="e.g. WO-302" value={form.workOrderRef} onChange={(e) => setForm({ ...form, workOrderRef: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Line Item Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe repair scope, utility cycle, or invoice reference..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Step 2: Amount & Multi-Property Split (100%)</h3>
              <Button size="sm" variant="secondary" icon={Plus} onClick={addAllocation}>Split Across Property</Button>
            </div>
            <Input label="Total Bill Amount (USD $) *" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />

            <div className="space-y-2.5">
              {form.allocations.map((al, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="col-span-7">
                    <Select
                      label="Property"
                      value={al.propertyName}
                      options={properties.map((p) => p.name)}
                      onChange={(e) => setForm({
                        ...form,
                        allocations: form.allocations.map((item, i) => (i === idx ? { ...item, propertyName: e.target.value } : item)),
                      })}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      label="Share %"
                      type="number"
                      value={al.percent}
                      onChange={(e) => setForm({
                        ...form,
                        allocations: form.allocations.map((item, i) => (i === idx ? { ...item, percent: Number(e.target.value) } : item)),
                      })}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {form.allocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, allocations: form.allocations.filter((_, i) => i !== idx) })}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <p className={`text-xs font-bold flex items-center gap-1.5 ${Math.round(allocationSum) === 100 ? 'text-emerald-700' : 'text-rose-600'}`}>
                <AlertCircle className="w-4 h-4" /> Current Allocation Total: {allocationSum}% (Must equal 100%)
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Step 3: Accounts Payable Timing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select label="Payment State" value={form.paymentState} options={['Unpaid Bill', 'Paid', 'Partial']} onChange={(e) => setForm({ ...form, paymentState: e.target.value })} />
              <Input label="Invoice Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Step 4: Supporting Invoice PDF / Receipt Evidence</h3>
            <Input
              label="Attached Document Reference"
              value={form.receiptFile}
              onChange={(e) => setForm({ ...form, receiptFile: e.target.value })}
            />
            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-600 text-center">
              Uploaded invoice evidence attaches cleanly to vendor 1099 audit trails and owner expense statements.
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Vendor & Classification</span><span className="font-bold text-gray-900">{form.vendor} · {form.expenseType}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-semibold text-gray-800">{form.category}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment State</span><span className="font-semibold text-gray-800">{form.paymentState} (Due {form.dueDate})</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-black">
              <span>Total Expense</span>
              <span className="text-indigo-700">{formatUsd(form.amount)}</span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-between">
          <Button variant="secondary" icon={ArrowLeft} disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < 5 ? (
            <Button icon={ArrowRight} onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button icon={Save} onClick={handleSubmit}>Submit Expense Bill</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
