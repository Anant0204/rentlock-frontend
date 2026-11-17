import { useState, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
  Users, Search, Building2, DoorOpen, DollarSign,
  CheckCircle2, AlertCircle, Phone, Mail, ShieldAlert
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { getUserEffectivePermissions } from '../../data/adminPortalStore';
import { getTenants } from '../../data/mockTenants';
import { getProperties } from '../../data/mockProperties';
import { formatUsd } from '../../utils/formatters';

export default function OwnerTenants() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('All Properties');

  useEffect(() => {
    apiClient.get('/tenants?limit=100').catch(() => {});
  }, []);

  const effectivePerms = useMemo(() => {
    return getUserEffectivePermissions(user || 'owner@rentlock.com');
  }, [user]);

  const canViewPII = effectivePerms.canViewTenantPII;

  const ownerName = user?.name || 'Claire Bennett';
  const ownerEmail = user?.email?.toLowerCase();

  // Get all active properties owned by this owner
  const allProperties = useMemo(() => getProperties().filter((p) => !p.archived), []);

  const ownedPropertyNames = useMemo(() => {
    const owned = allProperties.filter((p) => {
      if (Array.isArray(p.owners) && p.owners.some((o) => o.name?.toLowerCase() === ownerName.toLowerCase())) {
        return true;
      }
      if (typeof p.owner === 'string' && p.owner.toLowerCase().includes(ownerName.toLowerCase())) {
        return true;
      }
      if (user?.ownerData?.properties && Array.isArray(user.ownerData.properties)) {
        if (user.ownerData.properties.some((pn) => pn.toLowerCase() === p.name.toLowerCase())) {
          return true;
        }
      }
      if (ownerName.toLowerCase().includes('claire') || ownerEmail?.includes('claire') || ownerEmail?.includes('owner@')) {
        return ['Sunrise Residency', 'Green Valley Villas', 'Metro Business Park'].includes(p.name);
      }
      return false;
    });
    return owned.map((p) => p.name);
  }, [allProperties, ownerName, ownerEmail, user]);

  const allTenants = useMemo(() => getTenants(), []);

  // Filter tenants who reside in properties owned by this owner
  const ownedTenants = useMemo(() => {
    return allTenants.filter((t) => ownedPropertyNames.includes(t.propertyName));
  }, [allTenants, ownedPropertyNames]);

  const filteredTenants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ownedTenants.filter((t) => {
      if (propertyFilter !== 'All Properties' && t.propertyName !== propertyFilter) {
        return false;
      }
      if (q) {
        const matchesName = t.name?.toLowerCase().includes(q);
        const matchesUnit = t.unitNumber?.toLowerCase().includes(q);
        const matchesEmail = t.email?.toLowerCase().includes(q);
        const matchesPhone = t.mobile?.toLowerCase().includes(q);
        if (!matchesName && !matchesUnit && !matchesEmail && !matchesPhone) return false;
      }
      return true;
    });
  }, [ownedTenants, searchTerm, propertyFilter]);

  // Aggregate metrics
  const totalTenantsCount = ownedTenants.length;
  const totalRentSum = ownedTenants.reduce((s, t) => s + (Number(t.rent) || 0), 0);
  const avgRent = totalTenantsCount ? Math.round(totalRentSum / totalTenantsCount) : 0;
  const overdueTenantsCount = ownedTenants.filter((t) => (Number(t.dueAmount) || 0) > 0).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Tenant Directory & Occupancy"
        subtitle={`Roster of tenants occupying units across properties owned by ${ownerName}.`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Tenants' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Tenants"
          value={totalTenantsCount}
          change={100}
          changeLabel="Across your owned properties"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Average Monthly Rent"
          value={formatUsd(avgRent)}
          change={2.8}
          changeLabel="Contract rent per unit"
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Collection Health"
          value={`${totalTenantsCount ? Math.round(((totalTenantsCount - overdueTenantsCount) / totalTenantsCount) * 100) : 100}%`}
          change={96.4}
          changeLabel="On-time settlement rate"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Past Due Balances"
          value={overdueTenantsCount}
          change={-1}
          changeLabel="Tenants with open balances"
          icon={AlertCircle}
          color="amber"
        />
      </div>

      {/* PII Masking Banner if restricted by Admin RBAC */}
      {!canViewPII && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Tenant Contact Privacy Active:</strong> Direct phone numbers and email addresses are masked for Owner accounts in accordance with Admin RBAC governance.
          </span>
        </div>
      )}

      {/* Table Card */}
      <Card padding="p-0">
        <CardHeader
          title="Occupant Directory"
          subtitle={`${filteredTenants.length} tenant records in your portfolio`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenant, unit, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
              />
            </div>

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="All Properties">All Properties</option>
              {ownedPropertyNames.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider border-y border-gray-100">
              <tr>
                <th className="py-3 px-4">Tenant Name</th>
                <th className="py-3 px-4">Property &amp; Unit</th>
                <th className="py-3 px-4">
                  Contact Information {!canViewPII && <span className="text-[10px] text-amber-600 font-normal lowercase">(Masked)</span>}
                </th>
                <th className="py-3 px-4">Lease Term</th>
                <th className="py-3 px-4">Monthly Rent</th>
                <th className="py-3 px-4">Rent Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Users className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium text-gray-600">No tenants found for this portfolio view</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const hasDue = (Number(t.dueAmount) || 0) > 0;
                  const displayEmail = canViewPII
                    ? t.email
                    : (t.email ? t.email.replace(/(.{2})(.*)(@.*)/, '$1••••••$3') : '••••••••');
                  const displayPhone = canViewPII
                    ? (t.mobile || '—')
                    : (t.mobile ? '+1 (•••) •••-••••' : '—');

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={t.name} size="sm" />
                          <div>
                            <p className="font-bold text-gray-900">{t.name}</p>
                            <p className="text-[10px] text-gray-400">{t.occupation || 'Resident'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Property & Unit */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                            {t.propertyName}
                          </p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <DoorOpen className="w-3 h-3 text-gray-400" />
                            Unit {t.unitNumber}
                          </p>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className={`font-medium flex items-center gap-1.5 ${canViewPII ? 'text-gray-900' : 'text-gray-500 font-mono text-[11px]'}`}>
                            <Mail className="w-3 h-3 text-gray-400" />
                            {displayEmail}
                          </p>
                          <p className={`text-[11px] flex items-center gap-1.5 ${canViewPII ? 'text-gray-500' : 'text-gray-400 font-mono'}`}>
                            <Phone className="w-3 h-3 text-gray-400" />
                            {displayPhone}
                          </p>
                        </div>
                      </td>

                      {/* Lease Term */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="text-gray-900 font-medium">{t.moveInDate || '01/01/2026'}</p>
                          <p className="text-[10px] text-gray-400">to {t.leaseEnd || '12/31/2026'}</p>
                        </div>
                      </td>

                      {/* Monthly Rent */}
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {formatUsd(t.rent || 2000)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {hasDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Due {formatUsd(t.dueAmount)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Current · Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
