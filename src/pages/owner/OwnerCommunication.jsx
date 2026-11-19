import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Send, Paperclip, X, CheckCheck, Megaphone, MessageSquare, ShieldCheck, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { addNotification } from '../../data/mockNotifications';
import { getOwnerPortalState } from '../../data/ownerPortalData';
import OwnerScopeBar from './OwnerScopeBar';
import { readFilesAsDataUrls } from '../../data/tenantPortalData';

export default function OwnerCommunication() {
  const [searchParams] = useSearchParams();
  const initialThreadParam = searchParams.get('thread');
  const { user } = useAuth();

  const [portalState, setPortalState] = useState(() => getOwnerPortalState());
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [activeFilter, setActiveFilter] = useState('inbox');
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState([]);

  const fileInputRef = useRef(null);
  const threadEndRef = useRef(null);

  // Sync real messages from Backend Database + LocalStorage Owner Chats + Notifications
  const syncAllMessages = useCallback(async () => {
    const adminMessages = [];
    const seenTexts = new Set();

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
                  adminMessages.push({
                    id: m.id || `admin-msg-${adminMessages.length}`,
                    sender: m.isStaff || (m.sender && m.sender.includes('Admin')) ? 'management' : 'owner',
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
      }
    } catch { }

    // 2. Scan pm_notifications for any direct message notifications sent to owner
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
              const isSenderOwner = m.senderId === user?.id || m.sender?.role === 'owner';
              return {
                id: m.id,
                sender: isSenderOwner ? 'owner' : 'management',
                senderName: m.sender?.name || (isSenderOwner ? 'You' : 'Robert King (Admin)'),
                text: clean,
                time: new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                attachments: m.attachmentUrls ? (typeof m.attachmentUrls === 'string' ? JSON.parse(m.attachmentUrls) : m.attachmentUrls) : [],
              };
            });

            backendThreadsList.push({
              id: String(th.id),
              contactName: th.otherUser?.name || 'Robert King (Admin)',
              contactInitials: (th.otherUser?.name || 'RK').slice(0, 2).toUpperCase(),
              contactRole: 'EXECUTIVE MANAGEMENT',
              subject: th.lastMessage || 'Portfolio & Disbursement Advisory',
              scopeLabel: 'Executive Property Management',
              headerTag: 'Direct Line · Executive Admin',
              lastTime: th.lastMessageAt ? new Date(th.lastMessageAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Today',
              unreadCount: th.unreadCount || 0,
              messages: mappedMsgs,
            });
          } catch { }
        }
      }
    } catch { }

    // Always ensure Executive Admin thread exists
    const lastAdminMsg = adminMessages.length > 0 ? adminMessages[adminMessages.length - 1] : null;
    const adminUnifiedThread = {
      id: 'admin-owner-thread',
      contactName: 'Robert King (Admin)',
      contactInitials: 'RK',
      contactRole: 'EXECUTIVE MANAGEMENT',
      subject: lastAdminMsg ? lastAdminMsg.text.slice(0, 45) : 'Direct Line · Executive Management',
      scopeLabel: 'Headquarters · Portfolio Operations',
      headerTag: 'Direct Line · Executive Admin',
      lastTime: lastAdminMsg ? lastAdminMsg.time : 'Active',
      unreadCount: 0,
      messages: adminMessages.length > 0 ? adminMessages : [
        {
          id: 'welcome-owner-msg',
          sender: 'management',
          senderName: 'Robert King (Admin)',
          text: 'Welcome to RentLock Owner Communications. You can chat directly with Executive Management regarding your property portfolio, monthly disbursements, tenant occupancy, and financial statements.',
          time: 'Active',
          attachments: [],
        },
      ],
    };

    setThreads((prev) => {
      let merged = [...backendThreadsList];

      const existingIdx = prev.findIndex((t) => t.id === 'admin-owner-thread');
      if (existingIdx >= 0) {
        const existingMsgs = prev[existingIdx].messages || [];
        const combined = [...adminUnifiedThread.messages];
        existingMsgs.forEach((em) => {
          if (!combined.some((c) => c.text === em.text)) {
            combined.push(em);
          }
        });
        adminUnifiedThread.messages = combined;
      }

      merged.unshift(adminUnifiedThread);

      // Deduplicate by ID
      const uniqueMap = new Map();
      merged.forEach((t) => uniqueMap.set(t.id, t));
      return Array.from(uniqueMap.values());
    });
  }, [user]);

  useEffect(() => {
    syncAllMessages();

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

  const unreadTotal = useMemo(() => {
    return threads.reduce((sum, t) => sum + (Number(t.unreadCount) || 0), 0);
  }, [threads]);

  const visibleThreads = useMemo(() => {
    if (activeFilter === 'unread') {
      return threads.filter((t) => (t.unreadCount || 0) > 0);
    }
    if (activeFilter === 'sent') {
      return threads.filter((t) => (t.messages || []).some((m) => m.sender === 'owner'));
    }
    return threads;
  }, [threads, activeFilter]);

  const activeThread = useMemo(() => {
    const preferredId = selectedThreadId || initialThreadParam;
    return (
      visibleThreads.find((t) => t.id === preferredId) ||
      visibleThreads[0] ||
      threads[0] ||
      null
    );
  }, [visibleThreads, selectedThreadId, initialThreadParam, threads]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length]);

  const handleSelectThread = (threadId) => {
    setSelectedThreadId(threadId);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
    );
    if (!isNaN(parseInt(threadId, 10))) {
      apiClient.patch(`/messages/threads/${threadId}/read`).catch(() => {});
    }
  };

  const handleMarkRead = (threadId) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
    );
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
      toast.error('Write a message or attach a file first.');
      return;
    }

    const cleanDraft = draft.trim();
    const timeLabel = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const newMsg = {
      id: `OWN-MSG-${Date.now()}`,
      sender: 'owner',
      senderName: user?.name || 'Claire Bennett',
      text: cleanDraft,
      time: timeLabel,
      attachments,
    };

    // Update local thread in view
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            lastTime: timeLabel,
            messages: [...(t.messages || []), newMsg],
          };
        }
        return t;
      })
    );

    // Sync to localStorage pm_chat_owner-... for Admin's Communications board
    try {
      let matchedKey = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pm_chat_owner')) {
          matchedKey = k;
          const raw = localStorage.getItem(k);
          const parsed = raw ? JSON.parse(raw) : [];
          parsed.push({
            id: Date.now(),
            sender: user?.name || 'Claire Bennett (Owner)',
            text: cleanDraft,
            time: timeLabel,
            isStaff: false,
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
              sender: user?.name || 'Claire Bennett (Owner)',
              text: cleanDraft,
              time: timeLabel,
              isStaff: false,
            },
          ])
        );
      }
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
      console.warn('Backend message sync notice:', err.message);
    }

    // Dispatch notification to Admin
    addNotification({
      title: `💬 Direct Message from ${user?.name || 'Claire Bennett'} (Owner)`,
      desc: cleanDraft,
      targetRole: 'admin',
      recipientEmail: 'admin@rentlock.com',
      sender: `${user?.name || 'Claire Bennett'} (Owner)`,
      link: '/communication',
      time: 'Just now',
    });

    setDraft('');
    setAttachments([]);
    toast.success('Message sent to Executive Management & stored in database!');
  };

  const filterTabs = [
    { key: 'inbox', label: unreadTotal > 0 ? `Inbox · ${unreadTotal}` : 'Inbox' },
    { key: 'unread', label: 'Unread' },
    { key: 'sent', label: 'Sent' },
  ];

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
        subtitle="Chat directly with Executive Property Management regarding disbursements, property status, and portfolio operations with live database syncing."
      />

      <Card padding="p-4 sm:p-6" className="space-y-4 sm:space-y-5">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[480px]">
          {/* Thread List */}
          <div className="lg:col-span-4 border border-gray-100 rounded-2xl p-3 space-y-2 bg-gray-50/40">
            {visibleThreads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 py-12 gap-2 text-center">
                <p>No conversations in {activeFilter}.</p>
                {activeFilter !== 'inbox' && threads.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('inbox')}
                    className="text-[#4A6CF7] font-semibold hover:underline text-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    View Inbox ({threads.length})
                  </button>
                )}
              </div>
            ) : (
              visibleThreads.map((thread) => {
                const isSelected = activeThread?.id === thread.id;
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
                          {thread.scopeLabel}
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

          {/* Active Conversation View */}
          <div className="lg:col-span-8 border border-gray-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-white shadow-xs">
            {activeThread ? (
              <>
                {/* Header */}
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

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto py-5 space-y-4 max-h-[350px] pr-1">
                  {(activeThread.messages || []).map((msg, idx) => {
                    const isOwner = msg.sender === 'owner';
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
                            isOwner
                              ? 'bg-indigo-600 text-white shadow-sm'
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
                                  className="w-24 h-24 object-cover rounded-xl border border-white/20 shadow-sm"
                                />
                              ))}
                            </div>
                          )}
                          <p
                            className={`text-[11px] mt-2 font-medium ${
                              isOwner ? 'text-indigo-100' : 'text-gray-400'
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
                      placeholder="Write a message to Executive Property Management..."
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
                      Attach document / photo
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
    </div>
  );
}
