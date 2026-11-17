import { useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { createManagerWorkOrder, MANAGER_APPROVAL_LIMIT } from '../../data/managerWorkspaceData';

export default function CreateWorkOrderModal({
  isOpen,
  onClose,
  properties = [],
  defaultPropertyId = '',
  onCreated,
}) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id || '');
  const [unit, setUnit] = useState('');
  const [title, setTitle] = useState('');
  const [report, setReport] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [vendorName, setVendorName] = useState('');
  const [estimateAmount, setEstimateAmount] = useState('');

  const effectivePropertyId = propertyId || defaultPropertyId || properties[0]?.id || '';
  const selectedProperty = properties.find((p) => p.id === effectivePropertyId);
  const unitOptions = selectedProperty?.units?.map((u) => ({
    value: u.unit,
    label: `${u.unit} (${u.tenant})`,
  })) || [];

  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim() || !report.trim()) {
      toast.error('Please enter a title and issue description.');
      return;
    }
    const { state, workOrder } = createManagerWorkOrder({
      propertyId: effectivePropertyId,
      unit: unit || selectedProperty?.units?.[0]?.unit || 'Common',
      title,
      report,
      priority,
      vendorName,
      estimateAmount,
    });
    toast.success(`${workOrder.id} created (time-stamped)`);
    setTitle('');
    setReport('');
    setVendorName('');
    setEstimateAmount('');
    setPriority('Normal');
    if (onCreated) onCreated(state, workOrder);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create work order"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Save} onClick={handleSave}>
            Save work order
          </Button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        <Select
          label="Assigned property"
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          value={effectivePropertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            setUnit('');
          }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Unit"
            placeholder="Select unit"
            options={unitOptions}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <Select
            label="Priority"
            options={['Urgent', 'High', 'Normal']}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>
        <Input
          label="Request title"
          required
          placeholder="e.g. Kitchen sink leak"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Report details <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder="Describe the repair issue and access notes..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 resize-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Vendor / Assignee"
            placeholder="e.g. QuickFix Plumbing"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
          />
          <Input
            label="Estimate ($)"
            type="number"
            min="0"
            placeholder="e.g. 450"
            helperText={`Estimates above $${MANAGER_APPROVAL_LIMIT.toLocaleString()} route for approval`}
            value={estimateAmount}
            onChange={(e) => setEstimateAmount(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

