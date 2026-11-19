import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  ArrowLeft, MapPin, Edit, Trash2, Users, DoorOpen, DollarSign,
  FileText, Building2, AlertCircle, Save, Layers, UserCheck, CheckCircle2,
  Calendar, ShieldCheck, Tag, Home, Sparkles, Plus
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import StatCard from '../../components/shared/StatCard';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { getProperties, updateProperty, deleteProperty } from '../../data/mockProperties';
import { getManagers, getOwners, updateManager } from '../../data/mockExtra';
import { getUnits, addUnit, deleteUnit } from '../../data/mockUnits';
import { getTenants } from '../../data/mockTenants';
import { formatCurrency, getStatusColor, formatDate } from '../../utils/formatters';
import { AMENITIES, US_STATES } from '../../utils/constants';
import { useTable } from '../../hooks/useTable';
import toast from 'react-hot-toast';

function UnitsTab({ propertyId }) {
  const navigate = useNavigate();
  const units = getUnits().filter((u) => String(u.propertyId) === String(propertyId));
  const table = useTable(units, 10);
  const columns = [
    { key: 'unitNumber', label: 'Unit', sortable: true },
    { key: 'floor', label: 'Floor', sortable: true },
    { key: 'bhk', label: 'Layout', sortable: true },
    { key: 'rent', label: 'Market Rent', sortable: true, align: 'right', render: (v) => formatCurrency(v) },
    { key: 'status', label: 'Status', render: (v) => <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold ${getStatusColor(v)}`}>{v}</span> },
  ];
  return <Table columns={columns} data={table.data} page={table.page} totalPages={table.totalPages} onPageChange={table.setPage} onRowClick={(r) => navigate(`/units/${r.id}`)} />;
}

function TenantsTab({ propertyId }) {
  const navigate = useNavigate();
  const tenants = getTenants().filter((t) => t.propertyId === propertyId);
  return (
    <div className="space-y-2">
      {tenants.map((t) => (
        <div key={t.id} onClick={() => navigate(`/tenants/${t.id}`)} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-indigo-200 transition-all">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">{t.name.charAt(0)}</div>
          <div className="flex-1 text-sm font-bold text-gray-700">{t.name} <span className="text-xs text-gray-400 block font-medium">Unit {t.unitNumber}</span></div>
          <div className="text-right text-sm font-black text-indigo-600">{formatCurrency(t.rent)}/mo</div>
        </div>
      ))}
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const getInitialProperty = () => {
    const fromList = getProperties().find((p) => String(p.id) === String(id));
    return fromList || null;
  };

  const [property, setProperty] = useState(getInitialProperty);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(property || {});
  const [activeEditTab, setActiveEditTab] = useState('basic');

  const [managersList, setManagersList] = useState(() => getManagers().filter((m) => !m.archived));
  const [ownersList, setOwnersList] = useState(() => getOwners().filter((o) => !o.archived));

  useEffect(() => {
    apiClient.get('/managers').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setManagersList((prev) => {
          const names = new Set(items.map((m) => m.name.toLowerCase()));
          const extra = prev.filter((m) => !names.has(m.name.toLowerCase()));
          return [...items, ...extra];
        });
      }
    }).catch(() => {});

    apiClient.get('/owners').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setOwnersList((prev) => {
          const names = new Set(items.map((o) => o.name.toLowerCase()));
          const extra = prev.filter((o) => !names.has(o.name.toLowerCase()));
          return [...items, ...extra];
        });
      }
    }).catch(() => {});
  }, []);

  // Save edit form draft whenever fields change
  useEffect(() => {
    if (isEditModalOpen && editForm && property?.id) {
      try {
        localStorage.setItem(`property_edit_draft_${property.id}`, JSON.stringify(editForm));
      } catch {}
    }
  }, [isEditModalOpen, editForm, property?.id]);

  const getPropertyUnitsList = () => {
    const fromMock = getUnits().filter((u) => String(u.propertyId) === String(id));
    if (fromMock.length > 0) return fromMock;
    if (Array.isArray(property?.units) && property.units.length > 0) {
      return property.units.map((u) => ({
        id: u.id,
        propertyId: id,
        unitNumber: u.unitNumber,
        floor: u.floor || 1,
        bhk: `${u.bedrooms || 1} BD / ${u.bathrooms || 1} BA`,
        beds: u.bedrooms || 1,
        baths: u.bathrooms || 1,
        rent: u.rentAmount || 2000,
        rentAmount: u.rentAmount || 2000,
        size: u.sqft || 850,
        sqft: u.sqft || 850,
        status: u.status || 'Vacant',
      }));
    }
    return [];
  };

  const [propertyUnits, setPropertyUnits] = useState(getPropertyUnitsList);
  const [newUnitForm, setNewUnitForm] = useState({
    unitNumber: '',
    floor: '',
    beds: '2',
    baths: '1',
    size: '',
    rent: '',
    status: 'Vacant',
  });

  useEffect(() => {
    // 1. Try directly fetching single property by ID from backend DB
    apiClient.get(`/properties/${id}`).then((res) => {
      const data = res?.data || res;
      if (data && data.id) {
        const localProps = getProperties();
        const local = localProps.find((p) => String(p.id) === String(id)) || {};

        let loadedAmenities = [];
        const rawAmenities = local.amenities || data.amenities;
        if (Array.isArray(rawAmenities) && rawAmenities.length > 0) {
          loadedAmenities = rawAmenities;
        } else if (typeof rawAmenities === 'string') {
          try {
            const parsed = JSON.parse(rawAmenities);
            if (Array.isArray(parsed)) loadedAmenities = parsed;
          } catch {
            loadedAmenities = rawAmenities.split(',').map((s) => s.trim()).filter(Boolean);
          }
        }
        if (loadedAmenities.length === 0) {
          loadedAmenities = ['Parking', 'Controlled Access'];
        }

        const merged = {
          ...local,
          ...data,
          code: local.code || data.code || `PR-${String(id).padStart(2, '0')}`,
          category: local.category || data.category || data.type || 'Multifamily',
          portfolioGroup: local.portfolioGroup || data.portfolioGroup || 'Brooklyn & Queens',
          buildingName: local.buildingName || data.buildingName || '',
          floors: local.floors || data.floors || '',
          street: local.street || (data.address ? data.address.split(',')[0].trim() : '') || '',
          city: local.city || data.city || 'Brooklyn',
          state: local.state || data.state || 'NY',
          zip: local.zip || local.zipCode || data.zipCode || '',
          zipCode: local.zip || local.zipCode || data.zipCode || '',
          country: local.country || data.country || 'United States',
          manager: typeof data.manager === 'object' && data.manager !== null
            ? data.manager.name
            : ((data.manager && data.manager !== 'Sarah Jenkins') ? data.manager : (local.manager || data.manager || '')),
          owner: typeof data.owner === 'object' && data.owner !== null
            ? data.owner.name
            : ((data.owner && data.owner !== 'Claire Bennett') ? data.owner : (local.owner || data.owner || '')),
          amenities: loadedAmenities,
          financials: {
            ...(local.financials || {}),
            ...(data.financials || {}),
          },
        };

        setProperty(merged);
        setEditForm(merged);

        // Also sync units
        const currentLocalUnits = getUnits().filter((u) => String(u.propertyId) === String(id));
        if (currentLocalUnits.length > 0) {
          setPropertyUnits(currentLocalUnits);
        } else if (Array.isArray(data.units) && data.units.length > 0) {
          const formatted = data.units.map((u) => ({
            id: u.id,
            propertyId: id,
            unitNumber: u.unitNumber,
            floor: u.floor || 1,
            bhk: `${u.bedrooms || 1} BD / ${u.bathrooms || 1} BA`,
            beds: u.bedrooms || 1,
            baths: u.bathrooms || 1,
            rent: u.rentAmount || 2000,
            rentAmount: u.rentAmount || 2000,
            size: u.sqft || 850,
            sqft: u.sqft || 850,
            status: u.status || 'Vacant',
          }));
          setPropertyUnits(formatted);
        }
      }
    }).catch(() => {
      const currentLocalUnits = getUnits().filter((u) => String(u.propertyId) === String(id));
      if (currentLocalUnits.length > 0) {
        setPropertyUnits(currentLocalUnits);
      }
    });
  }, [id]);

  if (!property) return <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest">Property not found</div>;

  const occupancyRate = property.totalUnits ? Math.round((property.occupiedUnits / property.totalUnits) * 100) : 0;
  const fin = property.financials || {};
  const estEquity = (fin.marketValue || 0) - (fin.mortgageBalance || 0);

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteProperty(property.id);
      toast.success(`Property "${property.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      navigate('/properties');
    } catch (err) {
      console.error('Delete property error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete property.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = () => {
    setActiveEditTab('basic');
    const localProps = getProperties();
    const local = localProps.find((p) => String(p.id) === String(id)) || {};
    const f = property.financials || local.financials || {};

    let loadedAmenities = [];
    const rawAmenities = property.amenities || local.amenities;
    if (Array.isArray(rawAmenities) && rawAmenities.length > 0) {
      loadedAmenities = rawAmenities;
    } else if (typeof rawAmenities === 'string') {
      try {
        const p = JSON.parse(rawAmenities);
        if (Array.isArray(p)) loadedAmenities = p;
      } catch {
        loadedAmenities = rawAmenities.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (loadedAmenities.length === 0) {
      loadedAmenities = ['Parking', 'Controlled Access'];
    }

    const draftKey = `property_edit_draft_${id}`;
    let draft = null;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) draft = JSON.parse(savedDraft);
    } catch {}

    setEditForm({
      ...local,
      ...property,
      name: property.name || local.name || '',
      code: property.code || local.code || `PR-${String(property.id).padStart(2, '0')}`,
      type: property.type || local.type || 'Residential',
      category: property.category || local.category || 'Multifamily',
      portfolioGroup: property.portfolioGroup || local.portfolioGroup || 'Brooklyn & Queens',
      street: local.street || property.street || (property.address ? property.address.split(',')[0].trim() : '') || '',
      city: local.city || property.city || 'Brooklyn',
      state: local.state || property.state || 'NY',
      zip: local.zip || local.zipCode || property.zip || property.zipCode || '11215',
      country: property.country || local.country || 'United States',
      manager: typeof property.manager === 'object' && property.manager !== null
        ? property.manager.name
        : (property.manager || local.manager || ''),
      owner: typeof property.owner === 'object' && property.owner !== null
        ? property.owner.name
        : (property.owner || local.owner || ''),
      managementStartDate: property.managementStartDate || local.managementStartDate || '2026-11-15',
      status: property.status || local.status || 'Active',
      buildingName: property.buildingName || local.buildingName || '',
      floors: property.floors || local.floors || '',
      yearBuilt: property.yearBuilt || local.yearBuilt || '',
      amenities: loadedAmenities,
      purchasePrice: f.purchasePrice ?? (local.purchasePrice || ''),
      acquisitionDate: f.acquisitionDate || local.acquisitionDate || '',
      closingCosts: f.closingCosts ?? (local.closingCosts || ''),
      marketValue: f.marketValue ?? (local.marketValue || ''),
      valuationSource: f.valuationSource || local.valuationSource || '',
      assessedValue: f.assessedValue ?? (local.assessedValue || ''),
      taxYear: f.taxYear || local.taxYear || '',
      lender: f.lender || local.lender || '',
      loanNumber: f.loanNumber || local.loanNumber || '',
      mortgageBalance: f.mortgageBalance ?? (local.mortgageBalance || ''),
      ...(draft || {}),
    });

    const currentUnits = getPropertyUnitsList();
    setPropertyUnits(currentUnits);
    setIsEditModalOpen(true);
  };

  const handleAddUnitInModal = async () => {
    const unitNum = (newUnitForm.unitNumber || '').trim() || `Unit-${propertyUnits.length + 101}`;
    const floorNum = Number(newUnitForm.floor) || 1;
    const bedsNum = Number(newUnitForm.beds) || 2;
    const bathsNum = Number(newUnitForm.baths) || 1;
    const sizeNum = Number(newUnitForm.size) || 900;
    const rentNum = Number(newUnitForm.rent) || 2100;

    const unitPayload = {
      propertyId: property.id,
      propertyName: property.name,
      unitNumber: unitNum,
      floor: floorNum,
      beds: bedsNum,
      baths: bathsNum,
      bhk: `${bedsNum} BD / ${bathsNum} BA`,
      size: sizeNum,
      sqft: sizeNum,
      rent: rentNum,
      rentAmount: rentNum,
      status: newUnitForm.status || 'Vacant',
      building: editForm.buildingName || 'Main Building',
    };

    const created = await addUnit(unitPayload);
    setPropertyUnits((prev) => [...prev, created]);
    setProperty((prev) => ({
      ...prev,
      totalUnits: (prev.totalUnits || 0) + 1,
      vacantUnits: (prev.vacantUnits || 0) + 1,
    }));

    const numPart = parseInt(unitNum.replace(/\D/g, ''), 10);
    const prefix = unitNum.replace(/[0-9]/g, '') || 'Unit-';
    const nextNum = !isNaN(numPart) ? `${prefix}${numPart + 1}` : `Unit-${propertyUnits.length + 102}`;
    setNewUnitForm((prev) => ({ ...prev, unitNumber: nextNum }));

    toast.success(`Unit ${unitNum} added!`);
  };

  const handleDeleteUnitInModal = async (unitId, unitNum) => {
    try {
      await deleteUnit(unitId);
      setPropertyUnits((prev) => prev.filter((u) => u.id !== unitId));
      setProperty((prev) => ({
        ...prev,
        totalUnits: Math.max(0, (prev.totalUnits || 1) - 1),
      }));
      toast.success(`Unit ${unitNum} removed`);
    } catch (err) {
      toast.error(err.message || `Failed to remove unit ${unitNum}`);
    }
  };

  const updateEditField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleEditAmenity = (amenity) => {
    setEditForm((prev) => {
      const list = Array.isArray(prev.amenities) ? prev.amenities : [];
      const next = list.includes(amenity)
        ? list.filter((a) => a !== amenity)
        : [...list, amenity];
      return { ...prev, amenities: next };
    });
  };

  const handleUpdate = async () => {
    if (!editForm.name || !editForm.name.trim()) {
      return toast.error('Property Name is required');
    }

    const fullAddress = editForm.street
      ? `${editForm.street.trim()}, ${editForm.city || 'Brooklyn'}, ${editForm.state || 'NY'} ${editForm.zip || ''}`.trim()
      : (editForm.address || '');

    const updatedFinancials = {
      ...(property.financials || {}),
      purchasePrice: Number(editForm.purchasePrice) || 0,
      acquisitionDate: editForm.acquisitionDate || '',
      closingCosts: Number(editForm.closingCosts) || 0,
      marketValue: Number(editForm.marketValue) || 0,
      valuationSource: editForm.valuationSource || '',
      assessedValue: Number(editForm.assessedValue) || 0,
      taxYear: editForm.taxYear || '',
      lender: editForm.lender || '',
      loanNumber: editForm.loanNumber || '',
      mortgageBalance: Number(editForm.mortgageBalance) || 0,
    };

    const updatedData = {
      ...property,
      ...editForm,
      name: editForm.name.trim(),
      code: editForm.code,
      type: editForm.type,
      category: editForm.category,
      portfolioGroup: editForm.portfolioGroup,
      address: fullAddress,
      street: editForm.street,
      city: editForm.city || 'Brooklyn',
      state: editForm.state || 'NY',
      zip: editForm.zip,
      zipCode: editForm.zip,
      country: editForm.country || 'United States',
      manager: editForm.manager,
      owner: editForm.owner,
      managementStartDate: editForm.managementStartDate,
      status: editForm.status,
      buildingName: editForm.buildingName,
      floors: Number(editForm.floors) || 1,
      yearBuilt: editForm.yearBuilt ? Number(editForm.yearBuilt) : undefined,
      amenities: editForm.amenities,
      totalUnits: propertyUnits.length,
      financials: updatedFinancials,
    };

    // 1. Send clean payload to backend API
    try {
      const selectedMgr = managersList.find((m) => m.name.toLowerCase() === (editForm.manager || '').toLowerCase());
      const selectedOwn = ownersList.find((o) => o.name.toLowerCase() === (editForm.owner || '').toLowerCase());
      const apiPayload = {
        name: updatedData.name,
        code: updatedData.code,
        type: updatedData.type,
        category: updatedData.category,
        portfolioGroup: updatedData.portfolioGroup,
        address: fullAddress,
        city: updatedData.city,
        state: updatedData.state,
        zipCode: updatedData.zipCode,
        manager: editForm.manager,
        managerId: selectedMgr?.id,
        owner: editForm.owner,
        ownerId: selectedOwn?.id,
        yearBuilt: updatedData.yearBuilt,
        amenities: updatedData.amenities,
      };
      await apiClient.put(`/properties/${property.id}`, apiPayload);
    } catch (err) {
      console.warn('[API] Update property failed:', err?.message);
    }

    // 2. Update local state & custom_properties
    updateProperty(property.id, updatedData);
    setProperty(updatedData);

    try {
      localStorage.removeItem(`property_edit_draft_${property.id}`);
    } catch {}

    // Sync manager assignment in custom_managers roster
    try {
      const mgrList = getManagers();
      const targetMgr = mgrList.find((m) => m.name.toLowerCase() === (editForm.manager || '').toLowerCase());
      if (targetMgr) {
        const existingProps = targetMgr.properties || [];
        if (!existingProps.includes(updatedData.name)) {
          updateManager(targetMgr.id, {
            ...targetMgr,
            properties: [...existingProps, updatedData.name],
          });
        }
      }
    } catch {}

    setIsEditModalOpen(false);
    toast.success(`Property "${updatedData.name}" updated successfully!`);
  };

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Total Units" value={property.totalUnits} icon={DoorOpen} color="blue" />
            <StatCard title="Occupied" value={property.occupiedUnits} icon={Users} color="green" />
            <StatCard title="Monthly Billed" value={formatCurrency(property.monthlyRevenue)} icon={DollarSign} color="cyan" />
            <StatCard title="Pending Dues" value={formatCurrency(property.pendingDues)} icon={DollarSign} color="red" />
          </div>
          <Card>
            <h3 className="text-sm font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <FileText className="w-4 h-4 text-indigo-500" /> U.S. Property Record Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                ['Category', property.category || property.type || 'Residential', Layers],
                ['Floors', property.floors || 4, Layers],
                ['Manager', typeof property.manager === 'object' && property.manager !== null ? property.manager.name : (property.manager || 'Sarah Jenkins'), Users],
                ['ZIP Code', property.zip || property.zipCode || '—', MapPin],
                ['City / State', `${property.city || 'Brooklyn'}, ${property.state || 'NY'}`, MapPin],
                ['Mgmt Start Date', formatDate(property.managementStartDate || property.createdAt), Layers],
                ['Owners & Shares', typeof property.owner === 'object' && property.owner !== null ? property.owner.name : (property.owner || 'Claire Bennett (100%)'), UserCheck],
                ['Street Address', property.address, MapPin],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-[13px] font-bold text-gray-700">{value}</p>
                </div>
              ))}
            </div>
            {property.amenities?.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="text-[10px] px-2.5 py-1 rounded bg-gray-50 text-gray-600 font-bold border border-gray-100">{a}</span>
                ))}
              </div>
            )}
          </Card>
        </div>
      ),
    },
    { key: 'units', label: 'Units', count: property.totalUnits, content: <UnitsTab propertyId={property.id} /> },
    { key: 'tenants', label: 'Tenants', count: property.occupiedUnits, content: <TenantsTab propertyId={property.id} /> },
    {
      key: 'financials',
      label: 'Financials & Equity',
      content: (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Purchase Price" value={formatCurrency(fin.purchasePrice || 0)} color="blue" />
            <StatCard title="Est. Market Value" value={formatCurrency(fin.marketValue || 0)} color="green" />
            <StatCard title="Mortgage Balance" value={formatCurrency(fin.mortgageBalance || 0)} color="amber" />
            <StatCard title="Estimated Equity" value={formatCurrency(estEquity)} color="purple" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 border-t border-gray-100 pt-4 text-xs">
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Valuation Source</p><p className="font-bold text-gray-800 mt-1">{fin.valuationSource || '—'}</p></div>
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Assessed Value ({fin.taxYear || '2026'})</p><p className="font-bold text-gray-800 mt-1">{formatCurrency(fin.assessedValue || 0)}</p></div>
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Lender</p><p className="font-bold text-gray-800 mt-1">{fin.lender || 'Unencumbered'}</p></div>
            <div><p className="text-gray-400 font-bold uppercase text-[10px]">Loan Number</p><p className="font-bold text-gray-800 mt-1">{fin.loanNumber || '—'}</p></div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Properties', path: '/properties' }, { label: property.name }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/properties')} className="py-2 text-xs font-bold">Back</Button>
            <Button variant="secondary" icon={Edit} onClick={handleOpenEdit} className="py-2 text-xs font-bold">Edit</Button>
            <Button variant="danger" icon={Trash2} size="sm" onClick={() => setIsDeleteModalOpen(true)} className="py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">Delete Property</Button>
          </div>
        }
      />

      <div className="bg-[#1e1b4b] rounded-2xl p-6 mb-4 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <h1 className="text-3xl font-black tracking-tight text-white">{property.name}</h1>
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none font-black text-[10px] uppercase tracking-widest">{property.status}</Badge>
            </div>
            <p className="flex items-center gap-2 text-indigo-200/80 text-[14px] font-bold mb-4">
              <MapPin className="w-4 h-4 text-indigo-400" /> {property.address}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-100 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 opacity-50" /> {property.type}
              </span>
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-100/70">Code: {property.code}</span>
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-100/70">Manager: {property.manager}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="text-center px-4 border-r border-white/10">
              <p className="text-2xl font-black">{occupancyRate}%</p>
              <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest mt-1 opacity-70">Occupancy</p>
            </div>
            <div className="text-center px-2">
              <p className="text-2xl font-black text-emerald-400">{property.occupiedUnits}</p>
              <p className="text-[10px] text-emerald-300/70 uppercase font-bold tracking-widest mt-1">Occupied</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} defaultTab="overview" />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Property"
        size="sm"
        footer={
          <>
            <Button variant="secondary" disabled={isDeleting} onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={isDeleting} onClick={confirmDelete} icon={Trash2} className="bg-rose-600 hover:bg-rose-700">
              {isDeleting ? 'Deleting...' : 'Delete Property'}
            </Button>
          </>
        }
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-7 h-7" />
          </div>
          <p className="font-black text-gray-900 text-base">Delete {property.name}?</p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            This action cannot be undone. This property and its associated vacant units and records will be permanently removed from the database.
          </p>
        </div>
      </Modal>

      {/* COMPREHENSIVE EDIT PROPERTY MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        closeOnBackdropClick={false}
        title={`Edit Property: ${property.name}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} icon={Save} className="bg-indigo-600 font-bold hover:bg-indigo-700">
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Internal Tab Bar */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
            {[
              { id: 'basic', label: 'Basic & Location', icon: Building2 },
              { id: 'management', label: 'Management & Owner', icon: Users },
              { id: 'units', label: `Units & Layouts (${propertyUnits.length})`, icon: DoorOpen },
              { id: 'building', label: 'Building & Amenities', icon: Layers },
              { id: 'financials', label: 'Financials & Valuation', icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeEditTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEditTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: BASIC INFO & LOCATION */}
          {activeEditTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Property Name *"
                  placeholder="e.g. Sunrise Residency"
                  value={editForm.name || ''}
                  onChange={(e) => updateEditField('name', e.target.value)}
                />
                <Input
                  label="Property Code (Unique)"
                  placeholder="e.g. SR-101"
                  value={editForm.code || ''}
                  onChange={(e) => updateEditField('code', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Property Use"
                  value={editForm.type || 'Residential'}
                  options={['Residential', 'Commercial', 'Mixed-Use', 'Industrial / Warehouse']}
                  onChange={(e) => updateEditField('type', e.target.value)}
                />
                <Select
                  label="Building Category"
                  value={editForm.category || 'Multifamily'}
                  options={['Multifamily', 'Single-Family', 'Townhome', 'Office', 'Retail', 'Warehouse', 'Mixed-Use']}
                  onChange={(e) => updateEditField('category', e.target.value)}
                />
                <Select
                  label="Portfolio Group"
                  value={editForm.portfolioGroup || 'Brooklyn & Queens'}
                  options={['Brooklyn & Queens', 'New Jersey', 'Texas Commercial & Resi', 'Core East Coast']}
                  onChange={(e) => updateEditField('portfolioGroup', e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Address & Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Street Address *"
                    className="md:col-span-2"
                    placeholder="123 Main Street"
                    value={editForm.street || ''}
                    onChange={(e) => updateEditField('street', e.target.value)}
                  />
                  <Input
                    label="Country"
                    disabled
                    value={editForm.country || 'United States'}
                  />
                  <Input
                    label="City *"
                    placeholder="Brooklyn"
                    value={editForm.city || ''}
                    onChange={(e) => updateEditField('city', e.target.value)}
                  />
                  <Select
                    label="State *"
                    options={US_STATES}
                    value={editForm.state || 'NY'}
                    onChange={(e) => updateEditField('state', e.target.value)}
                  />
                  <Input
                    label="ZIP Code *"
                    placeholder="11215"
                    value={editForm.zip || ''}
                    onChange={(e) => updateEditField('zip', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGEMENT & OWNER */}
          {activeEditTab === 'management' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Assigned Manager *"
                  options={managersList.map((m) => m.name)}
                  value={editForm.manager || ''}
                  onChange={(e) => updateEditField('manager', e.target.value)}
                />
                <Select
                  label="Primary Owner / Entity *"
                  options={ownersList.map((o) => o.name)}
                  value={editForm.owner || ''}
                  onChange={(e) => updateEditField('owner', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Management Start Date *"
                  type="date"
                  value={editForm.managementStartDate || ''}
                  onChange={(e) => updateEditField('managementStartDate', e.target.value)}
                />
                <Select
                  label="Operational Status"
                  options={['Active', 'Onboarding', 'Under Construction', 'Under Maintenance']}
                  value={editForm.status || 'Active'}
                  onChange={(e) => updateEditField('status', e.target.value)}
                />
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed">
                <strong>Live Sync:</strong> Changing the Assigned Manager automatically updates portfolio assignments in both the Admin Roster and the Manager Workspace.
              </div>
            </div>
          )}

          {/* TAB 3: UNITS & LAYOUTS */}
          {activeEditTab === 'units' && (
            <div className="space-y-5">
              {/* Add New Unit Mini-Form */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" /> Add New Unit to Building
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {propertyUnits.length} Units Configured
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                  <Input
                    label="Unit #"
                    placeholder="e.g. 101"
                    value={newUnitForm.unitNumber}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, unitNumber: e.target.value })}
                  />
                  <Input
                    label="Floor"
                    type="number"
                    min={1}
                    placeholder="e.g. 1"
                    value={newUnitForm.floor}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, floor: e.target.value })}
                  />
                  <Select
                    label="Beds"
                    options={['Studio', '1', '2', '3', '4']}
                    value={newUnitForm.beds}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, beds: e.target.value })}
                  />
                  <Select
                    label="Baths"
                    options={['1', '1.5', '2', '2.5', '3']}
                    value={newUnitForm.baths}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, baths: e.target.value })}
                  />
                  <Input
                    label="Rent ($/mo)"
                    type="number"
                    placeholder="e.g. 2100"
                    value={newUnitForm.rent}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, rent: e.target.value })}
                  />
                  <Button
                    type="button"
                    onClick={handleAddUnitInModal}
                    icon={Plus}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-[42px]"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Units Table / List */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
                {propertyUnits.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-gray-50/50">
                    <DoorOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-700">No units added yet</p>
                    <p className="text-xs text-gray-400 mt-1">Use the quick add bar above to register units for this property.</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">Unit #</th>
                          <th className="py-2.5 px-3">Floor</th>
                          <th className="py-2.5 px-3">Layout</th>
                          <th className="py-2.5 px-3">Size (sqft)</th>
                          <th className="py-2.5 px-3 text-right">Market Rent</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {propertyUnits.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-gray-900">
                              {u.unitNumber}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">Floor {u.floor || 1}</td>
                            <td className="py-2.5 px-3 text-gray-600">{u.bhk || `${u.beds || 1} BD / ${u.baths || 1} BA`}</td>
                            <td className="py-2.5 px-3 text-gray-500">{u.size || u.sqft || '—'} sqft</td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-600">
                              {formatCurrency(u.rent || u.rentAmount || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant={u.status === 'Occupied' ? 'success' : u.status === 'Under Repair' ? 'danger' : 'neutral'}
                                size="sm"
                              >
                                {u.status || 'Vacant'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                title="Remove Unit"
                                onClick={() => handleDeleteUnitInModal(u.id, u.unitNumber)}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BUILDING & AMENITIES */}
          {activeEditTab === 'building' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Building / Block Name"
                  placeholder="e.g. Main Building"
                  value={editForm.buildingName || ''}
                  onChange={(e) => updateEditField('buildingName', e.target.value)}
                />
                <Input
                  label="Total Floors"
                  type="number"
                  min={1}
                  value={editForm.floors || ''}
                  onChange={(e) => updateEditField('floors', e.target.value)}
                />
                <Input
                  label="Year Built"
                  type="number"
                  placeholder="e.g. 2018"
                  value={editForm.yearBuilt || ''}
                  onChange={(e) => updateEditField('yearBuilt', e.target.value)}
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-2">Building Amenities (Standard)</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((amenity) => {
                    const isSelected = (Array.isArray(editForm.amenities) ? editForm.amenities : []).includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleEditAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIALS & VALUATION */}
          {activeEditTab === 'financials' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Purchase Price ($)"
                  type="number"
                  placeholder="0"
                  value={editForm.purchasePrice ?? ''}
                  onChange={(e) => updateEditField('purchasePrice', e.target.value)}
                />
                <Input
                  label="Acquisition Date"
                  type="date"
                  value={editForm.acquisitionDate || ''}
                  onChange={(e) => updateEditField('acquisitionDate', e.target.value)}
                />
                <Input
                  label="Closing Costs ($)"
                  type="number"
                  placeholder="0"
                  value={editForm.closingCosts ?? ''}
                  onChange={(e) => updateEditField('closingCosts', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Estimated Market Value ($)"
                  type="number"
                  placeholder="0"
                  value={editForm.marketValue ?? ''}
                  onChange={(e) => updateEditField('marketValue', e.target.value)}
                />
                <Input
                  label="Valuation Source"
                  placeholder="e.g. Independent Appraisal"
                  value={editForm.valuationSource || ''}
                  onChange={(e) => updateEditField('valuationSource', e.target.value)}
                />
                <Input
                  label="Assessed Tax Value ($)"
                  type="number"
                  placeholder="0"
                  value={editForm.assessedValue ?? ''}
                  onChange={(e) => updateEditField('assessedValue', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <Input
                  label="Tax Year"
                  placeholder="2026"
                  value={editForm.taxYear || ''}
                  onChange={(e) => updateEditField('taxYear', e.target.value)}
                />
                <Input
                  label="Mortgage Balance ($)"
                  type="number"
                  placeholder="0"
                  value={editForm.mortgageBalance ?? ''}
                  onChange={(e) => updateEditField('mortgageBalance', e.target.value)}
                />
                <Input
                  label="Primary Lender"
                  placeholder="e.g. Chase Commercial"
                  value={editForm.lender || ''}
                  onChange={(e) => updateEditField('lender', e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="Loan / Account Number"
                  placeholder="e.g. LN-88349210"
                  value={editForm.loanNumber || ''}
                  onChange={(e) => updateEditField('loanNumber', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
