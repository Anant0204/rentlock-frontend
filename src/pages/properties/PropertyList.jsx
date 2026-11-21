import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, MapPin, ChevronDown, ArrowUpRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import apiClient from '../../services/apiClient';
import { getProperties } from '../../data/mockProperties';
import { formatCurrency } from '../../utils/formatters';
import { useGlobalSearch } from '../../context/SearchContext';

export default function PropertyList() {
  const navigate = useNavigate();
  const { searchQuery } = useGlobalSearch();
  const [allProperties, setAllProperties] = useState(() => getProperties());
  const [activeTab, setActiveTab] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  useEffect(() => {
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        if (items.length === 0) {
          setAllProperties([]);
          localStorage.removeItem('custom_properties');
          return;
        }
        const localList = getProperties();

        // Deduplicate incoming backend items by property name
        const seenNames = new Set();
        const uniqueItems = [];
        const duplicates = [];

        items.forEach((item) => {
          const nameKey = (item.name || '').trim().toLowerCase();
          if (nameKey && seenNames.has(nameKey)) {
            duplicates.push(item);
          } else {
            if (nameKey) seenNames.add(nameKey);
            uniqueItems.push(item);
          }
        });

        // Clean up duplicate entries from backend in background
        duplicates.forEach((d) => {
          if (d.id) apiClient.delete(`/properties/${d.id}`).catch(() => {});
        });

        const merged = uniqueItems.map((p) => {
          const local = localList.find((l) => String(l.id) === String(p.id) || l.name?.toLowerCase() === p.name?.toLowerCase());
          return {
            ...local,
            ...p,
            id: p.id,
            name: p.name || local?.name,
            code: local?.code || p.code || `PR-${String(p.id).padStart(2, '0')}`,
            category: local?.category || p.category || p.type,
            portfolioGroup: local?.portfolioGroup || p.portfolioGroup || 'Brooklyn & Queens',
            manager: p.manager || local?.manager || 'Unassigned',
            owner: p.owner || local?.owner || 'Unassigned',
            units: Array.isArray(p.units) && p.units.length > 0 ? p.units : (local?.units || []),
          };
        });
        setAllProperties(merged);
        localStorage.setItem('custom_properties', JSON.stringify(merged));
      }
    }).catch(() => {});
  }, []);

  const filteredProperties = useMemo(() => {
    let result = allProperties.filter((p) => (activeTab === 'Archived' ? p.archived : !p.archived));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const mgrName = typeof p.manager === 'object' && p.manager !== null ? p.manager.name : String(p.manager || '');
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.address || '').toLowerCase().includes(q) ||
          mgrName.toLowerCase().includes(q)
        );
      });
    }

    if (activeTab !== 'All' && activeTab !== 'Archived') {
      result = result.filter((p) => p.type === activeTab || p.category === activeTab);
    }

    if (sortBy === 'Name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'Revenue') {
      result = [...result].sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0));
    } else if (sortBy === 'Newest') {
      result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Deduplicate by property name to ensure no multiple cards appear
    const seenMap = new Set();
    result = result.filter((p) => {
      const key = (p.name || '').trim().toLowerCase();
      if (!key) return true;
      if (seenMap.has(key)) return false;
      seenMap.add(key);
      return true;
    });

    return result;
  }, [searchQuery, activeTab, sortBy, allProperties]);

  const getPropertyImage = (category) => {
    if (category === 'Office' || category === 'Warehouse') return '/properties/office.png';
    if (category === 'Townhome' || category === 'Single-Family' || category === 'Villa') return '/properties/villa.png';
    return '/properties/apt.png';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="shrink-0 flex items-center gap-3 border-r border-gray-100 pr-4 mr-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-black text-gray-900 leading-none">
              Properties <span className="text-gray-400 font-bold ml-1 text-[10px]">({filteredProperties.length})</span>
            </h2>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            {['All', 'Residential', 'Commercial', 'Mixed-Use', 'Archived'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50/50 border border-transparent rounded-lg text-[10px] font-bold text-gray-600 outline-none cursor-pointer transition-all"
            >
              <option value="Newest">Newest</option>
              <option value="Name">Name</option>
              <option value="Revenue">Revenue</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          <Button icon={Plus} onClick={() => navigate('/properties/add')} className="shadow-lg shadow-indigo-100 py-2 px-4 text-[11px] font-black">
            Add Property
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProperties.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No properties yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
              Start testing by onboarding your first real estate property, configuring address, ownership shares, and units.
            </p>
            <Button icon={Plus} onClick={() => navigate('/properties/add')}>
              Add Your First Property
            </Button>
          </div>
        ) : (
          filteredProperties.map((property) => (
          <Card
            key={property.id}
            hover
            onClick={() => navigate(`/properties/${property.id}`)}
            padding="p-0"
            className="overflow-hidden border-gray-100/60"
          >
            <div className="h-28 relative overflow-hidden group border-b border-gray-100">
              <img
                src={property.image || getPropertyImage(property.category)}
                alt={property.name}
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-2 right-2">
                <Badge variant={property.status === 'Active' ? 'success' : 'default'} className="backdrop-blur-md bg-white/20 text-white border-white/10 text-[9px] py-0 px-1.5">
                  {property.status}
                </Badge>
              </div>
              <div className="absolute bottom-2 left-3">
                <h3 className="text-white font-black text-sm leading-tight drop-shadow-sm">{property.name}</h3>
                <p className="text-white/75 font-bold text-[10px] drop-shadow-sm">{property.code || `PR-${property.id}`} · Mgr: {typeof property.manager === 'object' && property.manager !== null ? property.manager.name : (property.manager || 'Sarah Jenkins')}</p>
              </div>
              <div className="absolute bottom-2 right-3">
                <ArrowUpRight className="w-4 h-4 text-white/50" />
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-gray-500">
                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate text-[11px] font-medium">{property.address}</span>
              </div>

              <div className="grid grid-cols-3 gap-1 py-2 border-y border-gray-50 bg-gray-50/30 rounded-xl">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-800">{property.totalUnits}</p>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">Units</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-[10px] font-black text-emerald-600">{property.occupiedUnits}</p>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">Occ.</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-amber-600">{property.vacantUnits}</p>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">Vacant</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-wider">Monthly Billed</p>
                  <p className="text-[12px] font-black text-gray-800">{formatCurrency(property.monthlyRevenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-wider">Open Dues</p>
                  <p className="text-[12px] font-black text-red-600">{formatCurrency(property.pendingDues)}</p>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
      </div>
    </div>
  );
}
