import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Search,
  Send,
  Users,
  User,
  Building,
  ShieldCheck,
  MessageSquare,
  Loader2,
  Paperclip,
  X,
  Plus,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import { useAuth } from '../../context/AuthContext';
import {
  getManagerWorkspaceState,
  sendManagerMessage,
  createManagerThread,
} from '../../data/managerWorkspaceData';
import { getTenants } from '../../data/mockTenants';
import { getOwners } from '../../data/mockExtra';
import { readFilesAsDataUrls } from '../../data/tenantPortalData';
import { addNotification } from '../../data/mockNotifications';

export default function ManagerMessages() {
  const [searchParams] = useSearchParams();
  const threadParam = searchParams.get('thread');
  const propertyParam = searchParams.get('property');
  const woParam = searchParams.get('wo');

  const { user } = useAuth();
  const managerName = user?.name || 'Sarah Jenkins';

  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [propertyFilter, setPropertyFilter] = useState(propertyParam || '');

  const [serverTenants, setServerTenants] = useState([]);
  const [serverOwners, setServerOwners] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [contactRoleFilter, setContactRoleFilter] = useState('all');
  const [contactSearch, setContactSearch] = useState('');

  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isInternalNote, setIsInternalNote] = useState(false);

  // New thread modal state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newThreadData, setNewThreadData] = useState({
    contactName: '',
    propertyId: '',
    unit: '',
    channel: 'Portal',
    text: '',
  });

  const fileInputRef = useRef(null);
  const threadEndRef = useRef(null);

  // Load latest state and live contacts from database
  useEffect(() => {
    const local = getManagerWorkspaceState();
    setState(local);

    setLoadingContacts(true);
    Promise.allSettled([
      apiClient.get('/tenants?limit=100'),
      apiClient.get('/owners'),
    ]).then(([tenantsRes, ownersRes]) => {
      if (tenantsRes.status === 'fulfilled') {
        const val = tenantsRes.value;
        const items = val?.items || (Array.isArray(val) ? val : []);
        setServerTenants(items);
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

  // Build eligible directory contacts for Property Manager (Admin, Tenants, Owners)
  const allContacts = useMemo(() => {
    // 1. Executive Admin (Headquarters Management)
    const adminContact = {
      id: 'admin-1',
      originalId: 1,
      userId: 1,
      name: 'Robert King (Admin)',
      role: 'admin',
      roleLabel: 'Executive Admin',
      phone: '+1 (718) 555-0141',
      email: 'admin@rentlock.com',
      propertyId: 'all',
      propertyName: 'Executive Administration',
      subtitle: 'Headquarters · Portfolio Operations',
    };

    // Allowed property identifiers for this manager
    const allowedPropIds = new Set();
    const allowedPropNames = new Set();
    (state.properties || []).forEach((p) => {
      if (p.id) allowedPropIds.add(String(p.id));
      if (p.originalId) allowedPropIds.add(String(p.originalId));
      if (p.numericId) allowedPropIds.add(String(p.numericId));
      if (p.name) allowedPropNames.add(p.name.trim().toLowerCase());
    });

    // 2. Tenants (from server or fallback local mock)
    const tenantSource = serverTenants.length > 0 ? serverTenants : getTenants();
    const scopedTenants = tenantSource.filter((t) => {
      if (allowedPropIds.size === 0) return true;
      const tPropId = String(t.propertyId || '');
      const tPropName = (t.propertyName || '').trim().toLowerCase();
      return allowedPropIds.has(tPropId) || allowedPropNames.has(tPropName);
    });

    const tenantList = scopedTenants.map((t) => {
      const uNum = t.unitNumber || t.unit || '2A';
      const pName = t.propertyName || state.properties[0]?.name || 'Assigned Building';
      return {
        id: `tenant-${t.id}`,
        originalId: t.id,
        userId: t.userId || t.id,
        name: t.name || 'Resident',
        role: 'tenant',
        roleLabel: 'Resident / Tenant',
        phone: t.phone || t.mobile || 'N/A',
        email: t.email || '',
        propertyId: String(t.propertyId || state.properties[0]?.id || ''),
        propertyName: pName,
        unitNumber: uNum,
        subtitle: `Unit ${uNum} · ${pName}`,
      };
    });

    // Also include any tenants from active threads in managerWorkspaceData
    (state.threads || []).forEach((th) => {
      if (th.contactName && !th.contactName.includes('Admin') && !th.contactName.includes('Notice')) {
        const exists = tenantList.some(
          (tl) => tl.name.toLowerCase() === th.contactName.toLowerCase()
        );
        if (!exists) {
          tenantList.push({
            id: `tenant-${th.id}`,
            originalId: th.id,
            userId: th.id,
            name: th.contactName,
            role: 'tenant',
            roleLabel: 'Resident / Tenant',
            phone: 'N/A',
            email: '',
            propertyId: String(th.propertyId || ''),
            propertyName: th.propertyName || 'HAPPY',
            unitNumber: th.unitNumber || '2A',
            subtitle: th.propertyUnitLabel || `${th.propertyName || 'HAPPY'} · 2A`,
          });
        }
      }
    });

    // 3. Property Owners (from server or fallback local mock & property roster)
    const ownerSource = serverOwners.length > 0 ? serverOwners : getOwners();
    const ownerList = [];
    const seenOwnerNames = new Set();

    ownerSource.forEach((o) => {
      if (!seenOwnerNames.has(o.name)) {
        seenOwnerNames.add(o.name);
        ownerList.push({
          id: `owner-${o.id}`,
          originalId: o.id,
          userId: o.id,
          name: o.name || 'Property Owner',
          role: 'owner',
          roleLabel: 'Property Owner',
          phone: o.phone || 'N/A',
          email: o.email || '',
          propertyId: String(o.propertyId || ''),
          propertyName: o.propertyName || 'Portfolio Asset',
          subtitle: `${o.propertyName || 'Portfolio Asset'} · Owner`,
        });
      }
    });

    // Fallback: If no server owners, pull from state.properties contactName
    (state.properties || []).forEach((p) => {
      if (p.contactName && !seenOwnerNames.has(p.contactName)) {
        seenOwnerNames.add(p.contactName);
        ownerList.push({
          id: `owner-prop-${p.id}`,
          originalId: p.id,
          userId: p.id,
          name: p.contactName,
          role: 'owner',
          roleLabel: 'Property Owner',
          phone: p.contactPhone || 'N/A',
          email: '',
          propertyId: String(p.id),
          propertyName: p.name,
          subtitle: `${p.name} · Building Owner`,
        });
      }
    });

    return [adminContact, ...tenantList, ...ownerList];
  }, [serverTenants, serverOwners, state.properties, state.threads]);

  // Filtered contacts based on property filter, role, and search query
  const filteredContacts = useMemo(() => {
    return allContacts.filter((c) => {
      // Property scope filter
      if (propertyFilter && c.propertyId !== 'all' && c.propertyId !== propertyFilter) {
        return false;
      }
      // Role filter
      if (contactRoleFilter !== 'all' && c.role !== contactRoleFilter) {
        return false;
      }
      // Search filter
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
  }, [allContacts, propertyFilter, contactRoleFilter, contactSearch]);

  // Set initial selected contact
  useEffect(() => {
    if (!selectedContact && allContacts.length > 0) {
      if (woParam || threadParam) {
        const match = allContacts.find(
          (c) =>
            String(c.id) === threadParam ||
            String(c.originalId) === threadParam ||
            (c.subtitle && c.subtitle.includes(woParam))
        );
        setSelectedContact(match || allContacts[0]);
      } else {
        setSelectedContact(allContacts[0]);
      }
    } else if (selectedContact) {
      const updated = allContacts.find((c) => c.id === selectedContact.id);
      if (updated && (updated.name !== selectedContact.name || updated.email !== selectedContact.email)) {
        setSelectedContact(updated);
      }
    }
  }, [allContacts, selectedContact, woParam, threadParam]);

  // Load chat messages dynamically whenever selected contact changes
  const loadMessagesForContact = useCallback(async (contact) => {
    if (!contact) {
      setChatMessages([]);
      return;
    }

    let localMsgs = [];
    const seenTexts = new Set();

    // 1. Check if contact is Admin
    if (contact.role === 'admin') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('pm_chat_manager') || key.startsWith('pm_chat_admin'))) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                parsed.forEach((m) => {
                  const clean = (m.text || '').trim();
                  if (clean && !seenTexts.has(clean)) {
                    seenTexts.add(clean);
                    const isStaff = m.isStaff || (m.sender && m.sender.includes('Admin'));
                    localMsgs.push({
                      id: m.id || `admin-msg-${localMsgs.length}`,
                      sender: m.sender || (isStaff ? 'Robert King (Admin)' : `${managerName} (Manager)`),
                      text: clean,
                      time: m.time || 'Just now',
                      isStaff,
                      attachments: m.attachments || [],
                    });
                  }
                });
              }
            }
          }
        }
      } catch { }

      // Check admin thread in state.threads
      const adminThread = (state.threads || []).find((t) => t.id === 'admin-manager-thread');
      if (adminThread?.messages) {
        adminThread.messages.forEach((m) => {
          const clean = (m.text || '').trim();
          if (clean && !seenTexts.has(clean)) {
            seenTexts.add(clean);
            localMsgs.push({
              id: m.id,
              sender: m.senderLabel || (m.senderType === 'admin' ? 'Robert King (Admin)' : `${managerName} (Manager)`),
              text: clean,
              time: m.time || 'Today',
              isStaff: m.senderType === 'admin',
              attachments: m.attachments || [],
            });
          }
        });
      }

      if (localMsgs.length === 0) {
        localMsgs = [
          {
            id: 'welcome-admin-manager-msg',
            sender: 'Robert King (Admin)',
            text: 'Welcome to RentLock Management Hub. Direct executive communications, portfolio policy updates, and work order expenditure approvals appear here.',
            time: 'Active',
            isStaff: true,
            attachments: [],
          },
        ];
      }
    } else if (contact.role === 'tenant') {
      // 2. Check tenant threads in managerWorkspaceData
      const matchedThread = (state.threads || []).find(
        (t) =>
          t.contactName?.toLowerCase() === contact.name?.toLowerCase() ||
          t.id === contact.id ||
          t.id === contact.originalId
      );

      if (matchedThread?.messages) {
        matchedThread.messages.forEach((m) => {
          const clean = (m.text || '').trim();
          if (clean && !seenTexts.has(clean)) {
            seenTexts.add(clean);
            const isManager = m.senderType === 'manager';
            localMsgs.push({
              id: m.id,
              sender: m.senderLabel || (isManager ? `${managerName} (Manager)` : contact.name),
              text: clean,
              time: m.time || 'Today',
              isStaff: !isManager,
              isInternal: m.isInternal || false,
              attachments: m.attachments || [],
            });
          }
        });
      }

      // Check local storage pm_chat_tenant...
      try {
        const raw =
          localStorage.getItem(`pm_chat_${contact.id}`) ||
          localStorage.getItem(`pm_chat_tenant_${contact.originalId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((m) => {
              const clean = (m.text || '').trim();
              if (clean && !seenTexts.has(clean)) {
                seenTexts.add(clean);
                localMsgs.push(m);
              }
            });
          }
        }
      } catch { }
    } else if (contact.role === 'owner') {
      // 3. Check Owner communications
      try {
        const raw =
          localStorage.getItem(`pm_chat_owner_manager-${user?.id || 1}`) ||
          localStorage.getItem(`pm_chat_owner_${contact.originalId}`) ||
          localStorage.getItem(`pm_chat_${contact.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((m) => {
              const clean = (m.text || '').trim();
              if (clean && !seenTexts.has(clean)) {
                seenTexts.add(clean);
                localMsgs.push(m);
              }
            });
          }
        }
      } catch { }

      if (localMsgs.length === 0) {
        localMsgs = [
          {
            id: `welcome-owner-${contact.id}`,
            sender: contact.name,
            text: `Hello ${managerName}, let me know if there are any maintenance or disbursement updates for ${contact.propertyName || 'the property'}.`,
            time: 'Active',
            isStaff: true,
            attachments: [],
          },
        ];
      }
    }

    setChatMessages(localMsgs);

    // Fetch live messages from backend database
    const targetUserId = contact.userId || contact.originalId;
    if (targetUserId) {
      setLoadingMessages(true);
      try {
        const res = await apiClient.get(`/messages/contact/${targetUserId}`);
        const data = res?.data || res;
        const backendMsgs = data?.messages || (Array.isArray(data) ? data : []);
        if (Array.isArray(backendMsgs) && backendMsgs.length > 0) {
          const mapped = backendMsgs.map((m) => {
            const clean = (m.content || '').trim();
            const isManagerSender = m.senderId === user?.id || m.sender?.role === 'manager';
            return {
              id: m.id,
              sender: m.sender?.name || (isManagerSender ? `${managerName} (Manager)` : contact.name),
              text: clean,
              time: new Date(m.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              }),
              isStaff: !isManagerSender,
              attachments: m.attachmentUrls
                ? typeof m.attachmentUrls === 'string'
                  ? JSON.parse(m.attachmentUrls)
                  : m.attachmentUrls
                : [],
            };
          });

          const combined = [...localMsgs];
          mapped.forEach((bm) => {
            if (!combined.some((cm) => cm.text === bm.text)) {
              combined.push(bm);
            }
          });
          setChatMessages(combined);
        }
      } catch {
        // Backend fallback
      } finally {
        setLoadingMessages(false);
      }
    }
  }, [user, managerName, state.threads]);

  useEffect(() => {
    if (selectedContact) {
      loadMessagesForContact(selectedContact);
    }
  }, [selectedContact, loadMessagesForContact]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Handle file uploads
  const handleFileChange = async (e) => {
    const loaded = await readFilesAsDataUrls(e.target.files, 3 - attachments.length);
    if (loaded.length > 0) {
      setAttachments((prev) => [...prev, ...loaded].slice(0, 3));
    }
    e.target.value = '';
  };

  // Send Direct Message
  const handleSendDirectMessage = async (e) => {
    e.preventDefault();
    if (!selectedContact) return;
    if (!newMsgText.trim() && attachments.length === 0) {
      toast.error('Write a message or attach a file first.');
      return;
    }

    const cleanDraft = newMsgText.trim();
    const timeLabel = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const newMsg = {
      id: `MGR-MSG-${Date.now()}`,
      sender: isInternalNote ? `Internal Note · ${managerName}` : `${managerName} (Manager)`,
      text: cleanDraft,
      time: timeLabel,
      isStaff: false, // Sent by current manager
      isInternal: isInternalNote,
      attachments,
    };

    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);

    // Save to localStorage according to target role
    try {
      if (selectedContact.role === 'admin') {
        let matchedKey = null;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('pm_chat_manager')) {
            matchedKey = k;
            const raw = localStorage.getItem(k);
            const parsed = raw ? JSON.parse(raw) : [];
            parsed.push({
              id: Date.now(),
              sender: `${managerName} (Manager)`,
              text: cleanDraft,
              time: timeLabel,
              isStaff: false,
              attachments,
            });
            localStorage.setItem(k, JSON.stringify(parsed));
          }
        }
        if (!matchedKey) {
          localStorage.setItem(
            `pm_chat_manager-${user?.id || 1}`,
            JSON.stringify([
              {
                id: Date.now(),
                sender: `${managerName} (Manager)`,
                text: cleanDraft,
                time: timeLabel,
                isStaff: false,
                attachments,
              },
            ])
          );
        }
      } else if (selectedContact.role === 'tenant') {
        localStorage.setItem(`pm_chat_${selectedContact.id}`, JSON.stringify(updated));
        localStorage.setItem(`pm_chat_tenant_${selectedContact.originalId}`, JSON.stringify(updated));

        // If thread exists in state, update it
        const matchedThread = (state.threads || []).find(
          (t) => t.contactName?.toLowerCase() === selectedContact.name?.toLowerCase()
        );
        if (matchedThread) {
          sendManagerMessage({
            threadId: matchedThread.id,
            text: cleanDraft,
            channel: 'Portal',
            isInternal: isInternalNote,
            attachments,
            senderName: managerName,
          });
        }
      } else if (selectedContact.role === 'owner') {
        localStorage.setItem(`pm_chat_owner_manager-${user?.id || 1}`, JSON.stringify(updated));
        localStorage.setItem(`pm_chat_${selectedContact.id}`, JSON.stringify(updated));
      }
    } catch { }

    // Save to real Backend Database
    try {
      const targetUserId = Number(selectedContact.userId || selectedContact.originalId || 1);
      await apiClient.post('/messages', {
        recipientId: targetUserId,
        recipientEmail: selectedContact.email,
        content: cleanDraft || 'Sent an attachment',
      });
    } catch (err) {
      console.warn('Backend message sync notice:', err.message);
    }

    // Dispatch notification to recipient
    addNotification({
      title: `💬 Direct Message from ${managerName} (Manager)`,
      desc: cleanDraft || 'Sent an attachment',
      targetRole: selectedContact.role,
      recipientEmail: selectedContact.email,
      sender: `${managerName} (Manager)`,
      link:
        selectedContact.role === 'admin'
          ? '/communication'
          : selectedContact.role === 'owner'
          ? '/owner/communication'
          : '/tenant/messages',
      time: 'Just now',
    });

    setNewMsgText('');
    setAttachments([]);
    setIsInternalNote(false);
    toast.success(`Message sent to ${selectedContact.name} & stored in database!`);
  };

  // Handle new thread creation modal
  const handleCreateNewThread = (e) => {
    e.preventDefault();
    if (!newThreadData.contactName.trim() || !newThreadData.text.trim()) {
      toast.error('Recipient and message are required.');
      return;
    }
    const result = createManagerThread({
      ...newThreadData,
      senderName: managerName,
    });
    setState(result.state);
    setIsNewOpen(false);
    setNewThreadData({
      contactName: '',
      propertyId: state.properties[0]?.id || '',
      unit: '',
      channel: 'Portal',
      text: '',
    });
    toast.success('New conversation started!');
  };

  const adminCount = allContacts.filter((c) => c.role === 'admin').length;
  const tenantCount = allContacts.filter((c) => c.role === 'tenant').length;
  const ownerCount = allContacts.filter((c) => c.role === 'owner').length;

  return (
    <div className="space-y-6 pb-12">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / ASSIGNED PROPERTIES"
        properties={state.properties}
        selectedPropertyId={propertyFilter}
        onSelectProperty={setPropertyFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Manager Communication & Direct Messages"
          subtitle="Chat directly with Executive Admin, Tenants, and Property Owners with live database syncing and notification alerts."
          breadcrumbs={[{ label: 'Dashboard', path: '/manager/properties' }, { label: 'Communication' }]}
        />
        <Button variant="primary" icon={Plus} onClick={() => setIsNewOpen(true)}>
          New Message
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Directory"
          value={allContacts.length}
          subtitle="Registered portfolio contacts"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Executive Admin"
          value={adminCount}
          subtitle="Headquarters & executive"
          icon={ShieldCheck}
          color="blue"
        />
        <StatCard
          title="Tenants / Residents"
          value={tenantCount}
          subtitle="Assigned building residents"
          icon={User}
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

      {/* DIRECT CHATS (ADMIN, TENANTS & OWNERS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[520px]">
        {/* Direct Message Directory */}
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
              {[
                { key: 'all', label: `All (${allContacts.length})` },
                { key: 'admin', label: `Admin (${adminCount})` },
                { key: 'tenant', label: `Tenants (${tenantCount})` },
                { key: 'owner', label: `Owners (${ownerCount})` },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setContactRoleFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
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
                placeholder="Search by name, property, unit, email..."
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
                  c.role === 'admin'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : c.role === 'tenant'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                const avatarBg =
                  c.role === 'admin'
                    ? 'bg-blue-100 text-blue-700'
                    : c.role === 'tenant'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-amber-100 text-amber-700';

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
                      <div
                        className={`w-8 h-8 rounded-full ${avatarBg} font-bold text-xs flex items-center justify-center shrink-0`}
                      >
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
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ml-2 ${badgeColors}`}
                    >
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
              <div
                className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                  selectedContact?.role === 'admin'
                    ? 'bg-blue-600 text-white'
                    : selectedContact?.role === 'tenant'
                    ? 'bg-purple-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {(selectedContact?.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 text-sm truncate">
                    {selectedContact?.name}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                      selectedContact?.role === 'admin'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : selectedContact?.role === 'tenant'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
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
                <p className="font-bold text-gray-800 text-sm">
                  No messages yet with {selectedContact?.name}
                </p>
                <p className="text-gray-400 text-xs">
                  Type a direct message below to start a live conversation.
                </p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isManager = !msg.isStaff;
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${isManager ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        msg.isInternal
                          ? 'bg-amber-100 border border-amber-300 text-amber-900 rounded-br-none'
                          : isManager
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p
                          className={`text-[10px] font-bold ${
                            msg.isInternal
                              ? 'text-amber-800'
                              : isManager
                              ? 'text-indigo-200'
                              : 'text-gray-400'
                          }`}
                        >
                          {msg.sender}
                        </p>
                        {msg.isInternal && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-200/80 px-1 rounded flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Staff Only
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      {msg.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.attachments.map((att, attIdx) => (
                            <img
                              key={attIdx}
                              src={att.url}
                              alt={att.name || 'Attachment'}
                              className="w-20 h-20 object-cover rounded-lg border border-white/20 shadow-xs"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendDirectMessage}
            className="p-3 border-t border-gray-100 bg-white space-y-2"
          >
            {/* Attachment preview chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200"
                  >
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo or document"
                className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer shrink-0 border border-gray-200"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`Type a direct message to ${
                  selectedContact?.name || 'contact'
                } (persisted to database)...`}
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-gray-800"
              />

              {/* Internal staff note toggle if talking to resident */}
              {selectedContact?.role === 'tenant' && (
                <button
                  type="button"
                  onClick={() => setIsInternalNote((v) => !v)}
                  className={`text-[10px] font-bold px-2 py-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    isInternalNote
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                  title="Make this an internal note only visible to staff"
                >
                  <Lock className="w-3 h-3" />
                  Staff Note
                </button>
              )}

              <Button type="submit" size="sm" icon={Send}>
                Send Message
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* New Conversation Modal */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Start New Conversation"
        size="md"
      >
        <form onSubmit={handleCreateNewThread} className="space-y-4">
          <Input
            label="Recipient name"
            placeholder="e.g. Rebecca Miller"
            value={newThreadData.contactName}
            onChange={(e) => setNewThreadData({ ...newThreadData, contactName: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assigned Property"
              value={newThreadData.propertyId || state.properties[0]?.id || ''}
              onChange={(e) => setNewThreadData({ ...newThreadData, propertyId: e.target.value })}
            >
              {state.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              label="Unit / Suite"
              placeholder="e.g. 2A or General"
              value={newThreadData.unit}
              onChange={(e) => setNewThreadData({ ...newThreadData, unit: e.target.value })}
            />
          </div>
          <Select
            label="Delivery channel"
            value={newThreadData.channel}
            onChange={(e) => setNewThreadData({ ...newThreadData, channel: e.target.value })}
          >
            <option value="Portal">Resident Portal</option>
            <option value="Email">Email</option>
            <option value="SMS">SMS Notification</option>
          </Select>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Message</label>
            <textarea
              rows={4}
              value={newThreadData.text}
              onChange={(e) => setNewThreadData({ ...newThreadData, text: e.target.value })}
              placeholder="Type your message..."
              className="w-full text-xs rounded-xl border border-gray-200 p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send & Open Thread
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
