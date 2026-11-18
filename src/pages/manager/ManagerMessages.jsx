import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Send, Paperclip, Lock, Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import { useAuth } from '../../context/AuthContext';
import {
  getManagerWorkspaceState,
  getManagerUnreadCount,
  sendManagerMessage,
  createManagerThread,
  markManagerThreadRead,
} from '../../data/managerWorkspaceData';
import { readFilesAsDataUrls } from '../../data/tenantPortalData';

export default function ManagerMessages() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const threadParam = searchParams.get('thread');
  const propertyParam = searchParams.get('property');
  const woParam = searchParams.get('wo');

  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState(propertyParam || '');
  const [selectedThreadId, setSelectedThreadId] = useState(threadParam || null);
  const [draft, setDraft] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendChannel, setSendChannel] = useState('Portal');
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    const local = getManagerWorkspaceState();
    setState(local);

    apiClient.get('/operations/communications').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setState((prev) => {
          if (local.properties.length === 0) {
            return { ...prev, threads: [] };
          }
          const allowedPropIds = new Set(local.properties.map((p) => String(p.id)));
          const allowedPropNames = new Set(local.properties.map((p) => (p.name || '').trim().toLowerCase()));

          const filteredItems = items.filter(
            (c) =>
              allowedPropIds.has(String(c.propertyId)) ||
              allowedPropNames.has((c.propertyName || '').trim().toLowerCase())
          );

          const mappedThreads = filteredItems.map((c, idx) => {
            const contact = c.audience || c.targetAudience || 'Building Notice';
            const initials = contact.split(' ').map((p) => p[0]).join('').slice(0, 2) || 'BN';
            const prop = local.properties.find((p) => String(p.id) === String(c.propertyId)) || local.properties[0];
            return {
              id: String(c.id || c.broadcastNumber || `BRD-${idx}`),
              contactName: contact,
              initials,
              propertyId: String(prop?.id || c.propertyId || ''),
              propertyName: prop?.name || 'Assigned Building',
              unitNumber: 'All Units',
              propertyUnitLabel: `${c.title || 'Broadcast Notice'}`,
              fullPropertyUnit: `${c.title || 'Broadcast Announcement'} · ${prop?.name || 'Property'}`,
              channel: 'Portal',
              channelBadge: 'NOTICE',
              preview: (c.body || c.content || c.message || 'Notice broadcast').slice(0, 45),
              timeAgo: 'Today',
              unreadCount: 0,
              workOrderId: null,
              messages: [
                {
                  id: `MSG-BRD-${idx}`,
                  senderType: 'manager',
                  senderLabel: `${prev.manager?.name || 'Manager'} · Manager`,
                  text: c.body || c.content || c.message || 'Notice broadcast',
                  isInternal: false,
                  channel: 'Portal',
                  time: 'Today',
                  attachments: [],
                },
              ],
            };
          });

          // Merge uniquely so we never wipe existing conversation threads
          const existingIds = new Set(prev.threads.map((t) => t.id));
          const uniqueNew = mappedThreads.filter((t) => !existingIds.has(t.id));
          return {
            ...prev,
            threads: [...prev.threads, ...uniqueNew],
          };
        });
      }
    }).catch(() => {});
  }, []);

  // New message modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newMsg, setNewMsg] = useState({
    contactName: '',
    propertyId: state.properties[0]?.id || '',
    unit: '',
    channel: 'Portal',
    text: '',
  });

  const unreadTotal = useMemo(
    () => getManagerUnreadCount(state, propertyFilter),
    [state, propertyFilter]
  );

  const unreadThreadsCount = useMemo(
    () =>
      state.threads.filter(
        (t) => t.unreadCount > 0 && (!propertyFilter || t.propertyId === propertyFilter)
      ).length,
    [state.threads, propertyFilter]
  );

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.threads.filter((t) => {
      if (propertyFilter && t.propertyId !== propertyFilter) return false;
      if (activeTab === 'unread' && !(t.unreadCount > 0)) return false;
      if (activeTab === 'sent' && !t.messages.some((m) => m.senderType === 'manager')) return false;
      if (activeTab === 'email' && t.channel !== 'Email') return false;
      if (activeTab === 'portal' && t.channel !== 'Portal') return false;
      if (q) {
        const hay = `${t.contactName} ${t.propertyUnitLabel} ${t.preview}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.threads, propertyFilter, activeTab, searchQuery]);

  const activeThread = useMemo(() => {
    if (selectedThreadId) {
      const found = filteredThreads.find((t) => t.id === selectedThreadId);
      if (found) return found;
    }
    if (woParam) {
      const byWO = filteredThreads.find((t) => t.workOrderId === woParam);
      if (byWO) return byWO;
    }
    return filteredThreads[0] || null;
  }, [filteredThreads, selectedThreadId, woParam]);

  const handleSelectThread = (id) => {
    setSelectedThreadId(id);
    const updated = markManagerThreadRead(id);
    setState(updated);
  };

  const handleFileAttach = async (e) => {
    const loaded = await readFilesAsDataUrls(e.target.files, 3 - attachments.length);
    if (loaded.length > 0) {
      setAttachments((prev) => [...prev, ...loaded]);
    }
    e.target.value = '';
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!activeThread) return;
    if (!draft.trim() && attachments.length === 0) {
      toast.error('Enter a message or attach a file.');
      return;
    }

    const updated = sendManagerMessage({
      threadId: activeThread.id,
      text: draft,
      channel: sendChannel,
      isInternal: isInternalNote,
      attachments,
      senderName: user?.name || 'Sarah Jenkins',
    });
    setState(updated);
    setDraft('');
    setAttachments([]);
    if (isInternalNote) {
      toast.success('Internal staff-only note saved (time-stamped)');
      setIsInternalNote(false);
    }
  };

  const handleCreateThread = (e) => {
    e.preventDefault();
    if (!newMsg.contactName.trim() || !newMsg.text.trim()) {
      toast.error('Recipient and message are required.');
      return;
    }
    const result = createManagerThread({
      ...newMsg,
      senderName: user?.name || 'Sarah Jenkins',
    });
    setState(result.state);
    setSelectedThreadId(result.thread.id);
    setIsNewOpen(false);
    setNewMsg({
      contactName: '',
      propertyId: state.properties[0]?.id || '',
      unit: '',
      channel: 'Portal',
      text: '',
    });
    toast.success('Conversation started (time-stamped)');
  };

  const tabs = [
    { key: 'inbox', label: `Inbox · ${unreadTotal}` },
    { key: 'unread', label: `Unread · ${unreadThreadsCount}` },
    { key: 'sent', label: 'Sent' },
    { key: 'email', label: 'Email' },
    { key: 'portal', label: 'Portal' },
  ];

  return (
    <div className="space-y-5 pb-8">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / ASSIGNED PROPERTIES"
        properties={state.properties}
        selectedPropertyId={propertyFilter}
        onSelectProperty={setPropertyFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages &amp; Email</h1>
          <p className="text-sm text-gray-500 mt-1">
            One inbox for tenant and vendor conversations
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsNewOpen(true)}>
          New message
        </Button>
      </div>

      <Card padding="p-6" className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Unified communications</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Portal messages and connected email appear in one timeline with channel labels and property filters
          </p>
        </div>

        {/* Channel Filter Tabs + Search + Property Scope */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-3">
          <div className="flex flex-wrap items-center gap-5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`pb-2 text-sm font-semibold border-b-2 -mb-[13px] transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-[#4A6CF7] text-[#4A6CF7]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs outline-none focus:bg-white focus:border-indigo-400"
              />
            </div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100 outline-none cursor-pointer"
            >
              <option value="">All assigned</option>
              {state.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Thread List + Active Conversation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[460px]">
          <div className="lg:col-span-5 border border-gray-100 rounded-2xl p-3 space-y-2 bg-gray-50/40 max-h-[520px] overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">
                No conversations match your filter.
              </p>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = activeThread?.id === thread.id;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <Avatar name={thread.contactName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {thread.contactName}
                        </p>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {thread.timeAgo}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-600 mt-0.5 truncate">
                        {thread.propertyUnitLabel}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-gray-500 truncate">{thread.preview}</p>
                        {thread.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="lg:col-span-7 border border-gray-100 rounded-2xl p-5 flex flex-col justify-between bg-white">
            {activeThread ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-gray-900">
                      {activeThread.contactName || 'Resident'}
                    </h3>
                    <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
                      {activeThread.channelBadge || 'MESSAGE'}
                    </Badge>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {activeThread.fullPropertyUnit || 'All Units'}
                  </span>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-[340px] pr-1">
                  {(activeThread.messages || []).map((msg) => {
                    const isMgr = msg.senderType === 'manager';
                    if (msg.isInternal) {
                      return (
                        <div key={msg.id} className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                            <Lock className="w-3 h-3" />
                            STAFF-ONLY INTERNAL NOTE
                          </div>
                          <p className="text-amber-950">{msg.text}</p>
                          <p className="text-[10px] text-amber-700 mt-1.5">{msg.senderLabel}</p>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className={`flex ${isMgr ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
                            isMgr
                              ? 'bg-emerald-50 border border-emerald-100 text-gray-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="leading-relaxed">{msg.text}</p>
                          {msg.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {msg.attachments.map((att, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium text-indigo-600"
                                >
                                  📎 {att.name}
                                </span>
                              ))}
                            </div>
                          )}
                          <p
                            className={`text-[11px] mt-1.5 font-medium ${
                              isMgr ? 'text-emerald-700' : 'text-gray-400'
                            }`}
                          >
                            {msg.senderLabel}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Composer */}
                <form onSubmit={handleSend} className="pt-3 border-t border-gray-100 space-y-2.5">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg"
                        >
                          {att.name}
                          <button
                            type="button"
                            onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))}
                            className="cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl border px-3.5 py-2.5 space-y-2 transition-colors ${
                      isInternalNote
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-gray-50/70 border-gray-200 focus-within:bg-white focus-within:border-indigo-400'
                    }`}
                  >
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={
                        isInternalNote
                          ? 'Write a staff-only internal note...'
                          : `Reply to ${(activeThread?.contactName || 'Resident').split(' ')[0]}...`
                      }
                      className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileAttach}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" /> Attach file
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsInternalNote((v) => !v)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                            isInternalNote
                              ? 'bg-amber-200 text-amber-900'
                              : 'text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          {isInternalNote ? 'Internal note (ON)' : 'Internal note'}
                        </button>

                        {!isInternalNote && (
                          <label className="inline-flex items-center gap-1.5 text-gray-500">
                            <span>Send as:</span>
                            <select
                              value={sendChannel}
                              onChange={(e) => setSendChannel(e.target.value)}
                              className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer"
                            >
                              <option value="Portal">Portal message</option>
                              <option value="Email">Email</option>
                              <option value="SMS">SMS</option>
                            </select>
                          </label>
                        )}
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        icon={Send}
                        disabled={!draft.trim() && attachments.length === 0}
                        className="shrink-0"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <p className="text-xs text-gray-400 text-center my-auto">
                Select a conversation to view timeline.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card gradient padding="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          INBOX RULES
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Manager inbox includes only assigned-property threads. Internal notes stay staff-only; email/portal channel, sender, attachments, and timestamps are retained.
        </p>
      </Card>

      {/* New Message Modal */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="New message"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Send} onClick={handleCreateThread}>
              Send message
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateThread} className="space-y-4">
          <Select
            label="Assigned property"
            options={state.properties.map((p) => ({ value: p.id, label: p.name }))}
            value={newMsg.propertyId}
            onChange={(e) => setNewMsg({ ...newMsg, propertyId: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Recipient (Tenant or Vendor)"
              required
              placeholder="e.g. Rebecca Miller"
              value={newMsg.contactName}
              onChange={(e) => setNewMsg({ ...newMsg, contactName: e.target.value })}
            />
            <Input
              label="Unit / Ref"
              placeholder="e.g. A-204"
              value={newMsg.unit}
              onChange={(e) => setNewMsg({ ...newMsg, unit: e.target.value })}
            />
          </div>
          <Select
            label="Channel"
            options={['Portal', 'Email', 'SMS']}
            value={newMsg.channel}
            onChange={(e) => setNewMsg({ ...newMsg, channel: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={newMsg.text}
              onChange={(e) => setNewMsg({ ...newMsg, text: e.target.value })}
              placeholder="Write your message..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

