import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Plus, X, AlertTriangle, Wrench, MessageSquare, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import {
  getTenantPortalState,
  createTenantWorkOrder,
  readFilesAsDataUrls,
} from '../../data/tenantPortalData';

export default function TenantWorkOrder() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [portalState, setPortalState] = useState(() => getTenantPortalState());
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [urgency, setUrgency] = useState('Normal');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 1. Sync live tenant unit from backend
    apiClient.get('/portal/tenant/balance').then((liveBal) => {
      if (liveBal?.tenant) {
        const liveUnit = `${liveBal.tenant.propertyName} · Unit ${liveBal.tenant.unitNumber}`;
        setPortalState((prev) => ({
          ...prev,
          household: {
            ...prev?.household,
            unitLabel: liveUnit,
            propertyName: liveBal.tenant.propertyName,
            unitCode: liveBal.tenant.unitNumber,
          },
        }));
      }
    }).catch(() => {});

    // 2. Load tickets
    const loadTickets = () => {
      apiClient.get('/maintenance?limit=100').then((res) => {
        const liveTickets = Array.isArray(res) ? res : res?.items;
        if (Array.isArray(liveTickets) && liveTickets.length > 0) {
          setPortalState((prev) => {
            const existingIds = new Set((prev.workOrders || []).map((w) => w.id));
            const mapped = liveTickets.map((t) => ({
              id: String(t.ticketNumber || t.id),
              title: t.title || t.issue || 'Repair Request',
              category: t.category || 'General',
              status: t.status === 'In_Progress' ? 'In progress' : t.status === 'Closed' ? 'Completed' : 'Open',
              urgency: t.priority === 'Emergency' || t.priority === 'High' ? 'Urgent' : 'Normal',
              loggedAt: t.createdAt ? t.createdAt.slice(0, 10) : '2026-11-20',
              description: t.description || '',
              notes: t.description || '',
              photos: [],
            }));
            const newOnly = mapped.filter((w) => !existingIds.has(w.id));
            return {
              ...prev,
              workOrders: [...newOnly, ...(prev.workOrders || [])],
            };
          });
        }
      }).catch(() => {});
    };

    loadTickets();
    window.addEventListener('rentlock_work_orders_changed', loadTickets);
    return () => {
      window.removeEventListener('rentlock_work_orders_changed', loadTickets);
    };
  }, []);

  const handlePhotoChange = async (e) => {
    const loaded = await readFilesAsDataUrls(e.target.files, 4 - photos.length);
    if (loaded.length > 0) {
      setPhotos((prev) => [...prev, ...loaded].slice(0, 4));
    }
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe the problem before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const result = createTenantWorkOrder({
        description,
        urgency,
        photos,
      });
      setPortalState(result.state);
      setDescription('');
      setPhotos([]);
      setUrgency('Normal');
      toast.success(`${result.workOrder.id} submitted. Manager and Admin notified.`);
    } catch (err) {
      toast.error(err.message || 'Could not submit work order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Request a repair"
        subtitle="Tell us what is wrong. Your property manager and admin will follow up here."
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card padding="p-6" className="space-y-5">
          {/* Describe the problem */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              DESCRIBE THE PROBLEM
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Water is leaking under the kitchen sink. It gets worse when the faucet runs."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all resize-none"
            />
          </div>

          {/* Photos and Urgency Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1 items-start">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Add photos (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-600 text-xs font-semibold hover:bg-indigo-100/70 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add photos from your phone
              </button>

              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group"
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                How urgent is it?
              </label>
              <div className="flex gap-2">
                {['Normal', 'Urgent'].map((level) => {
                  const selected = urgency === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setUrgency(level)}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        selected
                          ? level === 'Urgent'
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Urgent repair info */}
          <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold text-amber-800">Urgent repair?</p>
              <p className="mt-0.5 leading-relaxed">
                For immediate danger, call emergency services or the appropriate utility first.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={submitting}
              icon={Wrench}
            >
              Submit work order
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Your property manager and administrator will see this request immediately.
            </p>
          </div>
        </Card>
      </form>

      {/* Trackable Work Orders for This Household */}
      <Card padding="p-6" className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Your work orders</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Track repair status, attached photos, and updates
            </p>
          </div>
          <Badge variant="primary">{portalState.workOrders?.length || 0} total</Badge>
        </div>

        <div className="divide-y divide-gray-100">
          {(portalState.workOrders || []).map((wo) => (
            <div
              key={wo.id}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600">{wo.id}</span>
                  <Badge variant={wo.urgency === 'Urgent' ? 'danger' : 'success'}>
                    {wo.urgency || 'Normal'}
                  </Badge>
                  <Badge variant={wo.status === 'Completed' ? 'success' : 'warning'}>
                    {wo.status || 'Open'}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-gray-900">{wo.description || wo.title}</p>
                <p className="text-xs text-gray-500">
                  {wo.unit || 'Assigned Unit'} · {wo.createdAtLabel || wo.loggedAt || 'Recent'}
                </p>
                {wo.photos?.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> {wo.photos.length} photo(s) attached
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={MessageSquare}
                onClick={() => navigate(`/tenant/messages?thread=${wo.id}`)}
                className="shrink-0"
              >
                View updates
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
