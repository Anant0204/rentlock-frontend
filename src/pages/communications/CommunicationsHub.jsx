import { useState, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
  Megaphone, Plus, Search, Send, Mail, AlertTriangle,
  Users, Clock, Smartphone, MessageSquare, Trash2,
  CheckCircle2, Sparkles, Wrench, Package, ShieldAlert,
  Flame, Droplets, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { getBroadcasts, sendBroadcast, deleteBroadcast } from '../../data/mockOperations';
import { getTenants } from '../../data/mockTenants';

const TABS = [
  { id: 'broadcasts', label: '📢 Building Notices (Notice Board)' },
  { id: 'direct', label: '💬 Tenant Chats (Inbox)' },
  { id: 'templates', label: '📋 Ready Notice Templates' },
];

const TEMPLATES = [
  {
    id: 'TPL-01',
    title: 'Water Main Maintenance / Temporary Shutoff',
    category: 'Plumbing & Water',
    icon: Droplets,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    audience: 'All Residents · Impacted Line',
    sample: 'Water service will be temporarily shut off for scheduled valve replacement on Tuesday between 10:00 AM and 2:00 PM. Please plan accordingly.',
  },
  {
    id: 'TPL-02',
    title: 'Monthly Rent Statement & Autopay Reminder',
    category: 'Billing Reminder',
    icon: Sparkles,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    audience: 'All Active Tenants',
    sample: 'Friendly reminder: Rent statements for the upcoming month are now posted in your resident portal. Please verify your autopay or payment method.',
  },
  {
    id: 'TPL-03',
    title: 'Annual Fire Alarm Strobe & Audio Test',
    category: 'Safety & Inspection',
    icon: Flame,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    audience: 'Entire Building',
    sample: 'Certified inspectors from ShieldPro will test building fire alarm strobes and horns on Thursday starting at 11:00 AM. No evacuation required.',
  },
  {
    id: 'TPL-04',
    title: 'Severe Weather / Winter Snow Advisory',
    category: 'Weather Alert',
    icon: AlertTriangle,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    audience: 'All Residents & Parking Tenants',
    sample: 'Severe winter storm warning issued. Please move vehicles from surface courtyards to designated garage levels to facilitate snowplow operations.',
  },
];

export default function CommunicationsHub() {
  const [broadcasts, setBroadcasts] = useState(() => getBroadcasts());
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [broadcastToDelete, setBroadcastToDelete] = useState(null);

  useEffect(() => {
    apiClient.get('/operations/communications').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setBroadcasts(items);
        localStorage.setItem('custom_broadcasts', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  // Direct Messaging State
  const tenants = useMemo(() => getTenants(), []);
  const [selectedTenant, setSelectedTenant] = useState(tenants[0] || null);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'Rebecca Miller (Unit A-204)',
      text: 'Good morning! Quick question: is package delivery accessible on Saturdays?',
      time: '10:14 AM',
      isStaff: false,
    },
    {
      id: 2,
      sender: 'Property Management Staff',
      text: 'Yes! Concierge package locker room is open 24/7 with your resident key fob.',
      time: '10:22 AM',
      isStaff: true,
    },
  ]);
  const [newMsgText, setNewMsgText] = useState('');

  // Form State for Composing a Notice
  const [form, setForm] = useState({
    title: '',
    audience: 'All Residents · Sunrise Residency',
    channels: ['SMS Alert', 'Email Notice', 'Resident Portal Alert'],
    isEmergency: false,
    body: '',
  });

  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter((b) => {
      const q = (searchTerm || '').toLowerCase();
      if (!q) return true;
      return (
        (b.title || '').toLowerCase().includes(q) ||
        (b.audience || b.targetAudience || '').toLowerCase().includes(q) ||
        (b.body || b.content || '').toLowerCase().includes(q)
      );
    });
  }, [broadcasts, searchTerm]);

  const stats = useMemo(() => {
    const total = broadcasts.length;
    const emergency = broadcasts.filter((b) => b.isEmergency).length;
    return {
      total,
      emergency,
      deliveryRate: '99.8%',
      openRate: '91.4%',
    };
  }, [broadcasts]);

  const handleToggleChannel = (chan) => {
    if (form.channels.includes(chan)) {
      if (form.channels.length === 1) {
        toast.error('At least one delivery channel must be selected.');
        return;
      }
      setForm({ ...form, channels: form.channels.filter((c) => c !== chan) });
    } else {
      setForm({ ...form, channels: [...form.channels, chan] });
    }
  };

  const handleOpenCompose = (template = null) => {
    if (template) {
      setForm({
        title: template.title,
        audience: template.audience,
        channels: ['SMS Alert', 'Email Notice', 'Resident Portal Alert'],
        isEmergency: template.category.includes('Emergency') || template.category.includes('Alert'),
        body: template.sample,
      });
    } else {
      setForm({
        title: '',
        audience: 'All Residents · Sunrise Residency',
        channels: ['SMS Alert', 'Email Notice', 'Resident Portal Alert'],
        isEmergency: false,
        body: '',
      });
    }
    setIsComposeOpen(true);
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Notice title and message content are required.');
      return;
    }
    const updated = sendBroadcast({
      title: form.title.trim(),
      audience: form.audience,
      channels: form.channels,
      isEmergency: form.isEmergency,
      body: form.body.trim(),
    });
    setBroadcasts(updated);
    setIsComposeOpen(false);
    toast.success('Notice published and sent to all residents successfully!');
  };

  const handleDeleteBroadcast = () => {
    if (!broadcastToDelete) return;
    const updated = deleteBroadcast(broadcastToDelete.id);
    setBroadcasts(updated);
    if (selectedBroadcast?.id === broadcastToDelete.id) {
      setSelectedBroadcast(null);
    }
    toast.success(`Notice "${broadcastToDelete.title}" deleted.`);
    setIsDeleteOpen(false);
    setBroadcastToDelete(null);
  };

  const handleSendDirectMessage = (e) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: 'Property Management Staff',
      text: newMsgText.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      isStaff: true,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setNewMsgText('');
    toast.success(`Direct message sent to ${selectedTenant?.name}.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Building Notices & Tenant Messaging"
        subtitle="Post building announcements, send emergency SMS alerts, and chat directly with residents."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Communication' }]}
        actions={
          <Button icon={Plus} size="sm" onClick={() => handleOpenCompose()}>
            Post New Notice
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Notices Dispatched"
          value={stats.total}
          subtitle="Announcements on board"
          icon={Megaphone}
          color="indigo"
        />
        <StatCard
          title="SMS Delivery Rate"
          value={stats.deliveryRate}
          subtitle="Delivered to tenant phones"
          icon={Smartphone}
          color="blue"
        />
        <StatCard
          title="Email Read Rate"
          value={stats.openRate}
          subtitle="Delivered to resident inboxes"
          icon={Mail}
          color="purple"
        />
        <StatCard
          title="Urgent Alerts Active"
          value={`${stats.emergency} Urgent`}
          subtitle="Pinned emergency banners"
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box for Notices */}
          {activeTab === 'broadcasts' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* TAB 1: BUILDING NOTICES (NOTICE BOARD)         */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-4">
          {filteredBroadcasts.length === 0 ? (
            <Card>
              <div className="py-12 text-center space-y-3">
                <Megaphone className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">No notices found.</p>
                <Button size="sm" variant="secondary" onClick={() => setSearchTerm('')}>
                  Reset Search
                </Button>
              </div>
            </Card>
          ) : (
            filteredBroadcasts.map((b) => {
              const isUrgent = b.isEmergency;

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border transition-all p-5 space-y-3.5 shadow-xs hover:shadow-md ${
                    isUrgent
                      ? 'border-rose-300 bg-gradient-to-r from-rose-50/30 via-white to-white'
                      : 'border-gray-200/90 hover:border-indigo-300'
                  }`}
                >
                  {/* Top Bar: Category badge, ID, Timestamp, Delete button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUrgent ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                          <AlertTriangle className="w-3 h-3" /> URGENT ALERT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          ANNOUNCEMENT
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {b.id}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{b.sentAt} · Sent by {b.sentBy}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setSelectedBroadcast(b)}
                      >
                        View Notice
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setBroadcastToDelete(b);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Notice Content */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">
                      {b.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed mt-1.5">
                      {b.body}
                    </p>
                  </div>

                  {/* Footer Row: Audience & Delivery Channels */}
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Audience: <strong>{b.audience}</strong></span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ {b.deliveryRate} Delivered ({b.deliveredCount} / {b.totalRecipients} Tenants)
                      </span>
                      <div className="flex items-center gap-1">
                        {b.channels.map((chan, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700"
                          >
                            {chan}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────── */}
      {/* TAB 2: DIRECT RESIDENT THREADS (INBOX)         */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[500px]">
          {/* Tenant Contact List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col space-y-2">
            <div className="px-2 py-1 font-bold text-xs text-gray-900 flex items-center justify-between border-b border-gray-100 pb-2">
              <span>Verified Residents</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {tenants.length} Tenants
              </span>
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[460px]">
              {tenants.map((t) => {
                const isSelected = selectedTenant?.id === t.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTenant(t)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border border-indigo-200 shadow-xs'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 leading-tight">{t.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Unit {t.unitNumber} · {t.phone}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 flex flex-col justify-between overflow-hidden shadow-xs">
            {/* Chat Header */}
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  {selectedTenant?.name.slice(0, 2).toUpperCase() || 'TN'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{selectedTenant?.name}</h4>
                  <p className="text-[11px] text-gray-500">
                    Unit {selectedTenant?.unitNumber} · {selectedTenant?.propertyName} · {selectedTenant?.phone}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Live Chat Open
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px] bg-slate-50/50">
              {chatMessages.map((msg) => (
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
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendDirectMessage} className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder={`Type a message to ${selectedTenant?.name || 'resident'}...`}
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
      )}

      {/* ────────────────────────────────────────────── */}
      {/* TAB 3: READY-MADE NOTICE TEMPLATES             */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TEMPLATES.map((t) => {
            const TplIcon = t.icon;

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 p-5 space-y-3.5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${t.color}`}>
                        <TplIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{t.title}</h4>
                        <span className="text-[11px] font-semibold text-gray-500">{t.category}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed italic">
                    "{t.sample}"
                  </p>

                  <div className="text-[11px] text-gray-400">
                    Target Audience: <strong className="text-gray-700">{t.audience}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <Button
                    size="sm"
                    className="w-full"
                    icon={Plus}
                    onClick={() => handleOpenCompose(t)}
                  >
                    Use This Template
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────── */}
      {/* 1. COMPOSE NEW NOTICE MODAL                    */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="Post New Notice / Send Broadcast"
        size="lg"
        bodyClassName="overflow-visible"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsComposeOpen(false)}>
              Cancel
            </Button>
            <Button icon={Send} onClick={handleSendBroadcast}>
              Publish &amp; Send Notice
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
          <Input
            label="Notice Title *"
            required
            placeholder="e.g. Scheduled Elevator Maintenance on Friday"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Target Audience"
              value={form.audience}
              options={[
                'All Residents · Sunrise Residency',
                'All Assigned Parking Tenants',
                'North Block (Floors 1–4)',
                'South Block (Floors 1–4)',
              ]}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            />

            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                Urgency Level
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={form.isEmergency}
                  onChange={(e) => setForm({ ...form, isEmergency: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="font-bold text-rose-700 text-xs">
                  Mark as URGENT Emergency Alert
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
              Delivery Channels
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['SMS Alert', 'Email Notice', 'Resident Portal Alert'].map((chan) => {
                const isSelected = form.channels.includes(chan);
                return (
                  <button
                    key={chan}
                    type="button"
                    onClick={() => handleToggleChannel(chan)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    <span>{chan}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
              Notice Content / Message Body *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Write the full announcement details for residents..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-gray-800"
            />
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* 2. VIEW NOTICE DETAILS MODAL                   */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedBroadcast)}
        onClose={() => setSelectedBroadcast(null)}
        title={selectedBroadcast?.title || 'Notice Details'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectedBroadcast(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedBroadcast && (
          <div className="space-y-4 text-xs text-gray-700">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-gray-500 font-bold">{selectedBroadcast.id}</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedBroadcast.deliveryRate} Delivered ({selectedBroadcast.deliveredCount} / {selectedBroadcast.totalRecipients})
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">{selectedBroadcast.sentAt} · Sent by {selectedBroadcast.sentBy}</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
              <p className="font-bold text-sm text-gray-900">{selectedBroadcast.title}</p>
              <p className="text-gray-700 leading-relaxed">{selectedBroadcast.body}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-[11px]">
              <span className="text-gray-500">Audience: <strong>{selectedBroadcast.audience}</strong></span>
              <div className="flex gap-1">
                {selectedBroadcast.channels.map((chan, idx) => (
                  <span key={idx} className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                    {chan}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* 3. DELETE NOTICE CONFIRMATION MODAL            */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Notice"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDeleteBroadcast}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Notice</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-gray-700">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Remove this notice from the board?</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                This will delete <strong>"{broadcastToDelete?.title}"</strong> from the resident notice feed.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
