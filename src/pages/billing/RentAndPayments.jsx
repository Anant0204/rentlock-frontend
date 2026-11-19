import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import Tabs from '../../components/ui/Tabs';
import Invoices from './Invoices';
import Receipts from './Receipts';
import SecurityDeposits from './SecurityDeposits';

const BILLING_TABS = [
  { id: 'rent', label: 'Rent Roll & Collections' },
  { id: 'receipts', label: 'Payment History & Receipts' },
  { id: 'deposits', label: 'Security Deposits' },
];

export default function RentAndPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');

  // Backward compatibility mapping for old links
  let activeTab = 'rent';
  if (paramTab === 'receipts' || paramTab === 'ledger') {
    activeTab = 'receipts';
  } else if (paramTab === 'deposits') {
    activeTab = 'deposits';
  } else {
    activeTab = 'rent';
  }

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Rent & Payments"
        subtitle="Manage tenant rent collections, due balances, and payment records."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Rent & Payments' }]}
      />

      <Tabs
        tabs={BILLING_TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === 'rent' && (
        <Invoices
          embedded
          initialOpenPayment={paramTab === 'collections'}
        />
      )}
      {activeTab === 'receipts' && <Receipts embedded />}
      {activeTab === 'deposits' && <SecurityDeposits embedded />}
    </div>
  );
}
