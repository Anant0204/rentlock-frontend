import { useMemo, useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { FileText, Search, Eye, Download, Shield, Clock } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import {
  getOwnerPortalState,
  setSelectedOwnerProperty,
  logOwnerRecordDownload,
  triggerTextDownload,
} from '../../data/ownerPortalData';
import OwnerScopeBar from './OwnerScopeBar';

const RECORD_TYPES = [
  'All record types',
  'Statement',
  'Expense',
  'Property document',
  'Disbursement',
];

export default function OwnerRecords() {
  const [portalState, setPortalState] = useState(() => getOwnerPortalState());
  const [searchTerm, setSearchTerm] = useState('');
  const [recordType, setRecordType] = useState('All record types');
  const [previewRecord, setPreviewRecord] = useState(null);

  useEffect(() => {
    apiClient.get('/portal/owner/documents').then((res) => {
      const docs = Array.isArray(res) ? res : res?.items;
      if (Array.isArray(docs) && docs.length > 0) {
        setPortalState((prev) => {
          const mapped = docs.map((d) => ({
            id: d.id,
            title: d.title,
            recordType: d.category === 'Tax Document' ? 'Tax' : 'Property document',
            propertyName: 'Sunrise Residency',
            propertyId: 'sunrise-residency',
            date: d.issuedAt ? d.issuedAt.slice(0, 10) : '2026-10-01',
            status: 'Verified',
            fileSize: d.fileSize || '1.2 MB',
            content: `RentLock Verified Record: ${d.title}\nCategory: ${d.category}\nIssued: ${d.issuedAt}`,
          }));
          return {
            ...prev,
            records: [...mapped, ...prev.records],
          };
        });
      }
    }).catch(() => {});
  }, []);

  const selectedPropertyId = portalState.selectedPropertyId || 'sunrise-residency';

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return portalState.records.filter((rec) => {
      if (selectedPropertyId !== 'all' && rec.propertyId !== selectedPropertyId) return false;
      if (recordType !== 'All record types' && rec.recordType !== recordType) return false;
      if (
        q &&
        !rec.title.toLowerCase().includes(q) &&
        !rec.propertyName.toLowerCase().includes(q) &&
        !rec.summary.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [portalState.records, selectedPropertyId, recordType, searchTerm]);

  const handlePropertyChange = (nextId) => {
    setPortalState(setSelectedOwnerProperty(nextId));
  };

  const handleDownload = (rec) => {
    const body = [
      `RENTLOCK OWNER RECORD ARCHIVE`,
      `Owner: ${portalState.ownerProfile.name} (${portalState.ownerProfile.entityName})`,
      `Title: ${rec.title}`,
      `Type: ${rec.recordType}`,
      `Property: ${rec.propertyName}`,
      `Date: ${rec.date}`,
      `File: ${rec.fileName}`,
      ``,
      `Summary:`,
      rec.summary,
    ].join('\n');
    triggerTextDownload(rec.fileName, body);
    const updated = logOwnerRecordDownload(rec.title, portalState.ownerProfile.name);
    setPortalState(updated);
  };

  return (
    <div className="space-y-6 pb-8">
      <OwnerScopeBar
        sectionLabel="Records"
        properties={portalState.properties}
        selectedPropertyId={selectedPropertyId}
        onChangeProperty={handlePropertyChange}
        periodLabel={portalState.periodLabel}
      />

      <PageHeader
        title="Statements, Invoices & Property Records"
        subtitle="Preview and download monthly statements, expense receipts, COI files, and disbursement notices."
      />

      {/* Search & Record Type Filter */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search statements, invoices, policies, or payouts..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {RECORD_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setRecordType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  recordType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Records List + Recent Download Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`Available Records (${filteredRecords.length})`}
            subtitle="Scoped strictly to your owned buildings"
          />
          <div className="divide-y divide-gray-100">
            {filteredRecords.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No documents matched your search criteria.
              </p>
            ) : (
              filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{rec.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge status="Active">{rec.recordType}</Badge>
                        <span className="text-xs text-gray-500">
                          {rec.propertyName} · {rec.date} · {rec.fileSize}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{rec.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Eye}
                      onClick={() => setPreviewRecord(rec)}
                    >
                      Preview
                    </Button>
                    <Button size="sm" icon={Download} onClick={() => handleDownload(rec)}>
                      Download
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Download Activity"
            subtitle="Time-stamped owner export log"
          />
          <div className="space-y-3">
            {(portalState.downloadActivity || []).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1"
              >
                <p className="font-semibold text-gray-900">{log.recordTitle}</p>
                <div className="flex items-center justify-between text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {log.downloadedAt}
                  </span>
                  <span>{log.actor}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Document Scope &amp; Privacy Guarantee</p>
          <p className="text-emerald-800 mt-0.5">
            Tenant personal phone numbers, emails, private IDs, internal staff notes, and other property owners&apos; files are hidden from this archive.
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={Boolean(previewRecord)}
        onClose={() => setPreviewRecord(null)}
        title={previewRecord ? previewRecord.title : ''}
        footer={
          previewRecord && (
            <>
              <Button variant="secondary" onClick={() => setPreviewRecord(null)}>
                Close
              </Button>
              <Button icon={Download} onClick={() => handleDownload(previewRecord)}>
                Download File
              </Button>
            </>
          )
        }
      >
        {previewRecord && (
          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Property</p>
                <p className="font-semibold text-gray-900">{previewRecord.propertyName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Document Date</p>
                <p className="font-semibold text-gray-900">{previewRecord.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-semibold text-gray-900">{previewRecord.recordType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">File Name</p>
                <p className="font-mono text-xs text-indigo-700">{previewRecord.fileName}</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{previewRecord.summary}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
