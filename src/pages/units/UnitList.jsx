import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Upload } from 'lucide-react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import apiClient from '../../services/apiClient';
import { getUnits } from '../../data/mockUnits';
import { getProperties } from '../../data/mockProperties';
import { formatCurrency, getStatusColor } from '../../utils/formatters';
import { useTable } from '../../hooks/useTable';
import { useGlobalSearch } from '../../context/SearchContext';
import toast from 'react-hot-toast';

export default function UnitList() {
  const navigate = useNavigate();
  const { searchQuery } = useGlobalSearch();
  const [activeTab, setActiveTab] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [allUnits, setAllUnits] = useState(() => getUnits());
  const properties = getProperties().filter((p) => !p.archived);

  useEffect(() => {
    apiClient.get('/units?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setAllUnits(items);
        localStorage.setItem('custom_units', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const filteredData = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return allUnits.filter((unit) => {
      const matchesArchive = activeTab === 'Archived' ? unit.archived : !unit.archived;
      const matchesTab = activeTab === 'All' || activeTab === 'Archived' || unit.status === activeTab;
      const matchesProp = propertyFilter === 'All' || unit.propertyName === propertyFilter;
      const matchesSearch =
        !q ||
        (unit.unitNumber || '').toLowerCase().includes(q) ||
        (unit.propertyName || '').toLowerCase().includes(q) ||
        (unit.tenant || '').toLowerCase().includes(q);
      return matchesArchive && matchesTab && matchesProp && matchesSearch;
    });
  }, [allUnits, activeTab, propertyFilter, searchQuery]);

  const table = useTable(filteredData, 15);

  const handleExport = () => {
    const csv = ['Unit,Property,Building,Floor,Type,SqFt,Market Rent,Status,Tenant']
      .concat(
        filteredData.map((u) =>
          [u.unitNumber, u.propertyName, u.building || u.block, u.floor, u.bhk, u.size, u.rent, u.status, u.tenant || 'Vacant'].join(',')
        )
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rentlock-unit-inventory.csv';
    a.click();
    toast.success('Unit inventory CSV exported');
  };

  const columns = [
    {
      key: 'unitNumber',
      label: 'Unit #',
      sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-bold text-gray-800">{v}</p>
          <p className="text-[11px] text-gray-400">{row.building || `Block ${row.block}`}</p>
        </div>
      ),
    },
    { key: 'propertyName', label: 'Property', sortable: true, render: (v) => <span className="text-sm font-medium text-gray-600">{v}</span> },
    { key: 'floor', label: 'Floor', sortable: true },
    { key: 'bhk', label: 'Unit Type', sortable: true },
    { key: 'size', label: 'Sq Ft', sortable: true, render: (v) => `${v} sq ft` },
    { key: 'rent', label: 'Market Rent', sortable: true, align: 'right', render: (v) => <span className="font-bold">{formatCurrency(v)}</span> },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold shadow-sm ${getStatusColor(v)}`}>{v}</span>,
    },
    { key: 'tenant', label: 'Resident / Lease', render: (v) => (v ? <span className="font-medium text-gray-700">{v}</span> : <span className="text-gray-400 italic text-[11px]">Unoccupied</span>) },
  ];

  const tabs = ['All', 'Occupied', 'Vacant', 'Reserved', 'Turnover', 'Under Repair', 'Archived'];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Table
        showDownload={false}
        title="Unit Inventory"
        subtitle={`${filteredData.length} units across portfolio · All rents in USD`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none cursor-pointer"
            >
              <option value="All">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>

            <div className="hidden xl:flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    activeTab === tab ? 'bg-white text-indigo-600 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <Button variant="secondary" icon={Download} onClick={handleExport} size="sm">Export</Button>
            <Button variant="secondary" icon={Upload} onClick={() => toast.success('CSV import queue opened — sample template ready')} size="sm">Import</Button>
            <Button icon={Plus} onClick={() => navigate('/units/add')} className="shadow-lg shadow-indigo-100 py-2 px-4 text-xs font-bold whitespace-nowrap">
              Add Unit
            </Button>
          </div>
        }
        columns={columns}
        data={table.data}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        page={table.page}
        totalPages={table.totalPages}
        totalItems={table.totalItems}
        onPageChange={table.setPage}
        pageSize={table.pageSize}
        selected={table.selected}
        onToggleSelect={table.toggleSelect}
        onToggleSelectAll={table.toggleSelectAll}
        allSelected={table.allSelected}
        onRowClick={(row) => navigate(`/units/${row.id}`)}
        emptyMessage="No units match your current filters"
      />
    </div>
  );
}
