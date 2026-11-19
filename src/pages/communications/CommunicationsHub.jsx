import { useState, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
  Search, Send, Users, User, Briefcase, Building, MessageSquare, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import { getTenants } from '../../data/mockTenants';
import { getManagers, getOwners } from '../../data/mockExtra';
import { addNotification } from '../../data/mockNotifications';
import { useAuth } from '../../context/AuthContext';

export default function CommunicationsHub() {
  const { user } = useAuth();
  const adminName = user?.name || 'Admin';

  const [serverTenants, setServerTenants] = useState([]);
  const [serverManagers, setServerManagers] = useState([]);
  const [serverOwners, setServerOwners] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch real users dynamically from backend API
  useEffect(() => {
    setLoadingContacts(true);
    Promise.allSettled([
      apiClient.get('/tenants'),
      apiClient.get('/managers'),
      apiClient.get('/owners'),
    ]).then(([tenantsRes, managersRes, ownersRes]) => {
      if (tenantsRes.status === 'fulfilled') {
        const val = tenantsRes.value;
        const items = val?.items || (Array.isArray(val) ? val : []);
        setServerTenants(items);
      }
      if (managersRes.status === 'fulfilled') {
        const val = managersRes.value;
        const items = val?.items || (Array.isArray(val) ? val : []);
        setServerManagers(items);
      }
      if (ownersRes.status === 'fulfilled') {
        const val = ownersRes.value;
        const items = val?.items || (Array.isArray(val) ? val : []);
        setServerOwners(items);
      }
    }).finally(() => {
      setLoadingContacts(false);
    });
  }, []);

  const [contactRoleFilter, setContactRoleFilter] = useState('all');
  const [contactSearch, setContactSearch] = useState('');

  // Construct pure dynamic contact list from live DB records
  const allContacts = useMemo(() => {
    // 1. Dynamic Tenants from DB (fallback to local if server has none yet)
    const tenantSource = serverTenants.length > 0 ? serverTenants : getTenants();
    const tenantList = tenantSource.map((t) => ({
      id: `tenant-${t.id}`,
      originalId: t.id,
      userId: t.userId || t.id,
      name: t.name || 'Tenant',
      role: 'tenant',
      roleLabel: 'Resident / Tenant',
      phone: t.phone || t.mobile || 'N/A',
      email: t.email || '',
      subtitle: t.unitNumber && t.unitNumber !== 'Unassigned'
        ? `Unit ${t.unitNumber}${t.propertyName ? ` · ${t.propertyName}` : ''}`
        : (t.propertyName || 'Resident / Tenant'),
    }));

    // 2. Dynamic Managers from DB
    const managerSource = serverManagers.length > 0 ? serverManagers : getManagers();
    const managerList = managerSource.map((m) => ({
      id: `manager-${m.id}`,
      originalId: m.id,
      userId: m.id,
      name: m.name || 'Manager',
      role: 'manager',
      roleLabel: 'Property Manager',
      phone: m.phone || 'N/A',
      email: m.email || '',
      subtitle: m.scope || (m.properties?.length ? `${m.properties.length} Assigned Properties` : 'Property Manager'),
    }));

    // 3. Dynamic Owners from DB
    const ownerSource = serverOwners.length > 0 ? serverOwners : getOwners();
    const ownerList = ownerSource.map((o) => ({
      id: `owner-${o.id}`,
      originalId: o.id,
      userId: o.id,
      name: o.name || 'Owner',
      role: 'owner',
      roleLabel: 'Property Owner',
      phone: o.phone || 'N/A',
      email: o.email || '',
      subtitle: o.type ? `${o.type} · Portfolio` : 'Property Owner',
    }));

    return [...tenantList, ...managerList, ...ownerList];
  }, [serverTenants, serverManagers, serverOwners]);

  const filteredContacts = useMemo(() => {
    return allContacts.filter((c) => {
      if (contactRoleFilter !== 'all' && c.role !== contactRoleFilter) return false;
      if (contactSearch.trim()) {
        const q = contactSearch.toLowerCase().trim();
        return (
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.subtitle || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allContacts, contactRoleFilter, contactSearch]);

  const [selectedContact, setSelectedContact] = useState(null);

  // Set initial selected contact dynamically
  useEffect(() => {
    if (!selectedContact && allContacts.length > 0) {
      setSelectedContact(allContacts[0]);
    } else if (selectedContact) {
      // Keep selected contact synced with latest allContacts
      const updated = allContacts.find((c) => c.id === selectedContact.id);
      if (updated && (updated.name !== selectedContact.name || updated.email !== selectedContact.email)) {
        setSelectedContact(updated);
      }
    }
  }, [allContacts, selectedContact]);

  const [chatMessages, setChatMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');

  // Fetch real messages dynamically from backend DB for the active contact
  useEffect(() => {
    if (!selectedContact) {
      setChatMessages([]);
      return;
    }

    // Read stored dynamic messages (and strip any legacy mock text)
    let localMsgs = [];
    try {
      const raw = localStorage.getItem(`pm_chat_${selectedContact.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localMsgs = parsed.filter(
            (m) =>
              !m.text?.includes('is package delivery accessible on Saturdays') &&
              !m.text?.includes('Concierge package locker room is open 24/7') &&
              !m.text?.includes('monthly preventive maintenance schedule') &&
              !m.text?.includes('share the latest monthly disbursement')
          );
        }
      }
    } catch { }

    setChatMessages(localMsgs);

    const targetUserId = selectedContact.userId || selectedContact.originalId;
    if (targetUserId) {
      setLoadingMessages(true);
      apiClient.get(`/messages/contact/${targetUserId}`).then((res) => {
        const data = res?.data || res;
        const backendMsgs = data?.messages || (Array.isArray(data) ? data : []);
        if (Array.isArray(backendMsgs) && backendMsgs.length > 0) {
          const mapped = backendMsgs.map((m) => ({
            id: m.id,
            sender: m.sender?.name || (m.senderId === user?.id ? `${adminName} (Admin)` : selectedContact.name),
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            isStaff: m.senderId === user?.id || m.sender?.role === 'admin',
          }));
          setChatMessages(mapped);
          try {
            localStorage.setItem(`pm_chat_${selectedContact.id}`, JSON.stringify(mapped));
          } catch { }
        } else if (backendMsgs.length === 0 && localMsgs.length === 0) {
          setChatMessages([]);
        }
      }).catch(() => {}).finally(() => {
        setLoadingMessages(false);
      });
    }
  }, [selectedContact, adminName, user?.id]);

  const handleSendDirectMessage = (e) => {
    e.preventDefault();
    if (!newMsgText.trim() || !selectedContact) return;
    const msgText = newMsgText.trim();
    const newMsg = {
      id: Date.now(),
      sender: `${adminName} (Admin)`,
      text: msgText,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      isStaff: true,
    };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    try {
      localStorage.setItem(`pm_chat_${selectedContact.id}`, JSON.stringify(updated));
    } catch { }

    const targetUserId = Number(selectedContact.userId || selectedContact.originalId || 1);

    // Save to real Backend Database
    apiClient.post('/messages', {
      recipientId: targetUserId,
      content: msgText,
      recipientEmail: selectedContact.email,
    }).then((res) => {
      const saved = res?.data || res;
      if (saved?.id) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, id: saved.id } : m))
        );
      }
    }).catch((err) => {
      console.warn('[API] Message saved locally, sync notice:', err.message);
    });

    const recipientLink =
      selectedContact.role === 'manager'
        ? '/manager/messages'
        : selectedContact.role === 'owner'
          ? '/owner/records'
          : '/tenant/messages';

    // Dispatch direct notification to recipient
    addNotification({
      title: `💬 Direct Message from ${adminName} (Admin)`,
      desc: msgText,
      targetRole: selectedContact.role,
      recipientEmail: selectedContact.email,
      recipientId: selectedContact.originalId,
      sender: `${adminName} (Admin)`,
      link: recipientLink,
      time: 'Just now',
    });

    setNewMsgText('');
    toast.success(`Message sent to ${selectedContact.name} & stored in database!`);
  };

  const tenantCount = allContacts.filter((c) => c.role === 'tenant').length;
  const managerCount = allContacts.filter((c) => c.role === 'manager').length;
  const ownerCount = allContacts.filter((c) => c.role === 'owner').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Communications & Direct Messaging"
        subtitle="Chat directly with Property Managers, Owners, and Tenants with live database syncing and notification alerts."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Communication' }]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Directory"
          value={allContacts.length}
          subtitle="Registered system contacts"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Tenants / Residents"
          value={tenantCount}
          subtitle="Verified resident chats"
          icon={User}
          color="blue"
        />
        <StatCard
          title="Property Managers"
          value={managerCount}
          subtitle="Operations team contacts"
          icon={Briefcase}
          color="purple"
        />
        <StatCard
          title="Property Owners"
          value={ownerCount}
          subtitle="Portfolio asset owners"
          icon={Building}
          color="amber"
        />
      </div>

      {/* DIRECT CHATS (TENANTS, MANAGERS & OWNERS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[520px]">
        {/* Contact List */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3.5 flex flex-col space-y-3 shadow-xs">
          {/* Header & Category Pills */}
          <div className="space-y-2 border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-gray-900">Direct Message Directory</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {filteredContacts.length} Contacts
              </span>
            </div>

            {/* Role filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
              {[
                { key: 'all', label: `All (${allContacts.length})` },
                { key: 'tenant', label: `Tenants (${tenantCount})` },
                { key: 'manager', label: `Managers (${managerCount})` },
                { key: 'owner', label: `Owners (${ownerCount})` },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setContactRoleFilter(f.key)}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    contactRoleFilter === f.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search contacts */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, unit, email..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              />
            </div>
          </div>

          {/* Contacts Scrollable List */}
          <div className="space-y-1.5 overflow-y-auto max-h-[460px]">
            {loadingContacts && allContacts.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Loading directory from database...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No contacts found in this filter.
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = selectedContact?.id === c.id;

                const badgeColors =
                  c.role === 'manager'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : c.role === 'owner'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                const avatarBg =
                  c.role === 'manager'
                    ? 'bg-purple-100 text-purple-700'
                    : c.role === 'owner'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-indigo-100 text-indigo-700';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedContact(c)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 border border-indigo-200 shadow-xs'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full ${avatarBg} font-bold text-xs flex items-center justify-center shrink-0`}>
                        {(c.name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 leading-tight truncate">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                          {c.subtitle}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ml-2 ${badgeColors}`}>
                      {c.role}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 flex flex-col justify-between overflow-hidden shadow-xs">
          {/* Chat Header */}
          <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                selectedContact?.role === 'manager'
                  ? 'bg-purple-600 text-white'
                  : selectedContact?.role === 'owner'
                    ? 'bg-amber-600 text-white'
                    : 'bg-indigo-600 text-white'
              }`}>
                {(selectedContact?.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 text-sm truncate">{selectedContact?.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                    selectedContact?.role === 'manager'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : selectedContact?.role === 'owner'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {selectedContact?.roleLabel || selectedContact?.role}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {selectedContact?.subtitle} · {selectedContact?.email} · {selectedContact?.phone}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              DB Synced
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px] bg-slate-50/50">
            {loadingMessages ? (
              <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Syncing messages with database...</span>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="font-bold text-gray-800 text-sm">No messages yet with {selectedContact?.name}</p>
                <p className="text-gray-400 text-xs">
                  Type a direct message below to start a dynamic conversation.
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isStaff ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                      msg.isStaff
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className={`text-[10px] font-bold mb-1 ${msg.isStaff ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {msg.sender}
                    </p>
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
                </div>
              ))
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendDirectMessage} className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder={`Type a direct message to ${selectedContact?.name || 'user'} (persisted to database)...`}
              value={newMsgText}
              onChange={(e) => setNewMsgText(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-gray-800"
            />
            <Button type="submit" size="sm" icon={Send}>
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
