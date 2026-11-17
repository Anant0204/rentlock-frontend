import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Search, Building2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import { getManagerWorkspaceState, getManagerOpenWorkOrders } from '../../data/managerWorkspaceData';

export default function ManagerProperties() {
  const navigate = useNavigate();
  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setState((prev) => ({
          ...prev,
          properties: items.map((p) => ({
            id: String(p.id),
            name: p.name,
            address: p.address,
            shortLocation: `${p.city || 'Brooklyn'}, ${p.state || 'NY'}`,
            type: p.type || 'Residential',
            totalUnits: p.totalUnits || 2,
            occupiedUnits: p.occupiedUnits || 1,
            occupancyRate: p.occupancyRate || 85,
            rentRoll: p.monthlyRevenue || 4500,
            openWorkOrders: 1,
            accessNotes: p.accessNotes || 'Standard keycard access',
          })),
        }));
      }
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.properties || []).filter((p) => {
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        (p.shortLocation || '')?.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesType = !typeFilter || p.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [state.properties, search, statusFilter, typeFilter]);

  const firstPropertyId = filtered[0]?.id || state.properties[0]?.id;

  return (
    <div className="space-y-5 pb-6">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / PROPERTIES"
        properties={state.properties}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">Properties assigned to you</p>
        </div>
        <Button
          variant="primary"
          icon={Building2}
          disabled={!firstPropertyId}
          onClick={() => firstPropertyId && navigate(`/manager/properties/${firstPropertyId}`)}
        >
          Open property record
        </Button>
      </div>

      <Card padding="p-6" className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Assigned property portfolio</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Search, filter, and open a building to see units, tenants, documents, and active work
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search property or address..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100 outline-none cursor-pointer"
            >
              <option value="">All statuses</option>
              <option value="Active">Active</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 outline-none cursor-pointer"
            >
              <option value="">All types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>

          <span className="text-xs font-semibold text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'property' : 'properties'}
          </span>
        </div>

        {/* Portfolio Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">PROPERTY</th>
                <th className="py-3 px-4">TYPE / LOCATION</th>
                <th className="py-3 px-4">UNITS</th>
                <th className="py-3 px-4">OCCUPIED</th>
                <th className="py-3 px-4">VACANT</th>
                <th className="py-3 px-4">OPEN WORK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-gray-400">
                    No assigned properties match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((prop) => {
                  const openWorkCount = getManagerOpenWorkOrders(state, prop.id).length;
                  return (
                    <tr
                      key={prop.id}
                      onClick={() => navigate(`/manager/properties/${prop.id}`)}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 font-bold text-gray-900">{prop.name}</td>
                      <td className="py-4 px-4 text-gray-600">
                        {prop.type} · {prop.shortLocation}
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-800">{prop.totalUnits}</td>
                      <td className="py-4 px-4 font-semibold text-gray-800">{prop.occupiedUnits}</td>
                      <td className="py-4 px-4 font-semibold text-gray-800">{prop.vacantUnits}</td>
                      <td className="py-4 px-4">
                        <Badge variant={openWorkCount >= 4 ? 'warning' : 'primary'}>
                          {openWorkCount} open
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Note Box */}
        <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 px-4 py-3">
          <p className="text-xs font-bold text-indigo-700">Property record includes</p>
          <p className="text-xs text-gray-600 mt-1">
            Building contacts · unit list · occupancy · tenant roster · requirements · insurance/inspection files · work order history
          </p>
        </div>
      </Card>

      <Card gradient padding="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          PROPERTY ACCESS
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Managers only see assigned buildings. If Admin changes an assignment, property search, documents, messages, and direct links update immediately.
        </p>
      </Card>
    </div>
  );
}

