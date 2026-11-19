import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, Layers, DollarSign, CheckCircle2,
  ChevronRight, ChevronLeft, Plus, Trash2, Sparkles, Upload, Download, Bed, Bath, Car
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import FileUpload from '../../components/ui/FileUpload';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { AMENITIES, US_STATES, UNIT_TYPES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { getOwners, getManagers, addOwner, addManager, updateManager } from '../../data/mockExtra';
import { getParkingStalls, saveParkingStalls } from '../../data/mockOperations';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

const STEPS = [
  'Basic Info',
  'Location & Ownership',
  'Building & Units',
  'Property Financials',
  'Review Property',
];

const DRAFT_KEY = 'rentlock_add_property_draft';

export default function AddProperty() {
  const navigate = useNavigate();
  const [ownersList, setOwnersList] = useState(() => getOwners().filter((o) => !o.archived));
  const [managersList, setManagersList] = useState(() => getManagers().filter((m) => !m.archived));

  useEffect(() => {
    // Fetch live managers
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

    // Fetch live owners
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

  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.currentStep === 'number') return parsed.currentStep;
      }
    } catch {}
    return 0;
  });

  const [savedPropertyId, setSavedPropertyId] = useState(null);

  // In-place Add Owner modal state
  const [isCreateOwnerOpen, setIsCreateOwnerOpen] = useState(false);
  const [newOwnerForm, setNewOwnerForm] = useState({
    name: '',
    ownerType: 'Individual',
    email: '',
    phone: '',
    mailingAddress: '',
    password: '',
    status: 'Active',
  });

  // In-place Add Manager modal state
  const [isCreateManagerOpen, setIsCreateManagerOpen] = useState(false);
  const [newManagerForm, setNewManagerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    spendingCap: 1000,
    employmentType: 'Full-Time',
    shift: 'Day (8 AM–5 PM)',
    status: 'Active',
  });

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) return parsed.form;
      }
    } catch {}
    return {
      name: '',
      code: '',
      type: 'Residential',
      category: 'Multifamily',
      portfolioGroup: 'Brooklyn & Queens',
      street: '',
      city: '',
      state: 'NY',
      zip: '',
      country: 'United States',
      manager: '',
      managementStartDate: new Date().toISOString().split('T')[0],
      buildingName: '',
      floors: '',
      status: 'Active',
      purchasePrice: '',
      acquisitionDate: '',
      closingCosts: '',
      marketValue: '',
      valuationSource: '',
      assessedValue: '',
      taxYear: '',
      lender: '',
      loanNumber: '',
      mortgageBalance: '',
      image: null,
    };
  });

  const [ownershipRows, setOwnershipRows] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.ownershipRows) && parsed.ownershipRows.length > 0) return parsed.ownershipRows;
      }
    } catch {}
    return [
      { ownerId: 1, name: '', share: 100 },
    ];
  });

  const [selectedAmenities, setSelectedAmenities] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.selectedAmenities)) return parsed.selectedAmenities;
      }
    } catch {}
    return ['Parking', 'Controlled Access'];
  });

  const [unitInventory, setUnitInventory] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.unitInventory)) return parsed.unitInventory;
      }
    } catch {}
    return [];
  });

  const [parkingStalls, setParkingStalls] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.parkingStalls)) return parsed.parkingStalls;
      }
    } catch {}
    return [];
  });

  const [isAddStallOpen, setIsAddStallOpen] = useState(false);
  const [addStallForm, setAddStallForm] = useState({
    spotNumber: '',
    spotType: 'Standard Covered',
    lotLocation: 'Sub-Level 1 (North Garage)',
    monthlyFee: '150',
  });

  const [isAssignStallOpen, setIsAssignStallOpen] = useState(false);
  const [selectedStallForAssign, setSelectedStallForAssign] = useState(null);
  const [assignStallForm, setAssignStallForm] = useState({
    stallId: '',
    unitNumber: '',
    assignedResident: '',
    vehicle: '',
    licensePlate: '',
    permitTag: '',
    monthlyFee: '150',
  });

  const [newUnit, setNewUnit] = useState({ unitNumber: '', floor: '', beds: '', baths: '', type: '', size: '', rent: '' });
  const [improvements, setImprovements] = useState([]);
  const [newImp, setNewImp] = useState({ item: '', date: '', cost: '' });

  // Auto-save draft whenever inputs change so accidental close/refresh never loses data
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          form,
          ownershipRows,
          selectedAmenities,
          unitInventory,
          parkingStalls,
          currentStep,
        })
      );
    } catch {}
  }, [form, ownershipRows, selectedAmenities, unitInventory, parkingStalls, currentStep]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const ownershipTotal = useMemo(
    () => ownershipRows.reduce((sum, r) => sum + (Number(r.share) || 0), 0),
    [ownershipRows]
  );

  const estimatedEquity = useMemo(() => {
    const mv = Number(form.marketValue) || 0;
    const mb = Number(form.mortgageBalance) || 0;
    return mv ? mv - mb : 0;
  }, [form.marketValue, form.mortgageBalance]);

  const generateCode = () => {
    const prefix = (form.name || 'PR')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
    update('code', `${prefix || 'PR'}-${Math.floor(100 + Math.random() * 899)}`);
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]));
  };

  const addOwnershipRow = () => {
    const remaining = Math.max(0, 100 - ownershipTotal);
    setOwnershipRows((prev) => [...prev, { ownerId: ownersList[1]?.id || 2, name: ownersList[1]?.name || 'Claire Bennett', share: remaining }]);
  };

  const handleOpenCreateOwner = () => {
    setNewOwnerForm({
      name: '',
      ownerType: 'Individual',
      email: '',
      phone: '',
      mailingAddress: '',
      password: '',
      status: 'Active',
    });
    setIsCreateOwnerOpen(true);
  };

  const handleSaveNewOwner = () => {
    if (!newOwnerForm.name.trim() || !newOwnerForm.email.trim()) {
      return toast.error('Legal Owner Name and Email are required.');
    }
    if (!newOwnerForm.password || newOwnerForm.password.trim().length < 4) {
      return toast.error('Please create an owner login password (minimum 4 characters).');
    }

    const created = addOwner({
      name: newOwnerForm.name.trim(),
      ownerType: newOwnerForm.ownerType,
      email: newOwnerForm.email.trim(),
      phone: newOwnerForm.phone.trim(),
      mailingAddress: newOwnerForm.mailingAddress.trim(),
      password: newOwnerForm.password.trim(),
      status: newOwnerForm.status,
      properties: [],
      allocations: [],
    });

    const refreshed = getOwners().filter((o) => !o.archived);
    setOwnersList(refreshed);

    const remaining = Math.max(0, 100 - ownershipTotal);
    setOwnershipRows((prev) => {
      if (prev.length === 1 && (!prev[0].name || prev[0].name === 'Claire Bennett')) {
        return [{ ownerId: created.id, name: created.name, share: 100 }];
      }
      return [...prev, { ownerId: created.id, name: created.name, share: remaining > 0 ? remaining : 10 }];
    });

    setIsCreateOwnerOpen(false);
    toast.success(`Owner ${created.name} created and added to property allocation!`);
  };

  const handleOpenCreateManager = () => {
    setNewManagerForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      spendingCap: 1000,
      employmentType: 'Full-Time',
      shift: 'Day (8 AM–5 PM)',
      status: 'Active',
    });
    setIsCreateManagerOpen(true);
  };

  const handleSaveNewManager = () => {
    if (!newManagerForm.name.trim() || !newManagerForm.email.trim()) {
      return toast.error('Manager Full Name and Email are required.');
    }
    if (!newManagerForm.password || newManagerForm.password.trim().length < 4) {
      return toast.error('Please create a manager login password (minimum 4 characters).');
    }

    const created = addManager({
      name: newManagerForm.name.trim(),
      email: newManagerForm.email.trim(),
      phone: newManagerForm.phone.trim(),
      password: newManagerForm.password.trim(),
      spendingCap: Number(newManagerForm.spendingCap) || 1000,
      employmentType: newManagerForm.employmentType,
      shift: newManagerForm.shift,
      status: newManagerForm.status,
      properties: [form.name].filter(Boolean),
    });

    const refreshed = getManagers().filter((m) => !m.archived);
    setManagersList(refreshed);
    update('manager', created.name);

    setIsCreateManagerOpen(false);
    toast.success(`Manager ${created.name} created and assigned!`);
  };

  const addUnitRow = async () => {
    const unitNum = (newUnit.unitNumber || '').trim() || `A-${101 + unitInventory.length}`;
    const floorNum = Number(newUnit.floor) || 1;
    const bedsNum = Number(newUnit.beds) || 2;
    const bathsNum = Number(newUnit.baths) || 1;
    const typeStr = `${bedsNum} BD / ${bathsNum} BA`;
    const sizeNum = Number(newUnit.size) || 900;
    const rentNum = Number(newUnit.rent) || 2100;

    const unitToAdd = {
      id: Date.now(),
      unitNumber: unitNum,
      floor: floorNum,
      beds: bedsNum,
      baths: bathsNum,
      type: typeStr,
      size: sizeNum,
      rent: rentNum,
      status: 'Vacant',
      building: form.buildingName || 'Main Building',
    };

    setUnitInventory((prev) => [...prev, unitToAdd]);
    toast.success(`Unit ${unitNum} added!`);

    setNewUnit({
      unitNumber: '',
      floor: '',
      beds: '',
      baths: '',
      type: '',
      size: '',
      rent: '',
    });

    // Trigger backend API calls so Network tab records the request
    try {
      let currentPropId = savedPropertyId;
      if (!currentPropId) {
        const fullAddress = `${form.street || '123 Main St'}, ${form.city || 'Brooklyn'}, ${form.state || 'NY'} ${form.zip || '11215'}`;
        const propRes = await apiClient.post('/properties', {
          name: form.name?.trim() || 'New Property',
          code: form.code?.trim() || 'PR-01',
          type: form.type || 'Residential',
          address: fullAddress,
          city: form.city || 'Brooklyn',
          state: form.state || 'NY',
          zipCode: form.zip || '11215',
          status: 'Active',
        }).catch(() => null);
        if (propRes?.id) {
          currentPropId = propRes.id;
          setSavedPropertyId(currentPropId);
        }
      }

      const createdUnit = await apiClient.post('/units', {
        propertyId: currentPropId || undefined,
        unitNumber: unitNum,
        floor: floorNum,
        bedrooms: bedsNum,
        bathrooms: bathsNum,
        sqft: sizeNum,
        rentAmount: rentNum,
        depositAmount: rentNum,
        status: 'Vacant',
      });
      if (createdUnit?.id) {
        setUnitInventory((prev) =>
          prev.map((item) =>
            item.unitNumber === unitNum ? { ...item, id: createdUnit.id, dbId: createdUnit.id } : item
          )
        );
      }
    } catch (apiErr) {
      console.warn('[AddProperty] Background API sync note:', apiErr.message);
    }
  };

  const handleRemoveUnit = async (unitToRemove) => {
    // 1. Immediately remove from local state
    setUnitInventory((prev) => prev.filter((x) => x.id !== unitToRemove.id && x.unitNumber !== unitToRemove.unitNumber));

    // 2. Remove from localStorage custom_units
    const saved = localStorage.getItem('custom_units');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        const filtered = list.filter((u) => u.id !== unitToRemove.id && u.unitNumber !== unitToRemove.unitNumber);
        localStorage.setItem('custom_units', JSON.stringify(filtered));
      } catch {}
    }

    // 3. Delete from MySQL database via DELETE /api/v1/units/:id
    try {
      const targetId = unitToRemove.dbId || unitToRemove.id;
      if (targetId && typeof targetId === 'number' && targetId < 1000000000000) {
        await apiClient.delete(`/units/${targetId}`);
      } else {
        // If id was a local timestamp, look up unit in DB by unitNumber and delete
        const searchRes = await apiClient.get('/units', { search: unitToRemove.unitNumber }).catch(() => null);
        const items = searchRes?.items || searchRes || [];
        const match = items.find((x) => x.unitNumber === unitToRemove.unitNumber);
        if (match?.id) {
          await apiClient.delete(`/units/${match.id}`);
        }
      }
      toast.success(`Unit ${unitToRemove.unitNumber} removed from database`);
    } catch (err) {
      console.warn('[AddProperty] Delete unit API error:', err.message);
      toast.success(`Unit ${unitToRemove.unitNumber} removed`);
    }
  };

  const fileInputRef = useRef(null);

  const downloadSampleCsv = () => {
    const csvContent =
      'Unit Number,Floor,Bedrooms,Bathrooms,Sq Ft,Market Rent,Status\n' +
      'A-101,1,1,1,750,1850,Vacant\n' +
      'A-102,1,2,1.5,950,2250,Vacant\n' +
      'A-201,2,2,2,1100,2600,Vacant\n' +
      'A-202,2,3,2,1300,3100,Vacant\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'units_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Sample CSV template downloaded!');
  };

  const handleCsvFileUpload = async (event) => {
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
        const floorIdx = getColIdx(['floor', 'level']);
        const bedsIdx = getColIdx(['bed', 'bedroom']);
        const bathsIdx = getColIdx(['bath', 'bathroom']);
        const sqftIdx = getColIdx(['sqft', 'size', 'square', 'area']);
        const rentIdx = getColIdx(['rent', 'marketrent', 'price', 'rate']);
        const statusIdx = getColIdx(['status']);

        const newUnitsList = [];
        const existingUnitNums = new Set(unitInventory.map((u) => String(u.unitNumber).trim().toLowerCase()));

        for (let i = 1; i < lines.length; i++) {
          const rowValues = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (rowValues.length === 0 || rowValues.every((v) => !v)) continue;

          const unitNum = (unitIdx !== -1 && rowValues[unitIdx])
            ? rowValues[unitIdx]
            : `U-${100 + unitInventory.length + newUnitsList.length + 1}`;

          // Avoid duplicate unit numbers in inventory
          if (existingUnitNums.has(unitNum.toLowerCase())) {
            continue;
          }
          existingUnitNums.add(unitNum.toLowerCase());

          const floorNum = Number(floorIdx !== -1 ? rowValues[floorIdx] : 1) || 1;
          const bedsNum = Number(bedsIdx !== -1 ? rowValues[bedsIdx] : 2) || 2;
          const bathsNum = Number(bathsIdx !== -1 ? rowValues[bathsIdx] : 1) || 1;
          const sqftNum = Number(sqftIdx !== -1 ? rowValues[sqftIdx] : 850) || 850;
          const rentNum = Number(rentIdx !== -1 ? rowValues[rentIdx] : 2000) || 2000;
          const statusVal = statusIdx !== -1 && rowValues[statusIdx] ? rowValues[statusIdx] : 'Vacant';

          newUnitsList.push({
            id: Date.now() + i * 17,
            unitNumber: unitNum,
            floor: floorNum,
            beds: bedsNum,
            baths: bathsNum,
            type: `${bedsNum} BD / ${bathsNum} BA`,
            size: sqftNum,
            rent: rentNum,
            status: statusVal,
            building: form.buildingName || 'Main Building',
          });
        }

        if (newUnitsList.length === 0) {
          toast.error('No new units found in CSV or all units already exist.');
          return;
        }

        // Add to local state
        setUnitInventory((prev) => [...prev, ...newUnitsList]);
        toast.success(`Successfully imported ${newUnitsList.length} units from CSV!`);

        // If property is already created/saved in DB, persist them to backend DB
        if (savedPropertyId) {
          for (const u of newUnitsList) {
            apiClient.post('/units', {
              propertyId: savedPropertyId,
              unitNumber: u.unitNumber,
              floor: u.floor,
              bedrooms: u.beds,
              bathrooms: u.baths,
              sqft: u.size,
              rentAmount: u.rent,
              depositAmount: u.rent,
              status: u.status || 'Vacant',
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[CSV Import Error]', err);
        toast.error('Failed to parse CSV file. Please verify file format.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const addImprovement = () => {
    if (!newImp.item || !newImp.cost) return;
    setImprovements((prev) => [...prev, { id: Date.now(), ...newImp, cost: Number(newImp.cost) }]);
    setNewImp({ item: '', date: '', cost: '' });
  };

  const handleAddStall = (e) => {
    if (e) e.preventDefault();
    if (!addStallForm.spotNumber.trim()) {
      return toast.error('Spot number is required (e.g. P-109).');
    }
    const newStall = {
      id: `STALL-TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      spotNumber: addStallForm.spotNumber.trim(),
      propertyName: form.name || form.buildingName || 'New Property',
      lotLocation: addStallForm.lotLocation.trim() || 'Sub-Level 1 (North Garage)',
      spotType: addStallForm.spotType || 'Standard Covered',
      monthlyFee: Number(addStallForm.monthlyFee) || 150,
      assignedResident: null,
      unitNumber: 'Unassigned',
      vehicle: '—',
      licensePlate: '—',
      permitTag: '—',
      status: 'Vacant · Available',
    };
    setParkingStalls((prev) => [...prev, newStall]);
    setAddStallForm({
      spotNumber: '',
      spotType: 'Standard Covered',
      lotLocation: 'Sub-Level 1 (North Garage)',
      monthlyFee: '150',
    });
    setIsAddStallOpen(false);
    toast.success(`Parking stall ${newStall.spotNumber} added!`);
  };

  const handleOpenAssign = (stall) => {
    const targetStall = stall || (parkingStalls.find((s) => !s.assignedResident) || parkingStalls[0]);
    if (!targetStall) {
      return toast.error('Please create at least one parking stall first.');
    }
    setSelectedStallForAssign(targetStall);
    setAssignStallForm({
      stallId: targetStall.id,
      unitNumber: targetStall.unitNumber !== 'Unassigned' ? targetStall.unitNumber : (unitInventory[0]?.unitNumber || ''),
      assignedResident: targetStall.assignedResident || '',
      vehicle: targetStall.vehicle !== '—' ? targetStall.vehicle : '',
      licensePlate: targetStall.licensePlate !== '—' ? targetStall.licensePlate : '',
      permitTag: targetStall.permitTag !== '—' ? targetStall.permitTag : `PRM-${targetStall.spotNumber}`,
      monthlyFee: targetStall.monthlyFee || '150',
    });
    setIsAssignStallOpen(true);
  };

  const handleAssignStallSubmit = (e) => {
    if (e) e.preventDefault();
    if (!assignStallForm.stallId) {
      return toast.error('Please select a parking stall.');
    }
    if (!assignStallForm.unitNumber.trim() && !assignStallForm.assignedResident.trim()) {
      return toast.error('Unit Number or Resident Name is required for assignment.');
    }

    setParkingStalls((prev) =>
      prev.map((s) => {
        if (s.id === assignStallForm.stallId) {
          const resName = assignStallForm.assignedResident.trim() || `Unit ${assignStallForm.unitNumber.trim()} Resident`;
          return {
            ...s,
            unitNumber: assignStallForm.unitNumber.trim() || 'Unassigned',
            assignedResident: resName,
            vehicle: assignStallForm.vehicle.trim() || '—',
            licensePlate: assignStallForm.licensePlate.trim() || '—',
            permitTag: assignStallForm.permitTag.trim() || '—',
            monthlyFee: Number(assignStallForm.monthlyFee) || s.monthlyFee || 150,
            status: 'Assigned',
          };
        }
        return s;
      })
    );
    setIsAssignStallOpen(false);
    toast.success(`Stall ${selectedStallForAssign?.spotNumber || ''} assigned!`);
  };

  const handleRemoveStall = (stallId) => {
    setParkingStalls((prev) => prev.filter((s) => s.id !== stallId));
    toast.success('Parking stall removed');
  };

  const handleReleaseStall = (stallId) => {
    setParkingStalls((prev) =>
      prev.map((s) =>
        s.id === stallId
          ? {
              ...s,
              assignedResident: null,
              unitNumber: 'Unassigned',
              vehicle: '—',
              licensePlate: '—',
              permitTag: '—',
              status: 'Vacant · Available',
            }
          : s
      )
    );
    toast.success('Stall released and marked vacant');
  };

  const isStepValid = () => {
    if (currentStep === 0) return Boolean(form.name && form.code && form.type);
    if (currentStep === 1) {
      if (!form.street || !form.city || !form.state || !form.zip || !form.manager || !form.managementStartDate) return false;
      return Math.abs(ownershipTotal - 100) < 0.01;
    }
    return true;
  };

  const handleSave = async (draftOnly = false) => {
    const fullAddress = `${form.street || '123 Main St'}, ${form.city || 'Brooklyn'}, ${form.state || 'NY'} ${form.zip || '11215'}`;
    const newProperty = {
      id: savedPropertyId || Date.now(),
      name: form.name || 'New Property',
      code: form.code || 'PR-01',
      type: form.type,
      category: form.category,
      portfolioGroup: form.portfolioGroup,
      address: fullAddress,
      street: form.street,
      city: form.city || 'Brooklyn',
      state: form.state || 'NY',
      zip: form.zip || '11215',
      country: form.country,
      floors: Number(form.floors) || 1,
      totalUnits: unitInventory.length,
      occupiedUnits: 0,
      vacantUnits: unitInventory.length,
      amenities: selectedAmenities,
      owners: ownershipRows,
      owner: ownershipRows.map((o) => `${o.name} (${o.share}%)`).join(', '),
      manager: form.manager,
      managementStartDate: form.managementStartDate,
      status: draftOnly ? 'Draft' : form.status,
      archived: false,
      monthlyRevenue: unitInventory.reduce((s, u) => s + (Number(u.rent) || 0), 0),
      pendingDues: 0,
      financials: {
        purchasePrice: Number(form.purchasePrice) || 0,
        acquisitionDate: form.acquisitionDate,
        closingCosts: Number(form.closingCosts) || 0,
        marketValue: Number(form.marketValue) || 0,
        valuationSource: form.valuationSource,
        assessedValue: Number(form.assessedValue) || 0,
        taxYear: form.taxYear,
        lender: form.lender,
        loanNumber: form.loanNumber,
        mortgageBalance: Number(form.mortgageBalance) || 0,
        improvements,
      },
      image: form.image,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // 1. Save to local storage for immediate offline reactivity
    const existing = JSON.parse(localStorage.getItem('custom_properties') || '[]');
    const filtered = existing.filter((p) => p.id !== newProperty.id);
    localStorage.setItem('custom_properties', JSON.stringify([...filtered, newProperty]));

    // Also update custom_units for all units in this property
    const existingUnits = JSON.parse(localStorage.getItem('custom_units') || '[]');
    const newUnitsFormatted = unitInventory.map((u) => ({
      ...u,
      propertyId: newProperty.id,
      propertyName: newProperty.name,
      building: form.buildingName || 'Main Building',
    }));
    localStorage.setItem('custom_units', JSON.stringify([...existingUnits.filter((u) => u.propertyId !== newProperty.id), ...newUnitsFormatted]));

    // 2. Call backend API to persist property & units in MySQL
    try {
      const primaryOwner = ownershipRows[0];
      const selectedMgr = managersList.find((m) => m.name.toLowerCase() === (form.manager || '').toLowerCase());
      const payload = {
        name: newProperty.name,
        code: newProperty.code,
        type: newProperty.type,
        category: newProperty.category,
        portfolioGroup: newProperty.portfolioGroup,
        address: fullAddress,
        city: newProperty.city,
        state: newProperty.state,
        zipCode: newProperty.zip,
        manager: form.manager,
        managerId: selectedMgr?.id,
        owner: primaryOwner?.name,
        ownerId: primaryOwner?.ownerId,
        units: unitInventory,
        parkingStalls: parkingStalls,
      };

      let createdProp = null;
      if (savedPropertyId) {
        createdProp = await apiClient.put(`/properties/${savedPropertyId}`, payload);
      } else {
        createdProp = await apiClient.post('/properties', payload);
      }

      const backendProp = createdProp?.data || createdProp;
      const realPropId = backendProp?.id;

      if (realPropId && String(realPropId) !== String(newProperty.id)) {
        // Sync custom_properties with real ID
        const currentProps = JSON.parse(localStorage.getItem('custom_properties') || '[]');
        const updatedProps = currentProps.map((p) =>
          String(p.id) === String(newProperty.id) || p.name === newProperty.name
            ? { ...p, id: realPropId }
            : p
        );
        localStorage.setItem('custom_properties', JSON.stringify(updatedProps));

        // Sync custom_units with real propertyId
        const currentUnits = JSON.parse(localStorage.getItem('custom_units') || '[]');
        const updatedUnits = currentUnits.map((u) =>
          String(u.propertyId) === String(newProperty.id) || (u.propertyName && u.propertyName.toLowerCase() === newProperty.name.toLowerCase())
            ? { ...u, propertyId: realPropId, propertyName: newProperty.name }
            : u
        );
        localStorage.setItem('custom_units', JSON.stringify(updatedUnits));
      }

      // Persist parking stalls for this property
      if (parkingStalls.length > 0) {
        const existingStalls = getParkingStalls();
        const mappedNewStalls = parkingStalls.map((s, idx) => ({
          ...s,
          id: `STALL-${Date.now()}-${idx + 1}`,
          propertyId: realPropId || newProperty.id,
          propertyName: newProperty.name,
        }));
        const combinedStalls = [...mappedNewStalls, ...existingStalls.filter((es) => es.propertyName !== newProperty.name)];
        saveParkingStalls(combinedStalls);
        mappedNewStalls.forEach((st) => {
          apiClient.post('/operations/parking', st).catch(() => {});
        });
      }

      // Associate property with assigned manager in roster
      try {
        const mgrList = getManagers();
        const currentMgr = mgrList.find((m) => m.name.toLowerCase() === (form.manager || '').toLowerCase());
        if (currentMgr) {
          const existingProps = currentMgr.properties || [];
          if (!existingProps.includes(newProperty.name)) {
            updateManager(currentMgr.id, {
              ...currentMgr,
              properties: [...existingProps, newProperty.name],
            });
          }
        }
      } catch {}
    } catch (apiErr) {
      console.warn('[AddProperty] API save fallback:', apiErr.message);
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}

    toast.success('Property & Units created successfully!');
    navigate('/properties');
  };

  const handleNext = () => {
    if (!isStepValid()) {
      if (currentStep === 1 && Math.abs(ownershipTotal - 100) >= 0.01) {
        return toast.error(`Ownership shares must total 100.00% (currently ${ownershipTotal.toFixed(2)}%)`);
      }
      return toast.error('Please complete required fields before continuing');
    }
    if (currentStep < STEPS.length - 1) setCurrentStep((prev) => prev + 1);
    else handleSave(false);
  };

  const stepIcons = [Building2, MapPin, Layers, DollarSign, CheckCircle2];
  const StepIcon = stepIcons[currentStep] || Building2;

  return (
    <div className="max-w-screen-2xl mx-auto">
      <PageHeader
        title="Add New Property"
        subtitle={`Step ${currentStep + 1} of ${STEPS.length}: ${STEPS[currentStep]}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Properties', path: '/properties' },
          { label: 'Add Property' },
        ]}
        onBack={() => (currentStep > 0 ? setCurrentStep((s) => s - 1) : navigate('/properties'))}
        steps={STEPS}
        currentStep={currentStep}
      />

      <div className="max-w-5xl mx-auto mt-4 pb-16">
        <Card className="shadow-xl shadow-gray-200/40 border-gray-100 bg-white" padding="p-0">
          {/* Header Bar */}
          <div className="bg-gray-50/70 px-6 py-4 border-b border-gray-100 rounded-t-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-sm border border-gray-100">
                <StepIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Step {currentStep + 1}: {STEPS[currentStep]}</h3>
                <p className="text-xs text-gray-500">U.S. property onboarding workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} icon={ChevronLeft} disabled={currentStep === 0}>
                Back
              </Button>
              <Button
                onClick={handleNext}
                icon={currentStep === STEPS.length - 1 ? CheckCircle2 : ChevronRight}
                className={currentStep === STEPS.length - 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}
              >
                {currentStep === STEPS.length - 1 ? 'Create Property' : 'Continue'}
              </Button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* STEP 1: BASIC INFO */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Property Name" required placeholder="e.g., Sunrise Residency" value={form.name} onChange={(e) => update('name', e.target.value)} />
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input label="Property Code (Unique)" required placeholder="e.g., SR-001" value={form.code} onChange={(e) => update('code', e.target.value)} />
                    </div>
                    <Button type="button" variant="secondary" icon={Sparkles} onClick={generateCode} className="mb-0.5">Auto</Button>
                  </div>
                </div>
                <Select label="Property Use" required options={['Residential', 'Commercial', 'Mixed-Use', 'Industrial / Warehouse']} value={form.type} onChange={(e) => update('type', e.target.value)} />
                <Select label="Building Type" required options={['Multifamily', 'Single-Family', 'Townhome', 'Office', 'Retail', 'Warehouse', 'Mixed-Use']} value={form.category} onChange={(e) => update('category', e.target.value)} />
                <Select label="Portfolio Group" options={['Brooklyn & Queens', 'New Jersey', 'Texas Commercial & Resi', 'Core East Coast']} value={form.portfolioGroup} onChange={(e) => update('portfolioGroup', e.target.value)} />
              </div>
            )}

            {/* STEP 2: LOCATION & OWNERSHIP */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Street Address" required placeholder="123 Maple Avenue" className="md:col-span-2" value={form.street} onChange={(e) => update('street', e.target.value)} />
                  <Input label="Country" disabled value={form.country} />
                  <Input label="City" required placeholder="Brooklyn" value={form.city} onChange={(e) => update('city', e.target.value)} />
                  <Select label="State" required options={US_STATES} value={form.state} onChange={(e) => update('state', e.target.value)} />
                  <Input label="ZIP Code" required placeholder="11215" value={form.zip} onChange={(e) => update('zip', e.target.value)} />
                </div>

                {/* Ownership Allocation */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Owners &amp; Entities Allocation</h4>
                      <p className="text-xs text-gray-500">Total ownership percentage must equal 100.00%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenCreateOwner}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        + Create New Owner
                      </button>
                      <Badge variant={Math.abs(ownershipTotal - 100) < 0.01 ? 'success' : 'danger'}>
                        Total: {ownershipTotal.toFixed(2)}%
                      </Badge>
                      <Button type="button" variant="secondary" icon={Plus} size="sm" onClick={addOwnershipRow}>Add Co-Owner</Button>
                    </div>
                  </div>
                  {ownershipRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-gray-100">
                      <div className="col-span-7">
                        <Select
                          label="Owner / Entity"
                          options={ownersList.map((o) => ({ value: o.name, label: `${o.name} (${o.ownerType || 'Entity'})` }))}
                          value={row.name}
                          onChange={(e) => {
                            const matched = ownersList.find((o) => o.name === e.target.value);
                            setOwnershipRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ownerId: matched?.id || r.ownerId, name: e.target.value } : r)));
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          label="Share (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={row.share}
                          onChange={(e) => setOwnershipRows((prev) => prev.map((r, i) => (i === idx ? { ...r, share: e.target.value } : r)))}
                        />
                      </div>
                      <div className="col-span-1 pt-5 text-right">
                        {ownershipRows.length > 1 && (
                          <button type="button" onClick={() => setOwnershipRows((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Management Assignment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[13px] font-bold text-gray-700">
                        Assigned Manager <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenCreateManager}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        + Create New Manager
                      </button>
                    </div>
                    <Select
                      options={managersList.map((m) => m.name)}
                      value={form.manager}
                      onChange={(e) => update('manager', e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Management Start Date"
                      required
                      type="date"
                      value={form.managementStartDate}
                      onChange={(e) => update('managementStartDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: BUILDING & UNITS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input label="Building / Block Name" placeholder="e.g. Main Building" value={form.buildingName} onChange={(e) => update('buildingName', e.target.value)} />
                  <Input label="Total Floors" type="number" min={1} placeholder="e.g. 4" value={form.floors} onChange={(e) => update('floors', e.target.value)} />
                  <Select label="Property Status" options={['Active', 'Under Construction', 'Onboarding']} value={form.status} onChange={(e) => update('status', e.target.value)} />
                  <div className="flex items-end gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleCsvFileUpload}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      icon={Upload}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex-1"
                    >
                      Import Units CSV
                    </Button>
                    <button
                      type="button"
                      onClick={downloadSampleCsv}
                      title="Download Sample CSV Template"
                      className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Building Amenities (11 Standard)</h4>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                          selectedAmenities.includes(amenity) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline Unit Inventory */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">Unit Inventory ({unitInventory.length})</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Input
                        label="Unit #"
                        placeholder="e.g. A-101"
                        value={newUnit.unitNumber}
                        onChange={(e) => setNewUnit({ ...newUnit, unitNumber: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Input
                        label="Floor"
                        type="number"
                        min={0}
                        placeholder="e.g. 1"
                        value={newUnit.floor}
                        onChange={(e) => setNewUnit({ ...newUnit, floor: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Beds / Baths
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Beds manual number input */}
                        <div className="relative flex items-center">
                          <Bed className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="2 Bed"
                            value={newUnit.beds}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewUnit((prev) => ({
                                ...prev,
                                beds: val,
                                type: `${val || 0} BD / ${prev.baths || 1} BA`,
                              }));
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-2 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                            title="Number of Bedrooms (e.g. 1, 2, 3)"
                          />
                        </div>
                        {/* Baths manual number input */}
                        <div className="relative flex items-center">
                          <Bath className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            placeholder="1 Bath"
                            value={newUnit.baths}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewUnit((prev) => ({
                                ...prev,
                                baths: val,
                                type: `${prev.beds || 2} BD / ${val || 0} BA`,
                              }));
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-2 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                            title="Number of Bathrooms (e.g. 1, 1.5, 2)"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Sq Ft"
                        type="number"
                        min={0}
                        placeholder="e.g. 900"
                        value={newUnit.size}
                        onChange={(e) => setNewUnit({ ...newUnit, size: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Market Rent ($)"
                        type="number"
                        min={0}
                        placeholder="e.g. 2100"
                        value={newUnit.rent}
                        onChange={(e) => setNewUnit({ ...newUnit, rent: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="button" icon={Plus} onClick={addUnitRow} className="w-full py-2.5">
                        Add Unit
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className="py-2">Unit #</th>
                          <th className="py-2">Floor</th>
                          <th className="py-2">Beds / Baths</th>
                          <th className="py-2">Sq Ft</th>
                          <th className="py-2">Market Rent</th>
                          <th className="py-2 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {unitInventory.map((u) => (
                          <tr key={u.id}>
                            <td className="py-2 font-bold text-gray-900">{u.unitNumber}</td>
                            <td className="py-2">{u.floor}</td>
                            <td className="py-2 font-medium text-gray-700">{u.type || `${u.beds || 2} BD / ${u.baths || 1} BA`}</td>
                            <td className="py-2">{u.size} sq ft</td>
                            <td className="py-2 font-semibold text-emerald-600">{formatCurrency(u.rent)}/mo</td>
                            <td className="py-2 text-right">
                              <button type="button" onClick={() => handleRemoveUnit(u)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="Remove from database"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inline Parking Spaces (Create & Assign) */}
                <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Parking Spaces ({parkingStalls.length})
                      </h4>
                      <p className="text-xs text-gray-500">
                        Create and assign parking stalls for this property
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        icon={CheckCircle2}
                        onClick={() => {
                          if (parkingStalls.length === 0) {
                            return toast.error('Please add at least one parking spot first.');
                          }
                          handleOpenAssign();
                        }}
                        className="py-1.5 px-3 text-xs font-semibold"
                      >
                        Assign Stall
                      </Button>
                      <Button
                        type="button"
                        icon={Plus}
                        onClick={() => setIsAddStallOpen(true)}
                        className="py-1.5 px-3 text-xs font-semibold shadow-md shadow-indigo-100"
                      >
                        + Add New Spot
                      </Button>
                    </div>
                  </div>

                  {parkingStalls.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <Car className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                      <p className="text-xs font-semibold text-gray-700">No parking stalls added yet</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Click &ldquo;+ Add New Spot&rdquo; to add parking spaces for this property.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="py-2">Spot #</th>
                            <th className="py-2">Spot Type</th>
                            <th className="py-2">Garage / Lot Location</th>
                            <th className="py-2">Assigned Unit / Resident</th>
                            <th className="py-2">Monthly Fee</th>
                            <th className="py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {parkingStalls.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-2 font-bold text-gray-900">{s.spotNumber}</td>
                              <td className="py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                                  {s.spotType}
                                </span>
                              </td>
                              <td className="py-2 text-gray-600">{s.lotLocation || '—'}</td>
                              <td className="py-2">
                                {s.assignedResident || s.unitNumber !== 'Unassigned' ? (
                                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-[11px]">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    {s.unitNumber !== 'Unassigned' ? `Unit ${s.unitNumber}` : ''}
                                    {s.assignedResident && s.assignedResident !== `Unit ${s.unitNumber} Resident` ? ` · ${s.assignedResident}` : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-[11px]">Vacant · Available</span>
                                )}
                              </td>
                              <td className="py-2 font-semibold text-gray-800">
                                {formatCurrency(s.monthlyFee || 0)}/mo
                              </td>
                              <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {s.assignedResident || s.unitNumber !== 'Unassigned' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReleaseStall(s.id)}
                                      className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 hover:bg-amber-50 rounded cursor-pointer transition-colors"
                                      title="Release stall (mark vacant)"
                                    >
                                      Release
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAssign(s)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 hover:bg-indigo-50 rounded cursor-pointer font-semibold transition-colors"
                                      title="Assign this stall"
                                    >
                                      Assign
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStall(s.id)}
                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                    title="Delete stall"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

            {/* STEP 4: PROPERTY FINANCIALS (OPTIONAL) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-indigo-700">Estimated Equity (Auto-Calculated)</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Estimated Market Value minus Current Mortgage Balance</p>
                  </div>
                  <p className="text-2xl font-black text-indigo-900">{formatCurrency(estimatedEquity)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Purchase Price ($)" type="number" placeholder="0" value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} />
                  <Input label="Acquisition Date" type="date" value={form.acquisitionDate} onChange={(e) => update('acquisitionDate', e.target.value)} />
                  <Input label="Closing Costs ($)" type="number" placeholder="0" value={form.closingCosts} onChange={(e) => update('closingCosts', e.target.value)} />
                  <Input label="Estimated Market Value ($)" type="number" placeholder="0" value={form.marketValue} onChange={(e) => update('marketValue', e.target.value)} />
                  <Input label="Valuation Source" placeholder="e.g. Independent Appraisal" value={form.valuationSource} onChange={(e) => update('valuationSource', e.target.value)} />
                  <Input label="Assessed Tax Value ($)" type="number" placeholder="0" value={form.assessedValue} onChange={(e) => update('assessedValue', e.target.value)} />
                  <Input label="Tax Year" placeholder="e.g. 2026" value={form.taxYear} onChange={(e) => update('taxYear', e.target.value)} />
                  <Input label="Mortgage Balance ($)" type="number" placeholder="0" value={form.mortgageBalance} onChange={(e) => update('mortgageBalance', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW PROPERTY */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black uppercase text-gray-500">Basic &amp; Location</h4>
                      <button type="button" onClick={() => setCurrentStep(0)} className="text-xs text-indigo-600 font-semibold cursor-pointer">Edit</button>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{form.name} ({form.code})</p>
                    <p className="text-xs text-gray-600 mt-1">{form.street}, {form.city}, {form.state} {form.zip}</p>
                    <p className="text-xs text-gray-500 mt-1">Manager: {form.manager} · Start {form.managementStartDate}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black uppercase text-gray-500">Ownership &amp; Units</h4>
                      <button type="button" onClick={() => setCurrentStep(1)} className="text-xs text-indigo-600 font-semibold cursor-pointer">Edit</button>
                    </div>
                    <p className="text-xs text-gray-700">Owners: {ownershipRows.map((o) => `${o.name} (${o.share}%)`).join(', ')}</p>
                    <p className="text-xs text-gray-700 mt-1">Units configured: <strong>{unitInventory.length}</strong> · Parking stalls: <strong>{parkingStalls.length}</strong></p>
                    <p className="text-xs text-gray-700 mt-1">Estimated Equity: <strong>{formatCurrency(estimatedEquity)}</strong></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUpload
                    label="Property Photos"
                    accept="image/*"
                    onChange={(files) => {
                      if (files?.[0]) {
                        const reader = new FileReader();
                        reader.onload = (e) => update('image', e.target.result);
                        reader.readAsDataURL(files[0]);
                      }
                    }}
                  />
                  <FileUpload label="Deeds, Insurance & Inspection Docs (PDF)" accept=".pdf" multiple />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* IN-PLACE ADD OWNER MODAL (NEVER NAVIGATES AWAY) */}
      <Modal
        isOpen={isCreateOwnerOpen}
        onClose={() => setIsCreateOwnerOpen(false)}
        title="Add New Property Owner / Holding Entity"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOwnerOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleSaveNewOwner}>
              Create Owner Profile
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 leading-relaxed">
            <strong>PORTAL LOGIN SETUP:</strong> Create the owner profile and set their login password. The owner can sign in to the Owner Portal using their email address and this password.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Legal Owner / Entity Name *"
              placeholder="e.g. Bennett Realty Holdings LLC or Rocky"
              value={newOwnerForm.name}
              onChange={(e) => setNewOwnerForm({ ...newOwnerForm, name: e.target.value })}
            />
            <Select
              label="Owner Entity Type"
              options={['Individual', 'LLC', 'Trust', 'Corporation']}
              value={newOwnerForm.ownerType}
              onChange={(e) => setNewOwnerForm({ ...newOwnerForm, ownerType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Primary Contact Email (Login ID) *"
              type="email"
              placeholder="e.g. owner@example.com"
              value={newOwnerForm.email}
              onChange={(e) => setNewOwnerForm({ ...newOwnerForm, email: e.target.value })}
            />
            <Input
              label="U.S. Phone Number"
              placeholder="+1 (212) 555-0188"
              value={newOwnerForm.phone}
              onChange={(e) => setNewOwnerForm({ ...newOwnerForm, phone: e.target.value })}
            />
          </div>

          <Input
            label="Address"
            placeholder="e.g. 725 Fifth Ave, Apt 24B, New York, NY 10022"
            value={newOwnerForm.mailingAddress}
            onChange={(e) => setNewOwnerForm({ ...newOwnerForm, mailingAddress: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-2">
              <Input
                label="Owner Login Password *"
                type="text"
                placeholder="Set password (e.g. demo123 or Pass@123)"
                value={newOwnerForm.password}
                onChange={(e) => setNewOwnerForm({ ...newOwnerForm, password: e.target.value })}
                helperText="Admin sets this password. Owner will sign in with their email and this password."
              />
            </div>
            <div>
              <Select
                label="Initial Status"
                options={['Active', 'Pending Setup']}
                value={newOwnerForm.status}
                onChange={(e) => setNewOwnerForm({ ...newOwnerForm, status: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* IN-PLACE ADD MANAGER MODAL (NEVER NAVIGATES AWAY) */}
      <Modal
        isOpen={isCreateManagerOpen}
        onClose={() => setIsCreateManagerOpen(false)}
        title="Add New Property Manager"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateManagerOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleSaveNewManager}>
              Create Manager Profile
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 leading-relaxed">
            <strong>PORTAL LOGIN SETUP:</strong> Create the manager profile and set their login password. The manager can sign in to the Manager Workspace using their email address and this password.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Manager Full Name *"
              placeholder="e.g. David Brooks or Sarah Jenkins"
              value={newManagerForm.name}
              onChange={(e) => setNewManagerForm({ ...newManagerForm, name: e.target.value })}
            />
            <Input
              label="Primary Contact Email (Login ID) *"
              type="email"
              placeholder="e.g. manager@rentlock.com"
              value={newManagerForm.email}
              onChange={(e) => setNewManagerForm({ ...newManagerForm, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Manager Login Password *"
              type="text"
              placeholder="Set password (e.g. 123456 or Pass@123)"
              value={newManagerForm.password}
              onChange={(e) => setNewManagerForm({ ...newManagerForm, password: e.target.value })}
              helperText="Manager will use this password to sign into the Manager Workspace."
            />
            <Input
              label="U.S. Phone Number"
              placeholder="+1 (718) 555-0192"
              value={newManagerForm.phone}
              onChange={(e) => setNewManagerForm({ ...newManagerForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <Select
                label="Spending Approval Cap"
                options={['$500', '$1000', '$2500', '$5000', '$10000']}
                value={`$${newManagerForm.spendingCap}`}
                onChange={(e) => setNewManagerForm({ ...newManagerForm, spendingCap: Number(e.target.value.replace('$', '')) || 1000 })}
                helperText="Work orders above this cap require Admin approval."
              />
            </div>
            <div>
              <Select
                label="Employment Type"
                options={['Full-Time', 'Part-Time', 'Contract']}
                value={newManagerForm.employmentType}
                onChange={(e) => setNewManagerForm({ ...newManagerForm, employmentType: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Initial Status"
                options={['Active', 'On Leave']}
                value={newManagerForm.status}
                onChange={(e) => setNewManagerForm({ ...newManagerForm, status: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* ADD NEW PARKING STALL MODAL                 */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddStallOpen}
        onClose={() => setIsAddStallOpen(false)}
        title="Add New Parking Stall"
        size="md"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddStallOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStall}>
              Create Stall
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddStall} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Spot Number *"
              required
              placeholder="e.g. P-109 or P-EV-03"
              value={addStallForm.spotNumber}
              onChange={(e) => setAddStallForm({ ...addStallForm, spotNumber: e.target.value })}
            />
            <Select
              label="Spot Type"
              value={addStallForm.spotType}
              options={['Standard Covered', 'EV Charging Level 2', 'Visitor Reserved', 'Handicap Accessible', 'Open Surface']}
              onChange={(e) => setAddStallForm({ ...addStallForm, spotType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Building / Property"
              value={form.name || form.buildingName || 'This Property'}
              readOnly
              className="bg-gray-50 text-gray-600"
            />
            <Input
              label="Garage / Lot Location"
              placeholder="e.g. Sub-Level 1 (North Garage)"
              value={addStallForm.lotLocation}
              onChange={(e) => setAddStallForm({ ...addStallForm, lotLocation: e.target.value })}
            />
          </div>

          <div>
            <Input
              label="Default Monthly Fee ($)"
              type="number"
              placeholder="150"
              value={addStallForm.monthlyFee}
              onChange={(e) => setAddStallForm({ ...addStallForm, monthlyFee: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* ASSIGN PARKING STALL MODAL                     */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isAssignStallOpen}
        onClose={() => setIsAssignStallOpen(false)}
        title={`Assign Parking Stall · ${selectedStallForAssign?.spotNumber || ''}`}
        size="md"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAssignStallOpen(false)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleAssignStallSubmit}>
              Confirm Assignment
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAssignStallSubmit} className="space-y-4 text-xs">
          {parkingStalls.length > 1 && (
            <Select
              label="Select Parking Stall *"
              value={assignStallForm.stallId}
              options={parkingStalls.map((s) => ({
                value: s.id,
                label: `${s.spotNumber} (${s.spotType}${s.unitNumber !== 'Unassigned' ? ` · Assigned Unit ${s.unitNumber}` : ' · Available'})`,
              }))}
              onChange={(e) => {
                const target = parkingStalls.find((s) => s.id === e.target.value);
                if (target) {
                  setSelectedStallForAssign(target);
                  setAssignStallForm((prev) => ({
                    ...prev,
                    stallId: target.id,
                    unitNumber: target.unitNumber !== 'Unassigned' ? target.unitNumber : (prev.unitNumber || unitInventory[0]?.unitNumber || ''),
                    assignedResident: target.assignedResident || prev.assignedResident,
                    monthlyFee: target.monthlyFee || prev.monthlyFee,
                  }));
                }
              }}
            />
          )}

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-indigo-950">Spot: {selectedStallForAssign?.spotNumber}</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {selectedStallForAssign?.spotType}
              </span>
            </div>
            <p className="text-indigo-800 text-[11px]">Location: {selectedStallForAssign?.lotLocation || 'Sub-Level 1 (North Garage)'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unitInventory.length > 0 ? (
              <Select
                label="Assign to Unit *"
                value={assignStallForm.unitNumber}
                options={[
                  ...unitInventory.map((u) => ({ value: u.unitNumber, label: `Unit ${u.unitNumber}` })),
                  { value: 'Other / Non-Unit', label: 'Other / Custom Resident' },
                ]}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssignStallForm((prev) => ({
                    ...prev,
                    unitNumber: val === 'Other / Non-Unit' ? '' : val,
                    assignedResident: val !== 'Other / Non-Unit' ? (prev.assignedResident || `Unit ${val} Resident`) : '',
                  }));
                }}
              />
            ) : (
              <Input
                label="Unit Number *"
                placeholder="e.g. A-101"
                value={assignStallForm.unitNumber}
                onChange={(e) => setAssignStallForm({ ...assignStallForm, unitNumber: e.target.value })}
              />
            )}

            <Input
              label="Resident Name"
              placeholder="e.g. Jordan Hayes"
              value={assignStallForm.assignedResident}
              onChange={(e) => setAssignStallForm({ ...assignStallForm, assignedResident: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Vehicle (Make, Model, Color)"
              placeholder="e.g. Tesla Model 3 (White)"
              value={assignStallForm.vehicle}
              onChange={(e) => setAssignStallForm({ ...assignStallForm, vehicle: e.target.value })}
            />
            <Input
              label="License Plate Number"
              placeholder="e.g. NY · KJH-9021"
              value={assignStallForm.licensePlate}
              onChange={(e) => setAssignStallForm({ ...assignStallForm, licensePlate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Parking Permit Tag #"
              placeholder="e.g. PRM-2026-001"
              value={assignStallForm.permitTag}
              onChange={(e) => setAssignStallForm({ ...assignStallForm, permitTag: e.target.value })}
            />
            <Input
              label="Monthly Parking Fee ($/mo)"
              type="number"
              value={assignStallForm.monthlyFee}
              onChange={(e) => setAssignStallForm({ ...assignStallForm, monthlyFee: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
