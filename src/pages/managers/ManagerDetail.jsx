import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Briefcase, Building2, Wrench, DollarSign, ShieldCheck,
  Edit2, Archive, ArrowLeft, Mail, Phone, Clock,
  CheckCircle2, RotateCcw, KeyRound, Users, Trash2, AlertTriangle
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
import { getManagers, updateManager, archiveManager, deleteManager } from '../../data/mockExtra';
import { getProperties } from '../../data/mockProperties';
import { mockComplaints } from '../../data/mockExtra';
import { formatUsd } from '../../utils/formatters';

export default function ManagerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [managers, setManagers] = useState(() => getManagers());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    apiClient.get('/managers').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setManagers(items);
        localStorage.setItem('custom_managers', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const allProperties = useMemo(() => getProperties().filter((p) => !p.archived), []);

  const manager = useMemo(() => {
    return managers.find((m) => String(m.id) === String(id)) || managers[0];
  }, [managers, id]);

  const [editForm, setEditForm] = useState({
    name: manager?.name || '',
    email: manager?.email || '',
    password: manager?.password || '',
    phone: manager?.phone || '',
    spendingCap: manager?.spendingCap || 1000,
    employmentType: manager?.employmentType || 'Full-Time',
    shift: manager?.shift || 'Day (8 AM–5 PM)',
    status: manager?.status || 'Active',
    assignedProperties: manager?.properties || [],
  });

  if (!manager) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Manager record not found.</p>
        <Button icon={ArrowLeft} onClick={() => navigate('/managers')}>
          Back to Managers
        </Button>
      </div>
    );
  }

  const propNames = (manager.properties || []).map((p) =>
    typeof p === 'object' && p !== null ? p.name : String(p)
  );

  // Find managed properties objects
  const assignedPropsData = allProperties.filter((p) =>
    propNames.includes(p.name)
  );

  const totalManagedUnits = assignedPropsData.reduce((s, p) => s + (p.totalUnits || 0), 0);
  const totalOccupiedUnits = assignedPropsData.reduce((s, p) => s + (p.occupiedUnits || 0), 0);

  // Find work orders for this manager's properties
  const assignedWorkOrders = mockComplaints.filter((wo) =>
    propNames.includes(wo.propertyName)
  );

  const handleOpenEdit = () => {
    setEditForm({
      name: manager.name,
      email: manager.email,
      password: manager.password || '',
      phone: manager.phone,
      spendingCap: manager.spendingCap || 1000,
      employmentType: manager.employmentType || 'Full-Time',
      shift: manager.shift || 'Day (8 AM–5 PM)',
      status: manager.status,
      assignedProperties: manager.properties || [],
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    updateManager(manager.id, {
      ...editForm,
      spendingCap: Number(editForm.spendingCap) || 1000,
      password: editForm.password ? editForm.password.trim() : (manager.password || 'demo123'),
      properties: editForm.assignedProperties,
    });
    setManagers(getManagers());
    setIsEditModalOpen(false);
    toast.success(`Manager ${editForm.name} updated.`);
  };

  const handleToggleArchive = () => {
    const next = !manager.archived;
    archiveManager(manager.id, next);
    setManagers(getManagers());
    toast.success(next ? `${manager.name} deactivated.` : `${manager.name} reactivated.`);
  };

  const handleDeleteManager = async () => {
    try {
      setIsDeleting(true);
      await deleteManager(manager.id, manager.email);
      toast.success(`Manager ${manager.name} deleted successfully.`);
      navigate('/managers');
    } catch (err) {
      toast.error('Failed to delete manager: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={manager.name}
        subtitle="Property Manager Profile & Supervisory Portfolio"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Managers', path: '/managers' },
          { label: manager.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              size="sm"
              onClick={() => navigate('/managers')}
            >
              Back to List
            </Button>
            <Button
              variant="secondary"
              icon={Edit2}
              size="sm"
              onClick={handleOpenEdit}
            >
              Edit Profile
            </Button>
            <Button
              variant="secondary"
              icon={manager.archived ? RotateCcw : Archive}
              size="sm"
              onClick={handleToggleArchive}
            >
              {manager.archived ? 'Reactivate' : 'Deactivate'}
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Hero Overview Card */}
      <Card padding="p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={manager.name} size="xl" />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{manager.name}</h2>
                {manager.archived || manager.status === 'Deactivated' ? (
                  <Badge variant="danger">Deactivated</Badge>
                ) : (
                  <Badge variant="success">Active Manager</Badge>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <KeyRound className="w-3 h-3 text-emerald-600" />
                  Password Configured
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {manager.employmentType || 'Full-Time'} · Licensed Property Manager · {manager.shift || 'Day (8 AM–5 PM)'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {manager.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {manager.phone || '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950 space-y-1 min-w-[240px]">
            <p className="font-bold text-indigo-900">Governance & Approval Cap</p>
            <p className="text-lg font-black text-indigo-700">
              {formatUsd(manager.spendingCap || 1000)}
            </p>
            <p className="text-[11px] text-indigo-600/80">
              Work orders up to this cap can be approved without Admin review.
            </p>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Buildings"
          value={manager.properties?.length || 0}
          change={0}
          changeLabel="Under active management"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Supervised Units"
          value={`${totalOccupiedUnits} / ${totalManagedUnits}`}
          change={totalManagedUnits ? Math.round((totalOccupiedUnits / totalManagedUnits) * 100) : 0}
          changeLabel="Occupancy across assigned sites"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Active Work Orders"
          value={assignedWorkOrders.length}
          change={-1}
          changeLabel="Tickets pending supervision"
          icon={Wrench}
          color="green"
        />
        <StatCard
          title="Spending Cap"
          value={formatUsd(manager.spendingCap || 1000)}
          change={0}
          changeLabel="Discretion threshold per order"
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Assigned Properties Section */}
      <Card padding="p-0">
        <CardHeader
          title="Assigned Building Portfolio"
          subtitle="Properties this manager has operational authority over"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
              <tr>
                <th className="py-3 px-4">Property Name</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Total Units</th>
                <th className="py-3 px-4">Occupancy</th>
                <th className="py-3 px-4">Monthly Revenue</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {assignedPropsData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No properties currently assigned to this manager.
                  </td>
                </tr>
              ) : (
                assignedPropsData.map((prop) => (
                  <tr key={prop.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>{prop.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">{prop.address}</td>
                    <td className="py-3.5 px-4 font-semibold">{prop.totalUnits} units</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-emerald-600">
                        {prop.totalUnits ? Math.round((prop.occupiedUnits / prop.totalUnits) * 100) : 0}%
                      </span>
                      <span className="text-gray-400 text-[10px] ml-1">
                        ({prop.occupiedUnits}/{prop.totalUnits})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatUsd(prop.monthlyRevenue || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => navigate(`/properties/${prop.id}`)}
                      >
                        View Property
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Active Work Orders Supervised */}
      <Card padding="p-0">
        <CardHeader
          title="Active Work Orders Supervised"
          subtitle="Maintenance requests requiring manager dispatch, vendor quote review, or approval"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Property & Unit</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Estimated Cost</th>
                <th className="py-3 px-4">Cap Status</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {assignedWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No active work orders for this manager&apos;s properties.
                  </td>
                </tr>
              ) : (
                assignedWorkOrders.map((wo) => {
                  const exceedsCap = wo.cost > (manager.spendingCap || 1000);
                  return (
                    <tr key={wo.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-indigo-600">{wo.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {wo.propertyName} · {wo.unitNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {wo.title} — {wo.description}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{formatUsd(wo.cost)}</td>
                      <td className="py-3 px-4">
                        {exceedsCap ? (
                          <Badge variant="danger" size="sm">
                            Exceeds ${manager.spendingCap || 1000} Cap
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Within Manager Cap
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="primary" size="sm">{wo.status}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Manager Profile · ${manager.name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Manager Full Name *"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Input
              label="Primary Email (Login ID) *"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Reset Manager Password"
              type="text"
              placeholder="Leave blank to keep existing"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              helperText="Set a new login password for this manager."
            />
            <Input
              label="Phone Number"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <Select
                label="Spending Approval Cap"
                options={['$500', '$1000', '$1500', '$2500', '$5000']}
                value={`$${editForm.spendingCap}`}
                onChange={(e) => setEditForm({ ...editForm, spendingCap: Number(e.target.value.replace('$', '')) || 1000 })}
              />
            </div>
            <div>
              <Select
                label="Employment Type"
                options={['Full-Time', 'Part-Time', 'Contract']}
                value={editForm.employmentType}
                onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Account Status"
                options={['Active', 'On Leave']}
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Property Manager"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDeleteManager} loading={isDeleting}>
              Delete Manager
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-xs text-gray-600">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              Permanently delete {manager.name}?
            </p>
            <p className="mt-1 text-gray-500 leading-relaxed">
              This action will permanently delete this manager's account from the database and dissociate them from any managed properties. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

