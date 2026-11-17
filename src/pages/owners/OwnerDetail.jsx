import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Building2, DollarSign, Wallet, TrendingUp, Landmark, ShieldCheck,
  FileText, Edit2, Archive, ArrowLeft, Mail, Phone, MapPin,
  CheckCircle2, RotateCcw, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { getOwners, updateOwner, archiveOwner } from '../../data/mockExtra';
import { formatUsd } from '../../utils/formatters';

export default function OwnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [owners, setOwners] = useState(() => getOwners());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    apiClient.get('/owners').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setOwners(items);
        localStorage.setItem('custom_owners', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const owner = useMemo(() => {
    return owners.find((o) => String(o.id) === String(id)) || owners[0];
  }, [owners, id]);

  const [editForm, setEditForm] = useState({
    name: owner?.name || '',
    ownerType: owner?.ownerType || 'Individual',
    email: owner?.email || '',
    password: owner?.password || '',
    phone: owner?.phone || '',
    mailingAddress: owner?.mailingAddress || '',
    status: owner?.status || 'Active',
  });

  if (!owner) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Owner record not found.</p>
        <Button icon={ArrowLeft} onClick={() => navigate('/owners')}>Back to Owners</Button>
      </div>
    );
  }

  const handleOpenEdit = () => {
    setEditForm({
      name: owner.name,
      ownerType: owner.ownerType || 'Individual',
      email: owner.email,
      password: owner.password || '',
      phone: owner.phone,
      mailingAddress: owner.mailingAddress,
      status: owner.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    updateOwner(owner.id, {
      ...editForm,
      password: editForm.password ? editForm.password.trim() : (owner.password || 'demo123'),
    });
    setOwners(getOwners());
    setIsEditModalOpen(false);
    toast.success(`Owner ${editForm.name} updated.`);
  };

  const handleToggleArchive = () => {
    const next = !owner.archived;
    archiveOwner(owner.id, next);
    setOwners(getOwners());
    toast.success(next ? `${owner.name} archived.` : `${owner.name} restored.`);
  };

  // Sample historical distributions
  const samplePayouts = [
    { id: 'PAY-1106', period: 'November 2026', date: '11/30/2026', amount: owner.distributionsYtd ? Math.round(owner.distributionsYtd * 0.3) : 14200, status: 'Paid · Confirmed' },
    { id: 'PAY-1031', period: 'October 2026', date: '10/31/2026', amount: owner.distributionsYtd ? Math.round(owner.distributionsYtd * 0.35) : 13800, status: 'Paid · Confirmed' },
    { id: 'PAY-0930', period: 'September 2026', date: '09/30/2026', amount: owner.distributionsYtd ? Math.round(owner.distributionsYtd * 0.35) : 14500, status: 'Paid · Confirmed' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={owner.name}
        subtitle={`${owner.ownerType || 'Entity'} · ${owner.status} · ID #${owner.id}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Owners', path: '/owners' },
          { label: owner.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/owners')}>
              Back to Owners
            </Button>
            <Button variant="secondary" icon={Edit2} onClick={handleOpenEdit}>
              Edit Profile
            </Button>
            <Button
              variant="secondary"
              icon={owner.archived ? RotateCcw : Archive}
              onClick={handleToggleArchive}
              className={owner.archived ? 'text-emerald-700' : 'text-gray-600 hover:text-red-600'}
            >
              {owner.archived ? 'Restore Owner' : 'Archive Owner'}
            </Button>
          </div>
        }
      />

      {/* 4 Ownership-Share KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="OWNED PROPERTIES"
          value={String((owner.properties || []).length)}
          subtitle={`${owner.totalUnits || 0} total portfolio units`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="RENTAL REVENUE SHARE YTD"
          value={formatUsd(owner.totalRevenue || 0)}
          subtitle="Allocated strictly by ownership %"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="ALLOCATED EXPENSES YTD"
          value={formatUsd(owner.totalExpenses || 0)}
          subtitle="Pro-rata verified bills & maintenance"
          icon={Wallet}
          color="amber"
        />
        <StatCard
          title="NET OPERATING SHARE YTD"
          value={formatUsd(owner.netIncome || 0)}
          subtitle={`Distributions YTD: ${formatUsd(owner.distributionsYtd || 0)}`}
          icon={DollarSign}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Properties & Shares */}
          <Card padding="p-0">
            <CardHeader
              title="Linked Properties & Equity Allocation"
              subtitle="Rental income and operating expenses allocated strictly by ownership %"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-3">Units</th>
                    <th className="py-3 px-3">Equity Share</th>
                    <th className="py-3 px-3 text-right">Income Share YTD</th>
                    <th className="py-3 px-4 text-right">Expense Share YTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(owner.allocations || []).map((alloc) => (
                    <tr key={alloc.propertyName} className="hover:bg-gray-50">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {alloc.propertyName}
                      </td>
                      <td className="py-3.5 px-3 text-gray-600">{alloc.units} units</td>
                      <td className="py-3.5 px-3">
                        <Badge variant="info">{alloc.share}%</Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-emerald-700">
                        {formatUsd(alloc.ytdIncomeShare)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {formatUsd(alloc.ytdExpenseShare)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Distribution History */}
          <Card padding="p-0">
            <CardHeader
              title="Settled Distribution History"
              subtitle="Audited disbursement transfers to owner's banking destination"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                    <th className="py-3 px-4">Payout ID</th>
                    <th className="py-3 px-3">Period</th>
                    <th className="py-3 px-3">Settlement Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {samplePayouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono font-bold text-xs text-gray-900">{p.id}</td>
                      <td className="py-3 px-3 text-gray-700">{p.period}</td>
                      <td className="py-3 px-3 text-gray-600">{p.date}</td>
                      <td className="py-3 px-3">
                        <Badge status="Paid">{p.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {formatUsd(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col wide) */}
        <div className="space-y-6">
          {/* Owner Account & Login Credentials Card */}
          <Card>
            <CardHeader
              title="Owner Account & Login"
              subtitle="Portal credentials & access status"
            />
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <p className="text-gray-500">Legal Entity Type</p>
                <p className="text-sm font-bold text-gray-900">{owner.ownerType || 'Individual'}</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Portal Login Email (ID)</span>
                </div>
                <p className="text-sm font-mono font-bold text-indigo-950">{owner.email}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Login Password</span>
                  </div>
                  <p className="text-sm font-mono font-bold text-emerald-950 mt-0.5">
                    {owner.password ? '••••••••' : 'demo123'}
                  </p>
                </div>
                <Button size="sm" variant="secondary" icon={Edit2} onClick={handleOpenEdit}>
                  Edit Password
                </Button>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="font-bold text-gray-700">Registered Contact Info</p>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{owner.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{owner.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>{owner.mailingAddress}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Governance Notice */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Owner Portal Scoping</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              When this owner logs in via the Owner Portal using their email ({owner.email}), they can only inspect their owned property accounts, cash position, vendor bills, and distribution advice. Tenant personal contacts and other owners&apos; properties are hidden.
            </p>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Owner · ${owner.name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={handleSaveEdit}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input label="Legal Name *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Select label="Owner Entity Type" options={['Individual', 'LLC', 'Trust', 'Corporation']} value={editForm.ownerType} onChange={(e) => setEditForm({ ...editForm, ownerType: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input label="Contact Email (Login ID) *" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Phone Number" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
          <Input label="U.S. Mailing Address" value={editForm.mailingAddress} onChange={(e) => setEditForm({ ...editForm, mailingAddress: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-2">
              <Input
                label="Owner Login Password"
                type="text"
                placeholder="Leave blank to keep existing, or type new password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                helperText="Admin can change or reset the password for this owner."
              />
            </div>
            <div>
              <Select label="Account Status" options={['Active', 'Pending Setup']} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

