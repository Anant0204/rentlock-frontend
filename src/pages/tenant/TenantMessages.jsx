import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Send, Paperclip, X, CheckCheck, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { addNotification } from '../../data/mockNotifications';
import {
  getTenantPortalState,
  sendTenantMessage,
  markThreadRead,
  getUnreadMessageCount,
  readFilesAsDataUrls,
} from '../../data/tenantPortalData';

function parseTimeMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = String(timeStr).match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export default function TenantMessages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialThreadParam = searchParams.get('thread');
  const { user } = useAuth();

  const [portalState, setPortalState] = useState(() => getTenantPortalState());
  const [activeFilter, setActiveFilter] = useState('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState(
    () => initialThreadParam || localStorage.getItem('tenant_selected_thread') || null
  );
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState([]);

  const fileInputRef = useRef(null);
  const threadEndRef = useRef(null);

  // Sync real messages strictly for THIS authenticated tenant (Multi-tenant isolation)
  const syncAllMessages = useCallback(async () => {
    const adminMessages = [];
    const seenTexts = new Set();
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userIdStr = user?.id ? String(user.id) : null;
    const userName = (user?.name || '').toLowerCase().trim();

    // 1. Identify valid chat storage keys strictly belonging to THIS tenant
    const allowedChatKeys = new Set();
    if (userIdStr) {
      allowedChatKeys.add(`pm_chat_tenant-${userIdStr}`);
      allowedChatKeys.add(`pm_chat_${userIdStr}`);
    }

    try {
      const customTenants = JSON.parse(localStorage.getItem('custom_tenants') || '[]');
      if (Array.isArray(customTenants)) {
        customTenants.forEach((t) => {
          const tEmail = (t.email || '').toLowerCase().trim();
          const tName = (t.name || '').toLowerCase().trim();
          if ((userEmail && tEmail === userEmail) || (userName && tName === userName) || (userIdStr && String(t.id) === userIdStr)) {
            allowedChatKeys.add(`pm_chat_tenant-${t.id}`);
            allowedChatKeys.add(`pm_chat_${t.id}`);
          }
        });
      }
    } catch { }

    // 1. Scan localStorage only for THIS tenant's chat keys
    try {
      for (const key of allowedChatKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((m) => {
              const clean = (m.text || '').trim();
              if (clean && !seenTexts.has(clean)) {
                seenTexts.add(clean);
                adminMessages.push({
                  id: m.id || `admin-msg-${adminMessages.length}`,
                  sender: m.isStaff || (m.sender && m.sender.includes('Admin')) ? 'management' : 'tenant',
                  senderName: m.sender || 'Robert King (Admin)',
                  text: clean,
                  time: m.time || 'Just now',
                  attachments: m.attachments || [],
                });
              }
            });
          }
        }
      }
    } catch { }

    // 2. Scan pm_notifications for direct messages strictly addressed to THIS tenant
    try {
      const rawNotifs = localStorage.getItem('pm_notifications');
      if (rawNotifs) {
        const notifs = JSON.parse(rawNotifs);
        if (Array.isArray(notifs)) {
          notifs.forEach((n) => {
            const isForThisTenant =
              (n.recipientEmail && userEmail && n.recipientEmail.toLowerCase().trim() === userEmail) ||
              (n.recipientId && userIdStr && String(n.recipientId) === userIdStr);

            if (isForThisTenant && n.desc) {
              const clean = n.desc.trim();
              if (clean && !seenTexts.has(clean)) {
                seenTexts.add(clean);
                adminMessages.push({
                  id: n.id || `notif-msg-${adminMessages.length}`,
                  sender: 'management',
                  senderName: n.sender || 'Robert King (Admin)',
                  text: clean,
                  time: n.time || 'Just now',
                  attachments: [],
                });
              }
            }
          });
        }
      }
    } catch { }

    // 3. Fetch from Backend Database (/messages/threads)
    let backendThreadsList = [];
    try {
      const res = await apiClient.get('/messages/threads');
      const bThreads = Array.isArray(res) ? res : res?.data || [];
      if (Array.isArray(bThreads) && bThreads.length > 0) {
        for (const th of bThreads) {
          try {
            const msgRes = await apiClient.get(`/messages/threads/${th.id}`);
            const msgs = Array.isArray(msgRes) ? msgRes : msgRes?.data || [];
            const mappedMsgs = msgs.map((m) => {
              const clean = (m.content || '').trim();
              if (clean) seenTexts.add(clean);
              const isSenderTenant = m.senderId === user?.id || m.sender?.role === 'tenant';
              return {
                id: m.id,
                sender: isSenderTenant ? 'tenant' : 'management',
                senderName: m.sender?.name || (isSenderTenant ? 'You' : 'Robert King (Admin)'),
                text: clean,
                time: new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                attachments: m.attachmentUrls ? (typeof m.attachmentUrls === 'string' ? JSON.parse(m.attachmentUrls) : m.attachmentUrls) : [],
              };
            });

            backendThreadsList.push({
              id: String(th.id),
              contactName: th.otherUser?.name || 'Robert King (Admin)',
              contactInitials: (th.otherUser?.name || 'RK').slice(0, 2).toUpperCase(),
              contactRole: (th.otherUser?.role || 'admin').toUpperCase() === 'ADMIN' ? 'PROPERTY MANAGEMENT' : (th.otherUser?.role || 'MANAGEMENT').toUpperCase(),
              subject: th.lastMessage || 'Direct Support',
              householdUnit: 'Admin Office · Direct Support',
              headerTag: 'Direct Chat with Management',
              lastTime: th.lastMessageAt ? new Date(th.lastMessageAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Today',
              unreadCount: th.unreadCount || 0,
              messages: mappedMsgs,
            });
          } catch { }
        }
      }
    } catch { }

    // Assemble unified Admin conversation thread ONLY if there are messages for THIS tenant
    let adminUnifiedThread = null;
    if (adminMessages.length > 0) {
      const lastMsg = adminMessages[adminMessages.length - 1];
      adminUnifiedThread = {
        id: 'admin-direct-thread',
        contactName: 'Robert King (Admin)',
        contactInitials: 'RK',
        contactRole: 'PROPERTY MANAGEMENT',
        subject: lastMsg.text.slice(0, 45),
        householdUnit: 'Property Management Office',
        headerTag: 'Direct Chat with Management',
        lastTime: lastMsg.time || 'Just now',
        unreadCount: 0,
        messages: adminMessages,
      };
    }

    setPortalState((prev) => {
      // Filter out admin-direct-thread first to prevent leak across tenants
      let merged = (prev.threads || []).filter((t) => t.id !== 'admin-direct-thread');

      // Add backend threads
      for (const bt of backendThreadsList) {
        const existingIdx = merged.findIndex((t) => t.id === bt.id);
        if (existingIdx >= 0) {
          merged[existingIdx] = bt;
        } else {
          merged.push(bt);
        }
      }

      // Add admin direct thread ONLY if messages exist for this tenant
      if (adminUnifiedThread) {
        merged.push(adminUnifiedThread);
      }

      // Sort threads so that latest active conversations appear at the top
      merged.sort((a, b) => {
        const tA = parseTimeMinutes(a.lastTime);
        const tB = parseTimeMinutes(b.lastTime);
        return tB - tA;
      });

      return {
        ...prev,
        threads: merged,
      };
    });
  }, [user]);

  useEffect(() => {
    syncAllMessages();

    // Listen to real-time notification events when Admin sends messages
    const handleUpdate = () => {
      syncAllMessages();
    };
    window.addEventListener('pm:notification_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('pm:notification_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [syncAllMessages]);

  // Show all tenant threads consolidated per contact (Sarah Jenkins = 1 unified thread)
  const householdThreads = useMemo(() => {
    const rawThreads = portalState.threads || [];
    const threadMap = new Map();

    rawThreads.forEach((th) => {
      const key = (th.contactName || '').trim().toLowerCase() || th.id;
      if (!threadMap.has(key)) {
        threadMap.set(key, {
          ...th,
          messages: Array.isArray(th.messages) ? [...th.messages] : [],
        });
      } else {
        const existing = threadMap.get(key);
        const existingIds = new Set(existing.messages.map((m) => m.id));
        const newMsgs = (th.messages || []).filter((m) => !existingIds.has(m.id));
        existing.messages = [...existing.messages, ...newMsgs];
        existing.unreadCount = (existing.unreadCount || 0) + (th.unreadCount || 0);

        if (parseTimeMinutes(th.lastTime) >= parseTimeMinutes(existing.lastTime)) {
          existing.subject = th.subject || existing.subject;
          existing.lastTime = th.lastTime || existing.lastTime;
          existing.headerTag = th.headerTag || existing.headerTag;
        }
      }
    });

    const list = Array.from(threadMap.values());
    list.forEach((th) => {
      th.messages.sort((m1, m2) => parseTimeMinutes(m1.time) - parseTimeMinutes(m2.time));
    });

    return list;
  }, [portalState.threads]);

  const unreadCount = useMemo(() => getUnreadMessageCount(portalState), [portalState]);

  const visibleThreads = useMemo(() => {
    if (activeFilter === 'unread') {
      return householdThreads.filter((t) => (t.unreadCount || 0) > 0);
    }
    if (activeFilter === 'sent') {
      return householdThreads.filter((t) => (t.messages || []).some((m) => m.sender === 'tenant'));
    }
    return householdThreads;
  }, [householdThreads, activeFilter]);

  const activeThread = useMemo(() => {
    const preferredId = selectedThreadId || initialThreadParam;
    const prefStr = preferredId ? String(preferredId).trim() : '';
    return (
      visibleThreads.find((t) => String(t.id).trim() === prefStr) ||
      visibleThreads.find((t) => t.workOrderId && String(t.workOrderId).trim() === prefStr) ||
      visibleThreads[0] ||
      householdThreads[0] ||
      null
    );
  }, [visibleThreads, selectedThreadId, initialThreadParam, householdThreads]);

  useEffect(() => {
    if (activeThread?.id && !selectedThreadId) {
      setSelectedThreadId(activeThread.id);
      localStorage.setItem('tenant_selected_thread', activeThread.id);
    }
  }, [activeThread?.id, selectedThreadId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length]);

  const handleSelectThread = (threadId) => {
    setSelectedThreadId(threadId);
    setSearchParams({ thread: threadId }, { replace: true });
    localStorage.setItem('tenant_selected_thread', threadId);
    markThreadRead(threadId);
    setPortalState((prev) => ({
      ...prev,
      threads: (prev.threads || []).map((t) =>
        t.id === threadId ? { ...t, unreadCount: 0 } : t
      ),
    }));
    if (!isNaN(parseInt(threadId, 10))) {
      apiClient.patch(`/messages/threads/${threadId}/read`).catch(() => {});
    }
  };

  const handleMarkRead = (threadId) => {
    markThreadRead(threadId);
    setPortalState((prev) => ({
      ...prev,
      threads: (prev.threads || []).map((t) =>
        t.id === threadId ? { ...t, unreadCount: 0 } : t
      ),
    }));
    if (!isNaN(parseInt(threadId, 10))) {
      apiClient.patch(`/messages/threads/${threadId}/read`).catch(() => {});
    }
  };

  const handleFileChange = async (e) => {
    const loaded = await readFilesAsDataUrls(e.target.files, 3 - attachments.length);
    if (loaded.length > 0) {
      setAttachments((prev) => [...prev, ...loaded].slice(0, 3));
    }
    e.target.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeThread) return;
    if (!draft.trim() && attachments.length === 0) {
      toast.error('Write a message or attach a photo first.');
      return;
    }

    const cleanDraft = draft.trim();
    const timeLabel = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const newMsg = {
      id: `MSG-${Date.now()}`,
      sender: 'tenant',
      senderName: user?.name || 'You',
      text: cleanDraft,
      time: timeLabel,
      attachments,
    };

    // Update local state thread
    setPortalState((prev) => {
      const nextThreads = (prev.threads || []).map((t) => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            lastTime: timeLabel,
            messages: [...(t.messages || []), newMsg],
          };
        }
        return t;
      });
      return { ...prev, threads: nextThreads };
    });

    // Sync strictly to THIS tenant's storage key so Admin chat sees Tenant's response with multi-tenant isolation
    try {
      const uEmail = (user?.email || '').toLowerCase().trim();
      const uIdStr = user?.id ? String(user.id) : null;
      let tenantChatKey = `pm_chat_tenant-${uIdStr || 'demo'}`;

      const customTenants = JSON.parse(localStorage.getItem('custom_tenants') || '[]');
      if (Array.isArray(customTenants)) {
        const matched = customTenants.find(
          (t) => (uEmail && t.email && t.email.toLowerCase().trim() === uEmail) || (uIdStr && String(t.id) === uIdStr)
        );
        if (matched) {
          tenantChatKey = `pm_chat_tenant-${matched.id}`;
        }
      }

      const raw = localStorage.getItem(tenantChatKey);
      const parsed = raw ? JSON.parse(raw) : [];
      parsed.push({
        id: Date.now(),
        sender: user?.name || 'Tenant',
        text: cleanDraft,
        time: timeLabel,
        isStaff: false,
      });
      localStorage.setItem(tenantChatKey, JSON.stringify(parsed));
    } catch { }

    // Save to real Backend Database
    try {
      const numThreadId = parseInt(activeThread.id, 10);
      await apiClient.post('/messages', {
        recipientId: 1, // Admin user
        recipientEmail: 'admin@rentlock.com',
        content: cleanDraft,
        threadId: isNaN(numThreadId) ? undefined : numThreadId,
      });
    } catch (err) {
      console.warn('Backend message sync warning:', err.message);
    }

    // Dispatch notification to Admin
    addNotification({
      title: `💬 Reply from ${user?.name || 'Tenant'}`,
      desc: cleanDraft,
      targetRole: 'admin',
      recipientEmail: 'admin@rentlock.com',
      sender: user?.name || 'Tenant',
      link: '/communication',
      time: 'Just now',
    });

    setDraft('');
    setAttachments([]);
    toast.success('Message sent to Property Management!');
  };

  const filterTabs = [
    { key: 'inbox', label: unreadCount > 0 ? `Inbox · ${unreadCount}` : 'Inbox' },
    { key: 'unread', label: 'Unread' },
    { key: 'sent', label: 'Sent' },
  ];

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Messages"
        subtitle="Updates from your property manager and repair vendors in one place."
      />

      <Card padding="p-3.5 sm:p-6" className="space-y-4 sm:space-y-5">
        {/* Filter Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200">
          {filterTabs.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`pb-3 text-sm font-semibold border-b-2 -mb-[1px] transition-colors cursor-pointer ${
                  active
                    ? 'border-[#4A6CF7] text-[#4A6CF7]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Split Inbox + Thread View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[460px]">
          {/* Thread List */}
          <div className="lg:col-span-4 border border-gray-100 rounded-2xl p-3 space-y-2 bg-gray-50/40">
            {visibleThreads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 py-12 gap-2 text-center">
                <p>No conversations in {activeFilter}.</p>
                {activeFilter !== 'inbox' && householdThreads.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('inbox')}
                    className="text-[#4A6CF7] font-semibold hover:underline text-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    View Inbox ({householdThreads.length})
                  </button>
                )}
              </div>
            ) : (
              visibleThreads.map((thread) => {
                const isSelected = String(activeThread?.id) === String(thread.id);
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={thread.contactName} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {thread.contactName}
                          </p>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {thread.lastTime}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-indigo-600 mt-0.5 truncate">
                          {thread.householdUnit}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-xs text-gray-500 truncate">{thread.subject}</p>
                          {thread.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#4A6CF7] text-white text-[10px] font-bold shrink-0">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Active Conversation Thread */}
          <div className="lg:col-span-8 border border-gray-100 rounded-2xl p-3 sm:p-5 flex flex-col justify-between bg-white">
            {activeThread ? (
              <>
                {/* Thread Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-bold text-gray-900">
                      {activeThread.contactName}
                    </h3>
                    <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
                      {activeThread.contactRole}
                    </Badge>
                    {activeThread.unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(activeThread.id)}
                        className="text-[11px] font-medium text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark as read
                      </button>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {activeThread.headerTag}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-5 space-y-4 max-h-[340px] pr-1">
                  {(activeThread.messages || []).map((msg, idx) => {
                    const isTenant = msg.sender === 'tenant';
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isTenant ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
                            isTenant
                              ? 'bg-emerald-50 text-gray-800 border border-emerald-100'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                          {msg.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2.5">
                              {msg.attachments.map((att, attIdx) => (
                                <img
                                  key={attIdx}
                                  src={att.url}
                                  alt={att.name || 'Attachment'}
                                  className="w-24 h-24 object-cover rounded-xl border border-white shadow-sm"
                                />
                              ))}
                            </div>
                          )}
                          <p
                            className={`text-[11px] mt-2 font-medium ${
                              isTenant ? 'text-emerald-700' : 'text-gray-400'
                            }`}
                          >
                            {msg.senderName} · {msg.time}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>

                {/* Composer */}
                <form onSubmit={handleSend} className="pt-3 border-t border-gray-100 space-y-2">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                      {attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200"
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

                  <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50/70 pl-3 sm:pl-4 pr-1.5 py-1.5 focus-within:bg-white focus-within:border-[#4A6CF7] focus-within:ring-2 focus-within:ring-[#4A6CF7]/20 transition-all">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write a message to property management..."
                      className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none pr-2 py-1"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      icon={Send}
                      disabled={!draft.trim() && attachments.length === 0}
                      className="shrink-0 rounded-xl !py-1.5 !px-3 sm:!px-4 text-xs sm:text-sm font-semibold shadow-sm"
                    >
                      Send
                    </Button>
                  </div>

                  <div>
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
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6CF7] hover:underline cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Attach photo
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Select a conversation to view messages.
              </div>
            )}
          </div>
        </div>
      </Card>

      <p className="text-xs text-gray-400">
        Direct messages with Property Management and household updates.
      </p>
    </div>
  );
}
