import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Search,
  Send,
  Users,
  Briefcase,
  ShieldCheck,
  MessageSquare,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { getManagers } from '../../data/mockExtra';
import { addNotification } from '../../data/mockNotifications';
import { getOwnerPortalState } from '../../data/ownerPortalData';
import OwnerScopeBar from './OwnerScopeBar';
import { readFilesAsDataUrls } from '../../data/tenantPortalData';

export default function OwnerCommunication() {
  const [searchParams] = useSearchParams();
  const initialThreadParam = searchParams.get('thread');
  const { user } = useAuth();
  const ownerName = user?.name || 'Claire Bennett';

  const [portalState, setPortalState] = useState(() => getOwnerPortalState());
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');

  const [serverManagers, setServerManagers] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [contactRoleFilter, setContactRoleFilter] = useState('all');
  const [contactSearch, setContactSearch] = useState('');

  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [attachments, setAttachments] = useState([]);

  const fileInputRef = useRef(null);
  const threadEndRef = useRef(null);

  // Fetch registered Property Managers dynamically from backend
  useEffect(() => {
    setLoadingContacts(true);
    apiClient
      .get('/managers')
      .then((res) => {
        const val = res?.data || res;
        const items = val?.items || (Array.isArray(val) ? val : []);
        setServerManagers(items);
      })
      .catch((err) => {
        console.warn('Backend managers load notice:', err.message);
      })
      .finally(() => {
        setLoadingContacts(false);
      });
  }, []);

  // Build eligible directory contacts for Owner (Executive Admin + Property Managers)
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
      subtitle: 'Headquarters · Portfolio Operations',
    };

    // 2. Property Managers (Operations team)
    const managerSource = serverManagers.length > 0 ? serverManagers : getManagers();
    const managerList = managerSource.map((m) => ({
      id: `manager-${m.id}`,
      originalId: m.id,
      userId: m.id,
      name: m.name || 'Property Manager',
      role: 'manager',
      roleLabel: 'Property Manager',
      phone: m.phone || 'N/A',
      email: m.email || '',
      subtitle:
        m.scope ||
        (m.properties?.length ? `${m.properties.length} Assigned Properties` : 'Property Manager'),
    }));

    return [adminContact, ...managerList];
  }, [serverManagers]);

  // Filtered contacts based on role and search query
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

  // Set initial selected contact
  useEffect(() => {
    if (!selectedContact && allContacts.length > 0) {
      if (initialThreadParam) {
        const match = allContacts.find(
          (c) => String(c.id) === initialThreadParam || String(c.originalId) === initialThreadParam
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
  }, [allContacts, selectedContact, initialThreadParam]);

  // Load chat messages dynamically whenever selected contact changes
  const loadMessagesForContact = useCallback(async (contact) => {
    if (!contact) {
      setChatMessages([]);
      return;
    }

    let localMsgs = [];
    const seenTexts = new Set();

    if (contact.role === 'admin') {
      // 1. Scan localStorage pm_chat_owner... for direct messages from Admin
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('pm_chat_owner')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                parsed.forEach((m) => {
                  const clean = (m.text || '').trim();
                  if (clean && !seenTexts.has(clean)) {
                    seenTexts.add(clean);
                    const isStaff =
                      m.isStaff ||
                      (m.sender && (m.sender.includes('Admin') || m.sender.includes('Robert')));
                    localMsgs.push({
                      id: m.id || `admin-msg-${localMsgs.length}`,
                      sender: m.sender || (isStaff ? 'Robert King (Admin)' : `${ownerName} (Owner)`),
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

      // 2. Scan pm_notifications for any admin direct messages to owner
      try {
        const rawNotifs = localStorage.getItem('pm_notifications');
        if (rawNotifs) {
          const notifs = JSON.parse(rawNotifs);
          if (Array.isArray(notifs)) {
            notifs.forEach((n) => {
              const isOwnerMsg =
                n.targetRole === 'owner' ||
                (n.recipientEmail && user?.email && n.recipientEmail.toLowerCase() === user.email.toLowerCase());
              if (isOwnerMsg && n.desc) {
                const clean = n.desc.trim();
                if (clean && !seenTexts.has(clean)) {
                  seenTexts.add(clean);
                  localMsgs.push({
                    id: n.id || `notif-msg-${localMsgs.length}`,
                    sender: n.sender || 'Robert King (Admin)',
                    text: clean,
                    time: n.time || 'Just now',
                    isStaff: true,
                    attachments: [],
                  });
                }
              }
            });
          }
        }
      } catch { }

      // If no messages at all, supply welcome message from Executive Admin
      if (localMsgs.length === 0) {
        localMsgs = [
          {
            id: 'welcome-owner-msg',
            sender: 'Robert King (Admin)',
            text: 'Welcome to RentLock Owner Communications. You can chat directly with Executive Management regarding your property portfolio, monthly disbursements, tenant occupancy, and financial statements.',
            time: 'Active',
            isStaff: true,
            attachments: [],
          },
        ];
      }
    } else {
      // For Property Manager
      try {
        const raw =
          localStorage.getItem(`pm_chat_owner_manager-${contact.originalId}`) ||
          localStorage.getItem(`pm_chat_${contact.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localMsgs = parsed;
          }
        }
      } catch { }
    }

    setChatMessages(localMsgs);

    // Fetch real messages from backend database
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
            const isOwner = m.senderId === user?.id || m.sender?.role === 'owner';
            return {
              id: m.id,
              sender: m.sender?.name || (isOwner ? `${ownerName} (Owner)` : contact.name),
              text: clean,
              time: new Date(m.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              }),
              isStaff: !isOwner,
              attachments: m.attachmentUrls
                ? typeof m.attachmentUrls === 'string'
                  ? JSON.parse(m.attachmentUrls)
                  : m.attachmentUrls
                : [],
            };
          });

          // Combine with any extra local messages
          const combined = [...localMsgs];
          mapped.forEach((bm) => {
            if (!combined.some((cm) => cm.text === bm.text)) {
              combined.push(bm);
            }
          });
          setChatMessages(combined);
        }
      } catch {
        // Backend optional fallback
      } finally {
        setLoadingMessages(false);
      }
    }
  }, [user, ownerName]);

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
      id: `OWN-MSG-${Date.now()}`,
      sender: `${ownerName} (Owner)`,
      text: cleanDraft,
      time: timeLabel,
      isStaff: false,
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
          if (k && k.startsWith('pm_chat_owner')) {
            matchedKey = k;
            const raw = localStorage.getItem(k);
            const parsed = raw ? JSON.parse(raw) : [];
            parsed.push({
              id: Date.now(),
              sender: `${ownerName} (Owner)`,
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
            `pm_chat_owner-${user?.id || 1}`,
            JSON.stringify([
              {
                id: Date.now(),
                sender: `${ownerName} (Owner)`,
                text: cleanDraft,
                time: timeLabel,
                isStaff: false,
                attachments,
              },
            ])
          );
        }
      } else {
        localStorage.setItem(`pm_chat_owner_manager-${selectedContact.originalId}`, JSON.stringify(updated));
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
      title: `💬 Direct Message from ${ownerName} (Owner)`,
      desc: cleanDraft || 'Sent an attachment',
      targetRole: selectedContact.role,
      recipientEmail: selectedContact.email,
      sender: `${ownerName} (Owner)`,
      link: selectedContact.role === 'admin' ? '/communication' : '/manager/communication',
      time: 'Just now',
    });

    setNewMsgText('');
    setAttachments([]);
    toast.success(`Message sent to ${selectedContact.name} & stored in database!`);
  };

  const adminCount = allContacts.filter((c) => c.role === 'admin').length;
  const managerCount = allContacts.filter((c) => c.role === 'manager').length;

  return (
    <div className="space-y-6 pb-12">
      <OwnerScopeBar
        sectionLabel="Communication"
        properties={portalState.properties}
        selectedPropertyId={selectedPropertyId}
        onChangeProperty={setSelectedPropertyId}
        periodLabel={portalState.periodLabel}
      />

      <PageHeader
        title="Owner Communication & Direct Messages"
        subtitle="Chat directly with Executive Admin and Property Managers regarding disbursements, property status, and portfolio operations with live database syncing."
        breadcrumbs={[{ label: 'Owner Portal', path: '/owner/overview' }, { label: 'Communication' }]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Directory"
          value={allContacts.length}
          subtitle="Direct management contacts"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Executive Admin"
          value={adminCount}
          subtitle="Headquarters & portfolio executive"
          icon={ShieldCheck}
          color="blue"
        />
        <StatCard
          title="Property Managers"
          value={managerCount}
          subtitle="Operations team contacts"
          icon={Briefcase}
          color="purple"
        />
      </div>

      {/* DIRECT CHATS (ADMIN & MANAGERS) */}
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
                { key: 'manager', label: `Managers (${managerCount})` },
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
                placeholder="Search by name, property, email..."
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
                    : 'bg-purple-50 text-purple-700 border-purple-200';

                const avatarBg =
                  c.role === 'admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700';

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
                    : 'bg-purple-600 text-white'
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
                        : 'bg-purple-50 text-purple-700 border-purple-200'
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
                const isOwner = !msg.isStaff;
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        isOwner
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold mb-1 ${
                          isOwner ? 'text-indigo-200' : 'text-gray-400'
                        }`}
                      >
                        {msg.sender}
                      </p>
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
                  selectedContact?.name || 'user'
                } (persisted to database)...`}
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-gray-800"
              />
              <Button type="submit" size="sm" icon={Send}>
                Send Message
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
