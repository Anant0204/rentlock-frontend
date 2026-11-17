import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Phone, Mail, Building2, ShieldCheck, FileText, CreditCard,
  Wrench, Edit, Archive, AlertCircle, Save, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { getTenants, updateTenant } from '../../data/mockTenants';
import { getLeases } from '../../data/mockLeases';
import { getInvoices } from '../../data/mockInvoices';
import { mockComplaints } from '../../data/mockExtra';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function TenantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenantsList, setTenantsList] = useState(() => getTenants());

  useEffect(() => {
    apiClient.get('/tenants?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setTenantsList(items);
        localStorage.setItem('custom_tenants', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const tenant = tenantsList.find((t) => String(t.id) === String(id)) || tenantsList[0];

  const [activeTab, setActiveTab] = useState('overview');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => ({
    name: tenant?.name || '',
    mobile: tenant?.mobile || '',
    email: tenant?.email || '',
    occupation: tenant?.occupation || '',
    rent: tenant?.rent || 0,
    dueAmount: tenant?.dueAmount || 0,
    status: tenant?.status || 'Active',
    smsOptIn: !!tenant?.smsOptIn,
    notes: tenant?.notes || '',
  }));

  const tenantLeases = useMemo(
    () => getLeases().filter((l) => String(l.tenantId) === String(tenant?.id) || l.tenantName === tenant?.name),
    [tenant]
  );
  const tenantInvoices = useMemo(
    () => getInvoices().filter((i) => String(i.tenantId) === String(tenant?.id) || i.tenantName === tenant?.name),
    [tenant]
  );
  const tenantWorkOrders = useMemo(
    () => mockComplaints.filter((c) => c.tenant === tenant?.name || c.unit === tenant?.unitNumber),
    [tenant]
  );

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Resident record not found.</p>
        <Button className="mt-4" onClick={() => navigate('/tenants')}>Return to Tenants</Button>
      </div>
    );
  }

  const handleUpdate = () => {
    updateTenant(tenant.id, editForm);
    setTenantsList(getTenants());
    setIsEditModalOpen(false);
    toast.success('Resident profile updated.');
  };

  const confirmArchive = () => {
    updateTenant(tenant.id, { status: 'Archived', archived: true });
    setTenantsList(getTenants());
    setIsArchiveModalOpen(false);
    toast.success(`${tenant.name} archived. Ledger & lease history retained.`);
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.propertyName} · Unit ${tenant.unitNumber}`}
        breadcrumbs={[{ label: 'Tenants', path: '/tenants' }, { label: tenant.name }]}
        onBack={() => navigate('/tenants')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Edit} onClick={() => setIsEditModalOpen(true)}>
              Edit Profile
            </Button>
            {tenant.status !== 'Archived' && (
              <Button variant="danger" icon={Archive} onClick={() => setIsArchiveModalOpen(true)}>
                Archive Resident
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Identity Summary */}
        <Card className="p-6 space-y-5 h-fit">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center">
                {(tenant.name || 'Tenant').split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{tenant.name}</h2>
                <p className="text-xs text-gray-500">{tenant.occupation}</p>
              </div>
            </div>
            <Badge status={tenant.status} />
          </div>

          <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" /> {tenant.mobile}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-gray-400" /> {tenant.email}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Building2 className="w-4 h-4 text-gray-400" /> {tenant.propertyName} · {tenant.unitNumber}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MessageSquare className="w-4 h-4 text-gray-400" /> {tenant.smsOptIn ? 'SMS Opt-In Active' : 'Portal / Email Only'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Monthly Rent</span><span className="font-bold text-gray-900">{formatUsd(tenant.rent)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Trust Deposit Held</span><span className="font-bold text-gray-900">{formatUsd(tenant.deposit)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Current Balance</span><span className={`font-bold ${Number(tenant.dueAmount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatUsd(tenant.dueAmount)}</span></div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-600" /> Screening & ID on File</p>
            <p>SSN / Tax Ref: <strong>••••{tenant.ssnLast4 || '4821'}</strong></p>
            <p>Status: <strong>{tenant.screeningStatus || 'Consent Verified · Approved'}</strong></p>
          </div>
        </Card>

        {/* Right Tabs */}
        <Card className="lg:col-span-2 p-6 space-y-5">
          <Tabs
            tabs={[
              { id: 'overview', label: 'Household & Lease' },
              { id: 'invoices', label: `Invoices (${tenantInvoices.length})` },
              { id: 'maintenance', label: `Work Orders (${tenantWorkOrders.length})` },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500">Mailing Address</p>
                  <p className="font-semibold text-gray-900 mt-1">{tenant.address}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500">Emergency Contact</p>
                  <p className="font-semibold text-gray-900 mt-1">{tenant.emergencyContact}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500">Move-In Date</p>
                  <p className="font-semibold text-gray-900 mt-1">{formatDate(tenant.moveInDate)}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500">Lease Expiration</p>
                  <p className="font-semibold text-gray-900 mt-1">{formatDate(tenant.leaseEnd)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Linked Lease Records</h4>
                {tenantLeases.map((lease) => (
                  <div
                    key={lease.id}
                    onClick={() => navigate(`/leases/${lease.id}`)}
                    className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {lease.leaseType || 'Fixed-Term'} · {lease.stateJurisdiction || 'NY'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(lease.startDate)} – {lease.endDate ? formatDate(lease.endDate) : 'Month-to-Month'}
                        </p>
                      </div>
                    </div>
                    <Badge status={lease.status} />
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100 text-xs text-amber-900">
                <strong>Internal Staff Notes (Not visible to tenant):</strong> {tenant.notes || 'None recorded.'}
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-3">
              {tenantInvoices.map((inv) => (
                <div key={inv.id} className="p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{inv.id} · {inv.month}</p>
                      <p className="text-xs text-gray-500">Due {formatDate(inv.dueDate)} · Total {formatUsd(inv.total)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">Bal: {formatUsd(inv.balance)}</span>
                    <Badge status={inv.status} />
                  </div>
                </div>
              ))}
              {tenantInvoices.length === 0 && <p className="text-sm text-gray-500">No invoices posted for this resident.</p>}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-3">
              {tenantWorkOrders.map((wo) => (
                <div key={wo.id} className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{wo.id} · {wo.title}</p>
                      <p className="text-xs text-gray-500">{wo.category} · Assigned: {wo.assignedTo}</p>
                    </div>
                  </div>
                  <Badge status={wo.status} />
                </div>
              ))}
              {tenantWorkOrders.length === 0 && <p className="text-sm text-gray-500">No maintenance work orders found.</p>}
            </div>
          )}
        </Card>
      </div>

      {/* Archive Safeguard Modal */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Resident Record"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmArchive}>Archive Record</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <p className="text-gray-900 font-bold text-base mb-1">Archive "{tenant.name}"?</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              RentLock does not permanently delete residents with linked leases, trust deposits, or invoices. Archiving hides them from active lists while keeping financial audit history intact.
            </p>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Update Resident Profile"
        size="lg"
        footer={<Button onClick={handleUpdate} icon={Save}>Save Changes</Button>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Legal Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="U.S. Phone" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
          <Input label="Email Address" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Input label="Occupation" value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} />
          <Input label="Monthly Rent (USD)" type="number" value={editForm.rent} onChange={(e) => setEditForm({ ...editForm, rent: Number(e.target.value) })} />
          <Select label="Status" value={editForm.status} options={['Active', 'Notice Period', 'Exited', 'Archived']} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
          <div className="md:col-span-2">
            <Input label="Internal Staff Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
