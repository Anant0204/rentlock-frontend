import { useState, useMemo, useRef, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DoorOpen, Wrench, ClipboardCheck, UserCheck, KeyRound, ShieldAlert,
  FileText, MessageSquare, Plus, Users, Upload, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import CreateWorkOrderModal from '../../components/manager/CreateWorkOrderModal';
import {
  getManagerWorkspaceState,
  getManagerOpenWorkOrders,
  updatePropertyAccessNotes,
  uploadPropertyFile,
} from '../../data/managerWorkspaceData';
import { formatUsd } from '../../utils/formatters';

export default function ManagerPropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateWOOpen, setIsCreateWOOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessDraft, setAccessDraft] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Inspection Report');

  useEffect(() => {
    apiClient.get('/properties?limit=100').catch(() => {});
  }, [id]);

  const property = useMemo(() => {
    return state.properties.find((p) => p.id === id) || state.properties[0];
  }, [state.properties, id]);

  const propertyWorkOrders = useMemo(
    () => state.workOrders.filter((w) => w.propertyId === property?.id),
    [state.workOrders, property?.id]
  );

  const openWOs = useMemo(
    () => getManagerOpenWorkOrders(state, property?.id),
    [state, property?.id]
  );

  const propertyTenants = useMemo(
    () => state.tenants.filter((t) => t.propertyId === property?.id),
    [state.tenants, property?.id]
  );

  if (!property) return null;

  const urgentCount = openWOs.filter((w) => w.priority === 'Urgent').length;
  const dueReqs = (property.requirements || []).filter((r) => r.status !== 'Current');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'units', label: 'Units' },
    { key: 'tenants', label: 'Tenants' },
    { key: 'workOrders', label: 'Work Orders' },
    { key: 'files', label: 'Requirements & Files' },
  ];

  const handleOpenAccessModal = () => {
    setAccessDraft(property.accessInstructions || '');
    setIsAccessModalOpen(true);
  };

  const handleSaveAccess = () => {
    const next = updatePropertyAccessNotes(property.id, accessDraft);
    setState(next);
    setIsAccessModalOpen(false);
    toast.success('Access instructions saved (time-stamped)');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const next = uploadPropertyFile(property.id, file.name, uploadCategory);
    setState(next);
    toast.success(`${file.name} uploaded (time-stamped)`);
    e.target.value = '';
  };

  return (
    <div className="space-y-5 pb-6">
      <ManagerScopeBar
        breadcrumb={`RENTLOCK / ${property.name.toUpperCase()}`}
        properties={state.properties}
        selectedPropertyId={property.id}
        onSelectProperty={(newId) => {
          if (newId) navigate(`/manager/properties/${newId}`);
          else navigate('/manager/properties');
        }}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {property.name} / Overview
        </h1>
      </div>

      {/* Building Header Card + Sub-tabs */}
      <Card padding="p-6" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{property.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {property.address} &nbsp;|&nbsp; {property.type} · {property.totalUnits} units
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success" className="px-3 py-1 font-bold uppercase tracking-wider text-[10px]">
              {property.status}
            </Badge>
            <Button
              variant="secondary"
              icon={Users}
              onClick={() => setActiveTab('tenants')}
            >
              View tenants
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setIsCreateWOOpen(true)}
            >
              New work order
            </Button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex gap-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-[1px] transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'border-[#4A6CF7] text-[#4A6CF7]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="UNITS"
              value={property.totalUnits}
              changeLabel={`${property.occupiedUnits} occupied · ${property.vacantUnits} vacant`}
              icon={DoorOpen}
              color="cyan"
            />
            <StatCard
              title="OPEN WORK ORDERS"
              value={openWOs.length}
              changeLabel={`${urgentCount} urgent`}
              icon={Wrench}
              color="red"
            />
            <StatCard
              title="REQUIREMENTS DUE"
              value={dueReqs.length}
              changeLabel={dueReqs[0]?.title || 'All requirements current'}
              icon={ClipboardCheck}
              color="amber"
            />
            <StatCard
              title="PROPERTY CONTACT"
              value={property.contactName}
              changeLabel={property.contactRole}
              icon={UserCheck}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Units and occupancy */}
            <Card padding="p-6" className="lg:col-span-8">
              <CardHeader
                title="Units and occupancy"
                subtitle="Unit list filtered to this property"
              />
              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="py-3 px-4">UNIT</th>
                      <th className="py-3 px-4">TENANT</th>
                      <th className="py-3 px-4">LEASE / STATUS</th>
                      <th className="py-3 px-4">OPEN ITEM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {(property.units || []).map((u) => (
                      <tr key={u.unit} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{u.unit}</td>
                        <td className="py-3.5 px-4 text-gray-700 font-medium">{u.tenant}</td>
                        <td className="py-3.5 px-4 text-gray-600">{u.leaseStatus}</td>
                        <td className="py-3.5 px-4">
                          {u.openItem !== '—' ? (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                              {u.openItem}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Property operations */}
            <Card padding="p-6" className="lg:col-span-4">
              <CardHeader
                title="Property operations"
                subtitle="Common actions and records"
              />
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleOpenAccessModal}
                  className="w-full text-left p-3.5 rounded-xl bg-gray-50 hover:bg-indigo-50/50 border border-gray-100 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Record access instructions</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Vendor access window and lockbox notes
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className="w-full text-left p-3.5 rounded-xl bg-gray-50 hover:bg-amber-50/50 border border-gray-100 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Review compliance requirements</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Insurance, local inspections, recurring tasks
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className="w-full text-left p-3.5 rounded-xl bg-gray-50 hover:bg-emerald-50/50 border border-gray-100 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Property documents</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lease forms, inspection reports, certificates
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/manager/messages?property=${property.id}`)}
                  className="w-full text-left p-3.5 rounded-xl bg-gray-50 hover:bg-purple-50/50 border border-gray-100 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Building messages</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Notices sent to this building&apos;s tenants
                    </p>
                  </div>
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* UNITS TAB */}
      {activeTab === 'units' && (
        <Card padding="p-6">
          <CardHeader title="All units in building" subtitle={property.address} />
          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">UNIT</th>
                  <th className="py-3 px-4">TENANT</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">LEASE / TURNOVER</th>
                  <th className="py-3 px-4">OPEN ITEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(property.units || []).map((u) => (
                  <tr key={u.unit} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{u.unit}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-700">{u.tenant}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'Occupied' ? 'primary' : 'warning'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{u.leaseStatus}</td>
                    <td className="py-3.5 px-4 text-gray-600">{u.openItem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TENANTS TAB */}
      {activeTab === 'tenants' && (
        <Card padding="p-6">
          <CardHeader
            title={`Tenants · ${property.name}`}
            subtitle="Residents filtered to this assigned building"
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate('/manager/tenants')}>
                Open tenant directory
              </Button>
            }
          />
          {propertyTenants.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No resident records listed for this view.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {propertyTenants.map((t) => (
                <div key={t.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {t.name} <span className="text-xs font-semibold text-indigo-600">· Unit {t.unit}</span>
                    </p>
                    <p className="text-xs text-gray-500">{t.email} · {t.phone}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">Lease: {t.leaseTerm}</span>
                    <Badge variant={t.balance > 0 ? 'warning' : 'success'}>
                      {t.balance > 0 ? `Balance ${formatUsd(t.balance)}` : 'Current'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* WORK ORDERS TAB */}
      {activeTab === 'workOrders' && (
        <Card padding="p-6">
          <CardHeader
            title={`Work Orders · ${property.name}`}
            subtitle="Active and completed maintenance history"
            action={
              <Button size="sm" variant="primary" icon={Plus} onClick={() => setIsCreateWOOpen(true)}>
                New work order
              </Button>
            }
          />
          <div className="divide-y divide-gray-100">
            {propertyWorkOrders.map((wo) => (
              <div
                key={wo.id}
                onClick={() => navigate(`/manager/work-orders?wo=${wo.id}`)}
                className="py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50 rounded-xl px-2 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {wo.id} · {wo.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    Unit {wo.unit} · {wo.tenantName} · {wo.openedAt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={wo.priority === 'Urgent' ? 'danger' : wo.priority === 'High' ? 'warning' : 'default'}>
                    {wo.priority}
                  </Badge>
                  <Badge variant={wo.status === 'Closed' ? 'success' : 'primary'}>{wo.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* REQUIREMENTS & FILES TAB */}
      {activeTab === 'files' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card padding="p-6" className="lg:col-span-6 space-y-4">
            <CardHeader
              title="Compliance requirements"
              subtitle="Insurance, local inspections, recurring tasks"
            />
            <div className="space-y-3">
              {(property.requirements || []).map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{req.title}</p>
                    <p className="text-xs text-gray-500">{req.category} · Due {req.dueDate}</p>
                  </div>
                  <Badge variant={req.status === 'Due Soon' ? 'warning' : 'success'}>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-1">Vendor access & lockbox notes</p>
              <p className="text-xs text-gray-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                {property.accessInstructions}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last updated: {property.accessUpdatedAt}
              </p>
            </div>
          </Card>

          <Card padding="p-6" className="lg:col-span-6 space-y-4">
            <CardHeader
              title="Property documents"
              subtitle="All uploads are automatically time-stamped"
              action={
                <div className="flex items-center gap-2">
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
                  >
                    <option value="Inspection Report">Inspection Report</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Lease Form">Lease Form</option>
                  </select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Upload}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload file
                  </Button>
                </div>
              }
            />
            <div className="divide-y divide-gray-100">
              {(property.files || []).map((f) => (
                <div key={f.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{f.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {f.category} · Uploaded {f.uploadedAt} by {f.uploadedBy}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">PDF</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <Card gradient padding="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          PROPERTY RECORD
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Open one property record to move between units, tenants, requirements, files, and work history without losing building context.
        </p>
      </Card>

      {/* Lockbox & Access Instructions Modal */}
      <Modal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title={`Access instructions · ${property.name}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAccessModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAccess}>
              Save instructions
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Vendor access window and lockbox notes are time-stamped and shared only with assigned personnel.
          </p>
          <textarea
            rows={4}
            value={accessDraft}
            onChange={(e) => setAccessDraft(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
          />
          <p className="text-[11px] text-gray-400">
            Previous update: {property.accessUpdatedAt}
          </p>
        </div>
      </Modal>

      <CreateWorkOrderModal
        isOpen={isCreateWOOpen}
        onClose={() => setIsCreateWOOpen(false)}
        properties={state.properties}
        defaultPropertyId={property.id}
        onCreated={(updated) => setState(updated)}
      />
    </div>
  );
}

