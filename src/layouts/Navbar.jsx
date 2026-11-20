import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { Search, Bell, Plus, Menu, LogOut, User, Settings, ChevronDown, X } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useGlobalSearch } from '../context/SearchContext';
import { getGlobalSearchResults } from '../utils/searchUtils';
import { getManagerWorkspaceState } from '../data/managerWorkspaceData';
import { getOwnerPortalState } from '../data/ownerPortalData';
import {
  getUserNotifications,
  markAllUserNotificationsRead,
  markNotificationRead,
} from '../data/mockNotifications';
import toast from 'react-hot-toast';
import Avatar from '../components/ui/Avatar';
import { ROLE_LABELS } from '../utils/constants';

export default function Navbar() {
  const { toggleMobile } = useSidebar();
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useGlobalSearch();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDocs, setShowDocs] = useState(false);
  
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const quickAddRef = useRef(null);
  const searchRef = useRef(null);

  const isTenant = user?.role === 'tenant';
  const isManager = user?.role === 'manager';
  const isOwner = user?.role === 'owner';

  const managerPropCount = isManager ? getManagerWorkspaceState().properties.length : 0;
  const ownerPropCount = isOwner ? getOwnerPortalState().properties.length : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRoleSwitch = async (roleName) => {
    try {
      await switchRole(roleName);
      setProfileOpen(false);
      navigate('/dashboard');
    } catch {
      // ignore
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (isTenant) {
      const q = val.trim().toLowerCase();
      if (q.length < 2) {
        setSuggestions([]);
      } else {
        const tenantPages = [
          { id: 't-home', type: 'Page', title: 'Home', subtitle: 'Sunrise Residency · Unit A-204', path: '/dashboard', category: 'Tenant Portal' },
          { id: 't-pay', type: 'Page', title: 'Pay rent', subtitle: 'Review balance and submit payment', path: '/tenant/pay', category: 'Tenant Portal' },
          { id: 't-wo', type: 'Page', title: 'Work order — Request a repair', subtitle: 'Tell your manager what needs fixing', path: '/tenant/work-order', category: 'Tenant Portal' },
          { id: 't-msg', type: 'Page', title: 'Messages', subtitle: 'Updates from property manager and vendors', path: '/tenant/messages', category: 'Tenant Portal' },
        ];
        setSuggestions(
          tenantPages.filter(
            (p) => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
          )
        );
      }
    } else if (isManager) {
      const q = val.trim().toLowerCase();
      if (q.length < 2) {
        setSuggestions([]);
      } else {
        const mgr = getManagerWorkspaceState();
        const mgrItems = [
          ...mgr.properties.map((p) => ({
            id: p.id,
            type: 'Property',
            title: p.name,
            subtitle: p.shortLocation,
            path: `/manager/properties/${p.id}`,
            category: 'Assigned Property',
          })),
          ...mgr.tenants.map((t) => ({
            id: t.id,
            type: 'Tenant',
            title: t.name,
            subtitle: `${t.propertyName} · ${t.unit}`,
            path: '/manager/tenants',
            category: 'Assigned Tenant',
          })),
          ...mgr.workOrders.map((w) => ({
            id: w.id,
            type: 'Work Order',
            title: `${w.id} · ${w.title}`,
            subtitle: `${w.propertyName} · ${w.unit}`,
            path: `/manager/work-orders?wo=${w.id}`,
            category: 'Work Order',
          })),
          { id: 'm-home', type: 'Page', title: 'Home', subtitle: 'Manager Workspace', path: '/dashboard', category: 'Navigation' },
          { id: 'm-msg', type: 'Page', title: 'Communication', subtitle: 'Unified communications', path: '/manager/communication', category: 'Navigation' },
          { id: 'm-sched', type: 'Page', title: 'Schedule', subtitle: 'Visits & compliance', path: '/manager/schedule', category: 'Navigation' },
          { id: 'm-rep', type: 'Page', title: 'Reports', subtitle: 'Assigned portfolio summary', path: '/manager/reports', category: 'Navigation' },
        ];
        setSuggestions(
          mgrItems
            .filter((i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
            .slice(0, 8)
        );
      }
    } else if (isOwner) {
      const q = val.trim().toLowerCase();
      if (q.length < 2) {
        setSuggestions([]);
      } else {
        const ownerState = getOwnerPortalState();
        const ownerItems = [
          ...ownerState.properties.map((p) => ({
            id: p.id,
            type: 'Owned Property',
            title: p.name,
            subtitle: `${p.type} · ${p.units} units`,
            path: '/dashboard',
            category: 'Owner Portal',
          })),
          ...ownerState.records.map((r) => ({
            id: r.id,
            type: r.recordType,
            title: r.title,
            subtitle: `${r.propertyName} · ${r.date}`,
            path: '/owner/records',
            category: 'Records',
          })),
          { id: 'o-home', type: 'Page', title: 'Overview', subtitle: 'Owner cash position & property summary', path: '/dashboard', category: 'Owner Portal' },
          { id: 'o-io', type: 'Page', title: 'Income & out', subtitle: 'Money in and money out ledger', path: '/owner/income-out', category: 'Owner Portal' },
          { id: 'o-exp', type: 'Page', title: 'Expenses', subtitle: 'Read-only paid vendor bills & invoices', path: '/owner/expenses', category: 'Owner Portal' },
          { id: 'o-disb', type: 'Page', title: 'Disbursements', subtitle: 'Confirmed payouts to •••• 4421', path: '/owner/disbursements', category: 'Owner Portal' },
          { id: 'o-rec', type: 'Page', title: 'Records', subtitle: 'Statements, COI, and tax documents', path: '/owner/records', category: 'Owner Portal' },
        ];
        setSuggestions(
          ownerItems
            .filter((i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
            .slice(0, 8)
        );
      }
    } else {
      const results = getGlobalSearchResults(val);
      setSuggestions(results);
    }
    setSelectedIndex(-1);
    setShowDocs(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        navigate(suggestions[selectedIndex].path);
        setSearchQuery('');
        setShowDocs(false);
      }
    } else if (e.key === 'Escape') {
      setShowDocs(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (quickAddRef.current && !quickAddRef.current.contains(e.target)) setQuickAddOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDocs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [notifications, setNotifications] = useState(() => getUserNotifications(user));

  useEffect(() => {
    const refresh = () => setNotifications(getUserNotifications(user));
    refresh();
    window.addEventListener('pm:notification_updated', refresh);
    return () => window.removeEventListener('pm:notification_updated', refresh);
  }, [user]);

  const quickAddItems = isTenant
    ? [
        { label: 'Pay rent', path: '/tenant/pay' },
        { label: 'Create work order', path: '/tenant/work-order' },
        { label: 'Open messages', path: '/tenant/messages' },
      ]
    : isManager
      ? [
          { label: 'Work orders', path: '/manager/work-orders' },
          { label: 'Assigned properties', path: '/manager/properties' },
          { label: 'Add / view tenants', path: '/manager/tenants' },
          { label: 'Communication', path: '/manager/communication' },
        ]
      : isOwner
        ? [
            { label: 'Overview', path: '/dashboard' },
            { label: 'Income & out', path: '/owner/income-out' },
            { label: 'Expenses', path: '/owner/expenses' },
            { label: 'Disbursements', path: '/owner/disbursements' },
            { label: 'Records', path: '/owner/records' },
            { label: 'Communication', path: '/owner/communication' },
          ]
        : [
            { label: 'Record Payment', path: '/rent-payments?tab=collections' },
            { label: 'Add Expense + Receipt', path: '/expenses/add' },
            { label: 'Create Lease / Renewal', path: '/leases/create' },
            { label: 'Add Unit', path: '/units/add' },
            { label: 'Add Owner / Entity', path: '/owners?add=true' },
            { label: 'Add Work Order', path: '/maintenance' },
            { label: 'Add Property', path: '/properties/add' },
          ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-100 px-4 lg:px-6">
      <div className="h-full flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={toggleMobile} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 cursor-pointer transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                  <span
                    onClick={() => {
                      markAllUserNotificationsRead(user);
                      toast.success('All notifications marked as read');
                    }}
                    className="text-xs text-blue-600 font-medium cursor-pointer hover:underline"
                  >
                    Mark all read
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          setNotifOpen(false);
                          if (n.link) {
                            navigate(n.link);
                          } else if (isTenant) {
                            navigate('/tenant/messages');
                          } else if (isManager) {
                            navigate('/manager/messages');
                          } else if (isOwner) {
                            navigate('/owner/records');
                          } else {
                            navigate('/communication');
                          }
                        }}
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                          <div className={!n.read ? '' : 'pl-5'}>
                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Avatar name={user?.name} size="sm" />
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-gray-500">
                  {isTenant
                    ? 'Resident'
                    : isManager
                      ? `Assigned properties (${managerPropCount})`
                      : isOwner
                        ? `Owned properties (${ownerPropCount})`
                        : ROLE_LABELS[user?.role] || 'Admin'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-gradient-to-r from-[#4A6CF7] to-[#A855F7]">
                  <div className="flex items-center gap-3">
                    <Avatar name={user?.name} size="lg" />
                    <div>
                      <p className="text-sm font-semibold text-white">{user?.name}</p>
                      <p className="text-xs text-white/70">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="py-1.5">
                  <button
                    onClick={() => {
                      if (isManager) navigate('/manager/settings');
                      else if (isOwner) navigate('/owner/settings');
                      else if (isTenant) navigate('/tenant/settings');
                      else navigate('/settings');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-400" /> My Profile
                  </button>
                  <button
                    onClick={() => {
                      if (isManager) navigate('/manager/settings');
                      else if (isOwner) navigate('/owner/settings');
                      else if (isTenant) navigate('/tenant/settings');
                      else navigate('/settings');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" /> Settings
                  </button>
                </div>

                {/* Fast Role Switcher for Client Demo */}
                <div className="py-2.5 border-t border-gray-100 bg-gray-50/75 px-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                    Demo Role Switcher
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleRoleSwitch('admin')}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        user?.role === 'admin'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span>👑</span>
                      <span className="truncate">Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSwitch('owner')}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        user?.role === 'owner'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span>🏢</span>
                      <span className="truncate">Owner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSwitch('manager')}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        user?.role === 'manager'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span>📋</span>
                      <span className="truncate">Manager</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSwitch('tenant')}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        user?.role === 'tenant'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span>🔑</span>
                      <span className="truncate">Tenant</span>
                    </button>
                  </div>
                </div>
                <div className="py-1.5 border-t border-gray-100">
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
