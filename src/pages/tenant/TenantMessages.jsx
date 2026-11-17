import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Send, Paperclip, X, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import {
  getTenantPortalState,
  sendTenantMessage,
  markThreadRead,
  getUnreadMessageCount,
  readFilesAsDataUrls,
} from '../../data/tenantPortalData';

export default function TenantMessages() {
  const [searchParams] = useSearchParams();
  const initialThreadParam = searchParams.get('thread');

  const [portalState, setPortalState] = useState(() => getTenantPortalState());
  const [activeFilter, setActiveFilter] = useState('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    apiClient.get('/operations/communications').then((res) => {
      const items = Array.isArray(res) ? res : res?.items;
      if (Array.isArray(items) && items.length > 0) {
        setPortalState((prev) => {
          const mapped = items.map((c, idx) => ({
            id: String(c.id || c.broadcastNumber || idx + 1),
            subject: c.title,
            householdUnit: prev.household.shortUnitLabel || 'A-204',
            unreadCount: 0,
            messages: [
              {
                id: 1,
                sender: 'management',
                senderLabel: 'Property Management',
                text: c.body || c.content,
                sentAt: '10:30 AM',
                attachments: [],
              },
            ],
          }));
          return {
            ...prev,
            threads: [...mapped, ...prev.threads],
          };
        });
      }
    }).catch(() => {});
  }, []);

  const fileInputRef = useRef(null);
  const threadEndRef = useRef(null);

  // Scope strictly to this tenant's own household & work orders
  const householdThreads = useMemo(() => {
    const unit = portalState.household.shortUnitLabel;
    return portalState.threads.filter((t) => t.householdUnit === unit || t.workOrderId);
  }, [portalState]);

  const unreadCount = useMemo(() => getUnreadMessageCount(portalState), [portalState]);

  const visibleThreads = useMemo(() => {
    if (activeFilter === 'unread') {
      return householdThreads.filter((t) => (t.unreadCount || 0) > 0);
    }
    if (activeFilter === 'sent') {
      return householdThreads.filter((t) => t.messages.some((m) => m.sender === 'tenant'));
    }
    return householdThreads;
  }, [householdThreads, activeFilter]);

  const activeThread = useMemo(() => {
    const preferredId = selectedThreadId || initialThreadParam;
    return (
      visibleThreads.find((t) => t.id === preferredId) ||
      visibleThreads[0] ||
      null
    );
  }, [visibleThreads, selectedThreadId, initialThreadParam]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length]);

  const handleSelectThread = (threadId) => {
    setSelectedThreadId(threadId);
    const updated = markThreadRead(threadId);
    setPortalState(updated);
  };

  const handleMarkRead = (threadId) => {
    const updated = markThreadRead(threadId);
    setPortalState(updated);
  };

  const handleFileChange = async (e) => {
    const loaded = await readFilesAsDataUrls(e.target.files, 3 - attachments.length);
    if (loaded.length > 0) {
      setAttachments((prev) => [...prev, ...loaded].slice(0, 3));
    }
    e.target.value = '';
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!activeThread) return;
    if (!draft.trim() && attachments.length === 0) {
      toast.error('Write a message or attach a photo first.');
      return;
    }

    try {
      const updated = sendTenantMessage({
        threadId: activeThread.id,
        text: draft,
        attachments,
      });
      setPortalState(updated);
      setDraft('');
      setAttachments([]);
    } catch (err) {
      toast.error(err.message || 'Unable to send message.');
    }
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
              <div className="h-full flex items-center justify-center text-xs text-gray-400 py-12">
                No conversations in {activeFilter}.
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
                  {activeThread.messages.map((msg) => {
                    const isTenant = msg.sender === 'tenant';
                    return (
                      <div
                        key={msg.id}
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
                              {msg.attachments.map((att, idx) => (
                                <img
                                  key={idx}
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
                      placeholder="Write a message..."
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
        Keep it simple: one tenant inbox, message thread, optional attachment, and send. Tenant sees only conversations for their own household and work orders.
      </p>
    </div>
  );
}
