import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Building2, Search, Eye, Users,
  CheckCircle2, DollarSign, UserCheck, ShieldCheck, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { getProperties, updateProperty } from '../../data/mockProperties';
import { getManagers } from '../../data/mockExtra';
import { getUserEffectivePermissions } from '../../data/adminPortalStore';
import { formatUsd } from '../../utils/formatters';

export default function OwnerProperties() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState(() => getProperties().filter((p) => !p.archived));
  const [searchTerm, setSearchTerm] = useState('');
  const [managers, setManagers] = useState(() => getManagers().filter((m) => !m.archived));

  useEffect(() => {
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        // Merge backend properties with local custom_properties so newly added local properties are not lost
        const localProps = getProperties().filter((p) => !p.archived);
        const map = new Map();
        localProps.forEach((p) => map.set((p.name || '').toLowerCase(), p));
        items.forEach((p) => map.set((p.name || '').toLowerCase(), { ...map.get((p.name || '').toLowerCase()), ...p }));
        setProperties(Array.from(map.values()));
      }
    }).catch(() => {
      setProperties(getProperties().filter((p) => !p.archived));
    });
  }, []);

  const effectivePerms = useMemo(() => {
    return getUserEffectivePermissions(user || 'owner@rentlock.com');
  }, [user]);

  const canAssignManagers = effectivePerms.canAssignManagers;

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetProperty, setTargetProperty] = useState(null);
  const [selectedManager, setSelectedManager] = useState('');

  const refreshProperties = () => {
    setProperties(getProperties().filter((p) => !p.archived));
  };

  // Determine which properties belong strictly to this owner
  const ownerName = (user?.name || '').trim().toLowerCase();
  const ownerEmail = (user?.email || '').trim().toLowerCase();

  const ownedProperties = useMemo(() => {
    return properties.filter((p) => {
      // 1. Direct owner match by ID
      if (p.ownerId && user?.id && Number(p.ownerId) === Number(user.id)) {
        return true;
      }
      if (p.ownerDetails?.id && user?.id && Number(p.ownerDetails.id) === Number(user.id)) {
        return true;
      }

      // 2. Direct owner match by Name
      if (ownerName) {
        // Check string representation: "simba", "simba (100%)", etc.
        const propOwnerStr = (typeof p.owner === 'string' ? p.owner : (p.owner?.name || '')).toLowerCase();
        if (propOwnerStr && (propOwnerStr === ownerName || propOwnerStr.includes(ownerName))) {
          return true;
        }

        // Check owners array: [{ name: 'simba', ... }]
        if (Array.isArray(p.owners) && p.owners.some((o) => (o.name || '').toLowerCase().includes(ownerName))) {
          return true;
        }

        // Check accessNotes or tags
        if (p.accessNotes && p.accessNotes.toLowerCase().includes(`[owner:${ownerName}`)) {
          return true;
        }
      }

      // 3. Match by owner email
      if (ownerEmail) {
        const propEmail = (p.ownerDetails?.email || (typeof p.owner === 'object' ? p.owner?.email : '') || '').toLowerCase();
        if (propEmail && propEmail === ownerEmail) {
          return true;
        }
      }

      // 4. Custom ownerData property list from login/session
      if (user?.ownerData?.properties && Array.isArray(user.ownerData.properties)) {
        if (user.ownerData.properties.some((pn) => (pn || '').toLowerCase() === (p.name || '').toLowerCase())) {
          return true;
        }
      }
      if (user?.ownerData?.assignedProperty && (p.name || '').toLowerCase() === user.ownerData.assignedProperty.toLowerCase()) {
        return true;
      }

      // 5. Special case: if owner is Claire Bennett, match default demo properties only for Claire
      if (ownerName === 'claire bennett' || ownerEmail === 'owner@rentlock.com') {
        return ['Sunrise Residency', 'Green Valley Villas', 'Metro Business Park'].includes(p.name);
      }

      return false;
    });
  }, [properties, ownerName, ownerEmail, user]);

  const filteredProperties = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ownedProperties;
    return ownedProperties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.manager && p.manager.toLowerCase().includes(q))
    );
  }, [ownedProperties, searchTerm]);

  // Aggregate metrics
  const totalUnits = ownedProperties.reduce((s, p) => s + (p.totalUnits || 0), 0);
  const occupiedUnits = ownedProperties.reduce((s, p) => s + (p.occupiedUnits || 0), 0);
  const occupancyPct = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalMonthlyRevenue = ownedProperties.reduce((s, p) => s + (p.monthlyRevenue || 0), 0);

  const handleOpenAssignModal = (prop) => {
    setTargetProperty(prop);
    setSelectedManager(prop.manager || managers[0]?.name || 'Sarah Jenkins');
    setIsAssignModalOpen(true);
  };

  const handleSaveManagerAssignment = () => {
    if (!targetProperty || !selectedManager) return;
    updateProperty(targetProperty.id, { manager: selectedManager });
    refreshProperties();
    setIsAssignModalOpen(false);
    toast.success(`Manager ${selectedManager} assigned to ${targetProperty.name}!`);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Property Portfolio"
        subtitle={`Real estate assets assigned to your legal ownership account by Platform Admin. (Owner: ${ownerName})`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Properties' },
        ]}
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Assigned by Admin Only
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Owned Properties"
          value={ownedProperties.length}
          change={100}
          changeLabel="In your legal holding portfolio"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Total Units"
          value={totalUnits}
          change={0}
          changeLabel={`${occupiedUnits} occupied · ${totalUnits - occupiedUnits} vacant`}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Portfolio Occupancy"
          value={`${occupancyPct}%`}
          change={3.2}
          changeLabel="Above metro average"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Gross Monthly Revenue"
          value={formatUsd(totalMonthlyRevenue)}
          change={5.4}
          changeLabel="Contractual scheduled rent"
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Property Table Card */}
      <Card padding="p-0">
        <CardHeader
          title="Owned Real Estate Assets"
          subtitle={`${filteredProperties.length} properties in your portfolio`}
        >
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search property name, address, manager..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
            />
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
              <tr>
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Units & Occupancy</th>
                <th className="py-3 px-4">Assigned Manager</th>
                <th className="py-3 px-4">Monthly Revenue</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Building2 className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium text-gray-600">No properties assigned to your account</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Property holdings are assigned strictly by the Platform Admin. Contact management if you are missing an assigned asset.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Property Name */}
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{prop.name}</p>
                          <p className="text-[11px] text-gray-400">{prop.type || 'Residential'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4 text-gray-500">
                      {prop.address}
                    </td>

                    {/* Units & Occupancy */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-900">{prop.occupiedUnits || 0}</span>
                      <span className="text-gray-400"> / {prop.totalUnits} units</span>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                        {prop.totalUnits ? Math.round(((prop.occupiedUnits || 0) / prop.totalUnits) * 100) : 0}% Occupancy
                      </p>
                    </td>

                    {/* Assigned Manager */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 font-semibold text-[11px]">
                          <UserCheck className="w-3 h-3 text-purple-600" />
                          {prop.manager || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Monthly Revenue */}
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatUsd(prop.monthlyRevenue || 0)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={Eye}
                          onClick={() => navigate(`/properties/${prop.id}`)}
                        >
                          Details
                        </Button>
                        {canAssignManagers ? (
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={UserCheck}
                            onClick={() => handleOpenAssignModal(prop)}
                          >
                            Assign Manager
                          </Button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-semibold px-2 py-1 rounded-md bg-gray-100 cursor-not-allowed"
                            title="Manager assignment restricted for your account under Admin RBAC governance."
                          >
                            <Lock className="w-3 h-3 text-gray-400" />
                            Assign Locked
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ASSIGN MANAGER MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Property Manager · ${targetProperty?.name}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleSaveManagerAssignment}>
              Confirm Assignment
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            Select the licensed Property Manager responsible for day-to-day operations, tenant communication, and work order dispatch for <strong>{targetProperty?.name}</strong>:
          </p>

          <Select
            label="Select Property Manager"
            options={managers.map((m) => m.name)}
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            direction="down"
          />

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 space-y-1">
            <p className="font-semibold text-gray-800">Manager Supervision Scope:</p>
            <p>• Tenant inquiries, leasing, and move-in/move-out</p>
            <p>• Maintenance dispatch within discretion threshold ($1,000 cap)</p>
            <p>• Building compliance and periodic vendor visits</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
