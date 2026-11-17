import { useState, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Building2, Wrench, DollarSign, CheckCircle2 } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Badge from '../../components/ui/Badge';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import { getManagerWorkspaceState, getManagerOpenWorkOrders } from '../../data/managerWorkspaceData';
import { formatUsd } from '../../utils/formatters';

export default function ManagerReports() {
  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [propertyFilter, setPropertyFilter] = useState('');

  useEffect(() => {
    apiClient.get('/reports/summary').catch(() => {});
  }, []);

  const scopedProperties = useMemo(
    () => state.properties.filter((p) => !propertyFilter || p.id === propertyFilter),
    [state.properties, propertyFilter]
  );

  const summary = useMemo(() => {
    const totalUnits = scopedProperties.reduce((s, p) => s + p.totalUnits, 0);
    const occupied = scopedProperties.reduce((s, p) => s + p.occupiedUnits, 0);
    const occupancyRate = totalUnits > 0 ? ((occupied / totalUnits) * 100).toFixed(1) : '0.0';
    const openWOs = getManagerOpenWorkOrders(state, propertyFilter).length;
    const closedWOs = state.workOrders.filter(
      (w) => w.status === 'Closed' && (!propertyFilter || w.propertyId === propertyFilter)
    ).length;
    const scopedTenants = state.tenants.filter(
      (t) => !propertyFilter || t.propertyId === propertyFilter
    );
    const outstandingBalance = scopedTenants.reduce((s, t) => s + (Number(t.balance) || 0), 0);

    return { totalUnits, occupied, occupancyRate, openWOs, closedWOs, outstandingBalance };
  }, [scopedProperties, state, propertyFilter]);

  return (
    <div className="space-y-5 pb-8">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / REPORTS"
        properties={state.properties}
        selectedPropertyId={propertyFilter}
        onSelectProperty={setPropertyFilter}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Occupancy, open work orders, and rent balance summary across assigned properties
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="OCCUPANCY RATE"
          value={`${summary.occupancyRate}%`}
          changeLabel={`${summary.occupied} / ${summary.totalUnits} units`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="OPEN WORK ORDERS"
          value={summary.openWOs}
          changeLabel="Active in assigned scope"
          icon={Wrench}
          color="amber"
        />
        <StatCard
          title="CLOSED WORK ORDERS"
          value={summary.closedWOs}
          changeLabel="Reviewed with proof"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="TENANT BALANCE DUE"
          value={formatUsd(summary.outstandingBalance, 2)}
          changeLabel="Tracked resident ledgers"
          icon={DollarSign}
          color="red"
        />
      </div>

      <Card padding="p-6">
        <CardHeader title="Building performance breakdown" subtitle="Assigned properties only" />
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">PROPERTY</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">OCCUPANCY</th>
                <th className="py-3 px-4">OPEN WORK</th>
                <th className="py-3 px-4">COMPLIANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {scopedProperties.map((prop) => {
                const openCount = getManagerOpenWorkOrders(state, prop.id).length;
                const occPct = ((prop.occupiedUnits / prop.totalUnits) * 100).toFixed(1);
                const dueCount = (prop.requirements || []).filter((r) => r.status !== 'Current').length;
                return (
                  <tr key={prop.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{prop.name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{prop.type}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {prop.occupiedUnits}/{prop.totalUnits} ({occPct}%)
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="primary">{openCount} open</Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={dueCount > 0 ? 'warning' : 'success'}>
                        {dueCount > 0 ? `${dueCount} due` : 'Current'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

