import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Upload, Trash2, AlertTriangle, Layers } from 'lucide-react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import apiClient from '../../services/apiClient';
import { getUnits, deleteUnit } from '../../data/mockUnits';
import { getProperties } from '../../data/mockProperties';
import { getUnitTypes, addUnitType, removeUnitType, fetchUnitTypesFromBackend } from '../../utils/unitTypeStore';
import { formatCurrency, getStatusColor } from '../../utils/formatters';
import { useTable } from '../../hooks/useTable';
import { useGlobalSearch } from '../../context/SearchContext';
import toast from 'react-hot-toast';

export default function UnitList() {
  const navigate = useNavigate();
  const { searchQuery } = useGlobalSearch();
  const [statusFilter, setStatusFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [allUnits, setAllUnits] = useState(() => getUnits());
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [unitTypesList, setUnitTypesList] = useState(() => getUnitTypes());
  const [newTypeName, setNewTypeName] = useState('');

  const [properties, setProperties] = useState(() => getProperties().filter((p) => !p.archived));

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim();
    setNewTypeName('');
    const updated = await addUnitType(name);
    setUnitTypesList(updated);
    toast.success(`Unit type "${name}" added!`);
  };

  const handleRemoveType = async (t) => {
    const updated = await removeUnitType(t);
    setUnitTypesList(updated);
    toast.success(`Unit type "${t}" removed`);
  };

  const fetchUnits = () => {
    apiClient.get('/units?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setAllUnits(items);
        localStorage.setItem('custom_units', JSON.stringify(items));
      }
    }).catch(() => { });

    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setProperties(items);
      }
    }).catch(() => { });
  };

  useEffect(() => {
    fetchUnits();
    fetchUnitTypesFromBackend().then((types) => {
      if (Array.isArray(types) && types.length > 0) {
        setUnitTypesList(types);
      }
    });
  }, []);

  const confirmDelete = (unit) => {
    setUnitToDelete(unit);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    try {
      setIsDeleting(true);
      await deleteUnit(unitToDelete.id);
      setAllUnits((prev) => prev.filter((u) => String(u.id) !== String(unitToDelete.id)));
      toast.success(`Unit ${unitToDelete.unitNumber} deleted successfully`);
      setIsDeleteModalOpen(false);
      setUnitToDelete(null);
    } catch (err) {
      console.error('Delete unit error:', err);
      toast.error(err.response?.data?.message || err.message || `Failed to delete unit ${unitToDelete.unitNumber}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return allUnits.filter((unit) => {
      const matchesStatus = statusFilter === 'All' || unit.status === statusFilter;
      const matchesProp =
        propertyFilter === 'All' ||
        (unit.propertyName && unit.propertyName.toLowerCase() === propertyFilter.toLowerCase()) ||
        String(unit.propertyId) === String(propertyFilter);
      const matchesSearch =
        !q ||
        (unit.unitNumber || '').toLowerCase().includes(q) ||
        (unit.propertyName || '').toLowerCase().includes(q) ||
        (unit.tenant || '').toLowerCase().includes(q);
      return !unit.archived && matchesStatus && matchesProp && matchesSearch;
    });
  }, [allUnits, statusFilter, propertyFilter, searchQuery]);

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

  const fileInputRef = useRef(null);

  const handleImportCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        if (!text || typeof text !== 'string') {
          toast.error('The selected CSV file appears to be empty.');
          return;
        }

        const lines = text
          .split(/\r\n|\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length < 2) {
          toast.error('CSV file must contain a header row and at least one unit row.');
          return;
        }

        // Header mapping
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

        const getColIdx = (aliases) => {
          return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
        };

        const unitIdx = getColIdx(['unitnumber', 'unitnum', 'unit', 'number']);
        const propIdx = getColIdx(['property', 'propertyname', 'buildingname']);
        const floorIdx = getColIdx(['floor', 'level']);
        const typeIdx = getColIdx(['type', 'unittype', 'bhk']);
        const bedsIdx = getColIdx(['bed', 'bedroom']);
        const bathsIdx = getColIdx(['bath', 'bathroom']);
        const sqftIdx = getColIdx(['sqft', 'size', 'square', 'area']);
        const rentIdx = getColIdx(['rent', 'marketrent', 'price', 'rate']);
        const statusIdx = getColIdx(['status']);

        let importedCount = 0;
        const defaultProp = properties.find((p) => p.name === propertyFilter) || properties[0];

        for (let i = 1; i < lines.length; i++) {
          const rowValues = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (rowValues.length === 0 || rowValues.every((v) => !v)) continue;

          const unitNum = (unitIdx !== -1 && rowValues[unitIdx])
            ? rowValues[unitIdx]
            : `U-${Date.now().toString().slice(-4)}-${i}`;

          let propObj = defaultProp;
          if (propIdx !== -1 && rowValues[propIdx]) {
            const rawPropName = rowValues[propIdx].trim().toLowerCase();
            const matched = properties.find(
              (p) =>
                (p.name && p.name.trim().toLowerCase() === rawPropName) ||
                String(p.id) === rawPropName
            );
            if (matched) propObj = matched;
          }

          const propIdNum = parseInt(propObj?.numericId || propObj?.originalId || propObj?.id, 10);
          const floorNum = Number(floorIdx !== -1 ? rowValues[floorIdx] : 1) || 1;

          let bedsNum = 1;
          let bathsNum = 1;
          if (bedsIdx !== -1 && rowValues[bedsIdx]) {
            bedsNum = Number(rowValues[bedsIdx]) || 1;
          } else if (typeIdx !== -1 && rowValues[typeIdx]) {
            const match = rowValues[typeIdx].match(/(\d+)\s*(?:bd|bed|bhk)/i);
            if (match) bedsNum = Number(match[1]) || 1;
          }

          if (bathsIdx !== -1 && rowValues[bathsIdx]) {
            bathsNum = Number(rowValues[bathsIdx]) || 1;
          } else if (typeIdx !== -1 && rowValues[typeIdx]) {
            const match = rowValues[typeIdx].match(/(\d+(?:\.\d+)?)\s*(?:ba|bath)/i);
            if (match) bathsNum = Number(match[1]) || 1;
          }

          const sqftNum = Number(sqftIdx !== -1 ? rowValues[sqftIdx] : 850) || 850;
          const rentNum = Number(rentIdx !== -1 ? rowValues[rentIdx] : 2000) || 2000;
          const statusVal = statusIdx !== -1 && rowValues[statusIdx] ? rowValues[statusIdx] : 'Vacant';

          const unitPayload = {
            propertyId: !isNaN(propIdNum) ? propIdNum : 1,
            unitNumber: unitNum,
            floor: floorNum,
            bedrooms: bedsNum,
            bathrooms: bathsNum,
            sqft: sqftNum,
            rentAmount: rentNum,
            depositAmount: rentNum,
            status: statusVal,
          };

          try {
            await apiClient.post('/units', unitPayload);
            importedCount++;
          } catch (err) {
            console.warn('[UnitList] Failed to save unit to DB:', unitNum, err.message);
          }
        }

        if (importedCount === 0) {
          toast.error('No units could be imported. Please verify your CSV headers.');
          return;
        }

        fetchUnits();
        toast.success(`Successfully imported ${importedCount} units into database!`);
      } catch (err) {
        console.error('[CSV Import Error]', err);
        toast.error('Failed to parse CSV file. Please check file formatting.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const columns = [
    {
      key: 'unitNumber',
      label: 'Unit #',
      sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-bold text-gray-800">{v}</p>
          <p className="text-[11px] text-gray-400">{row.building || (row.block ? `Block ${row.block}` : '')}</p>
        </div>
      ),
    },
    { key: 'propertyName', label: 'Property', sortable: true, render: (v) => <span className="text-sm font-medium text-gray-600">{v}</span> },
    { key: 'floor', label: 'Floor', sortable: true },
    {
      key: 'unitType',
      label: 'Unit Type',
      sortable: true,
      render: (v, row) => row.unitType || row.bhk || (row.bedrooms !== undefined ? `${row.bedrooms} BD / ${row.bathrooms || 1} BA` : (row.beds !== undefined ? `${row.beds} BD / ${row.baths || 1} BA` : '—')),
    },
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Vacant">Vacant</option>
              <option value="Reserved">Reserved</option>
              <option value="Turnover">Turnover</option>
              <option value="Under Repair">Under Repair</option>
              <option value="Occupied">Occupied</option>
            </select>

            <Button
              variant="secondary"
              icon={Layers}
              onClick={() => {
                fetchUnitTypesFromBackend().then((types) => {
                  if (Array.isArray(types) && types.length > 0) setUnitTypesList(types);
                });
                setIsManageTypesOpen(true);
              }}
              size="sm"
            >
              Manage Unit Types
            </Button>
            <Button variant="secondary" icon={Download} onClick={handleExport} size="sm">Export</Button>
            {/*
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
            >
              Import
            </Button>
            */}
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
        onDelete={confirmDelete}
        emptyMessage="No units match your current filters"
      />

      {/* Manage Unit Types Modal */}
      <Modal
        isOpen={isManageTypesOpen}
        onClose={() => setIsManageTypesOpen(false)}
        title="Manage Unit Types"
        size="md"
        footer={
          <div className="flex justify-end w-full">
            <Button onClick={() => setIsManageTypesOpen(false)}>Done</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Create or manage unit types (e.g. Studio, Penthouse, Duplex, 2 BD / 2 BA). These options will appear in all unit forms across the portal.
          </p>

          {/* Input to add new type */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Penthouse Suite, Duplex, Studio"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewType();
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <Button onClick={handleAddNewType} icon={Plus} size="sm" className="font-bold whitespace-nowrap">
              Add Type
            </Button>
          </div>

          {/* List of current types */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl bg-gray-50/50">
            {unitTypesList.map((t) => (
              <div key={t} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-white transition-colors">
                <span className="text-sm font-semibold text-gray-700">{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveType(t)}
                  title={`Remove ${t}`}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Unit Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Unit"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" disabled={isDeleting} onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={isDeleting} onClick={handleDeleteUnit} icon={Trash2} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isDeleting ? 'Deleting...' : 'Delete Unit'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
          <p className="text-gray-900 font-black text-base">
            Delete Unit {unitToDelete?.unitNumber}?
          </p>
          <p className="text-gray-500 text-xs leading-relaxed">
            {unitToDelete?.tenant ? (
              <>
                This unit is currently occupied by <strong>{unitToDelete.tenant}</strong>. Deleting will permanently remove this unit and clean up associated records.
              </>
            ) : (
              'This unit will be permanently removed from inventory. This action cannot be undone.'
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
}
