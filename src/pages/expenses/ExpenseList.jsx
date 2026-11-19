import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Wallet, CheckCircle2, Clock, AlertCircle, Eye, Ban, BarChart3, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import Select from '../../components/ui/Select';
import apiClient from '../../services/apiClient';
import { getExpenses, updateExpense, voidExpense } from './mockExpenses';
import { getProperties } from '../../data/mockProperties';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function ExpenseList() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState(() => getExpenses());
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    apiClient.get('/expenses?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        const local = getExpenses();
        const mergedMap = new Map();
        items.forEach((item) => mergedMap.set(String(item.id), item));
        local.forEach((item) => {
          if (!mergedMap.has(String(item.id))) {
            mergedMap.set(String(item.id), item);
          } else {
            const server = mergedMap.get(String(item.id));
            mergedMap.set(String(item.id), { ...item, ...server });
          }
        });
        const merged = Array.from(mergedMap.values());
        setExpenses(merged);
        localStorage.setItem('custom_expenses_us', JSON.stringify(merged));
      }
    }).catch(() => {});
  }, []);

  const properties = useMemo(() => getProperties().filter((p) => !p.archived), []);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const catOk = categoryFilter === 'All' || e.category === categoryFilter;
      const propOk = propertyFilter === 'All' || e.propertyName === propertyFilter;
      const payOk = paymentFilter === 'All' || e.paymentState === paymentFilter;
      return catOk && propOk && payOk;
    });
  }, [expenses, categoryFilter, propertyFilter, paymentFilter]);

  const stats = useMemo(() => {
    const active = expenses.filter((e) => e.status !== 'Voided');
    const total = active.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const paid = active.filter((e) => e.paymentState === 'Paid').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const unpaid = active.filter((e) => e.paymentState === 'Unpaid Bill' || e.paymentState === 'Partial').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const awaitingApproval = active.filter((e) => e.status === 'Pending').length;
    return { total, paid, unpaid, awaitingApproval };
  }, [expenses]);

  const handleApproveAndPay = (exp) => {
    updateExpense(exp.id, { status: 'Approved', paymentState: 'Paid' });
    setExpenses(getExpenses());
    setSelectedExpense(null);
    toast.success(`Approved & marked Paid: ${exp.vendor} (${formatUsd(exp.amount)}).`);
  };

  const handleVoid = (exp) => {
    voidExpense(exp.id, 'Voided by Admin');
    setExpenses(getExpenses());
    setSelectedExpense(null);
    toast.success('Expense bill voided in immutable AP ledger.');
  };

  const columns = [
    { key: 'date', label: 'Bill Date', render: (_, row) => <span className="text-xs text-gray-600">{formatDate(row.date)}</span> },
    {
      key: 'vendor',
      label: 'Vendor & Description',
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-900">{row.vendor || row.vendorName || 'In-House Staff'}</p>
          <p className="text-xs text-gray-500 truncate max-w-[230px]">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'propertyName',
      label: 'Property & Class',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-gray-800">{row.propertyName || row.property?.name || 'General Portfolio'}</p>
          <p className="text-[11px] text-indigo-600 font-bold">{row.expenseType || 'Operating'} · {row.category}</p>
        </div>
      ),
    },
    { key: 'amount', label: 'Amount (USD)', render: (_, row) => <span className="font-bold text-gray-900">{formatUsd(row.amount)}</span> },
    { key: 'paymentState', label: 'AP State', render: (_, row) => <Badge status={row.paymentState === 'Unpaid Bill' ? 'Pending' : (row.paymentState || (row.isPaid ? 'Paid' : 'Pending'))} /> },
    { key: 'status', label: 'Approval', render: (_, row) => <Badge status={row.status || (row.isPaid ? 'Approved' : 'Pending')} /> },
  ];

  const reportShortcuts = [
    { label: 'Owner Statement', desc: 'Net owner payout by allocation' },
    { label: 'Property P&L', desc: 'NOI operating vs capital split' },
    { label: '1099 Tax Prep', desc: 'Paid U.S. vendor totals' },
    { label: 'Cash Flow Report', desc: 'Disbursements by due date' },
    { label: 'Budget vs Actual', desc: 'Category variance alerts' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Expenses & Accounts Payable"
        subtitle="Track U.S. operating and capital vendor bills, multi-property allocations, approvals, and 1099/NOI categorization."
        breadcrumbs={[{ label: 'Finance' }, { label: 'Expenses & Bills' }]}
        actions={
          <Button icon={Plus} onClick={() => navigate('/expenses/add')}>
            Add Expense / Bill
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Expenses This Month" value={formatUsd(stats.total)} subtitle="Non-voided Operating & Capital" icon={Wallet} color="blue" />
        <StatCard title="Paid" value={formatUsd(stats.paid)} subtitle="Disbursed to vendors" icon={CheckCircle2} color="green" />
        <StatCard title="Unpaid Bills (AP)" value={formatUsd(stats.unpaid)} subtitle="Scheduled payables due" icon={Clock} color="amber" />
        <StatCard title="Awaiting Approval" value={stats.awaitingApproval} subtitle="Requires Admin / Cap review" icon={AlertCircle} color="red" />
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h3 className="text-base font-bold text-gray-900">Vendor Bills & Property Allocations</h3>
          <div className="flex flex-wrap gap-3">
            <Select value={propertyFilter} options={['All', ...properties.map((p) => p.name)]} onChange={(e) => setPropertyFilter(e.target.value)} />
            <Select value={categoryFilter} options={['All', ...EXPENSE_CATEGORIES]} onChange={(e) => setCategoryFilter(e.target.value)} />
            <Select value={paymentFilter} options={['All', 'Paid', 'Unpaid Bill', 'Partial', 'Voided']} onChange={(e) => setPaymentFilter(e.target.value)} />
          </div>
        </div>

        <Table
          columns={columns}
          data={filtered}
          onRowClick={(row) => setSelectedExpense(row)}
          actions={(row) => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedExpense(row);
              }}
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
              title="Review Bill"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        />

        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950">
          <strong>AP & NOI Guide:</strong> Operating expenses reduce Net Operating Income (NOI); Capital Improvements feed asset basis instead of monthly NOI. Shared utility or vendor bills can split across multiple properties summing strictly to 100%.
        </div>
      </Card>

      {/* Bottom 5 Report Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportShortcuts.map((rep) => (
          <div
            key={rep.label}
            onClick={() => navigate('/reports')}
            className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-indigo-400 cursor-pointer transition-all flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{rep.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{rep.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Drawer
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        title={`Vendor Bill Details`}
      >
        {selectedExpense && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-base text-gray-900">{selectedExpense.vendor}</p>
                  <p className="text-gray-500">{selectedExpense.category} · {selectedExpense.expenseType || 'Operating'}</p>
                </div>
                <Badge status={selectedExpense.status} />
              </div>
              <p className="text-gray-700 pt-2">{selectedExpense.description}</p>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div><p className="text-gray-400">Amount</p><p className="font-black text-gray-900 text-base">{formatUsd(selectedExpense.amount)}</p></div>
                <div><p className="text-gray-400">Due Date</p><p className="font-bold text-gray-800">{formatDate(selectedExpense.dueDate || selectedExpense.date)}</p></div>
                <div><p className="text-gray-400">AP Payment</p><p className="font-bold text-gray-800">{selectedExpense.paymentState}</p></div>
                <div><p className="text-gray-400">Linked Work Order</p><p className="font-bold text-indigo-700">{selectedExpense.workOrderRef || 'None'}</p></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-gray-500">Property Cost Allocation</h4>
              {(selectedExpense.allocations || [{ propertyName: selectedExpense.propertyName, percent: 100 }]).map((al, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                  <span className="font-semibold text-gray-800">{al.propertyName} ({al.percent}%)</span>
                  <span className="font-bold text-gray-900">{formatUsd((Number(selectedExpense.amount) * al.percent) / 100)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {selectedExpense.status !== 'Voided' && (
                <>
                  <Button icon={CheckCircle2} onClick={() => handleApproveAndPay(selectedExpense)}>
                    Approve & Mark Paid
                  </Button>
                  <Button variant="danger" icon={Ban} onClick={() => handleVoid(selectedExpense)}>
                    Void Bill
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
