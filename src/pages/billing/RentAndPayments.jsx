import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import Tabs from '../../components/ui/Tabs';
import Invoices from './Invoices';
import Collections from './Collections';
import PaymentLedger from './PaymentLedger';
import Receipts from './Receipts';
import SecurityDeposits from './SecurityDeposits';

const BILLING_TABS = [
  { id: 'invoices', label: 'Invoices' },
  { id: 'collections', label: 'Collections & Aging' },
  { id: 'ledger', label: 'Payment Ledger' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'deposits', label: 'Security Deposits' },
];

const VALID_TAB_IDS = new Set(BILLING_TABS.map((t) => t.id));

export default function RentAndPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');
  const activeTab = VALID_TAB_IDS.has(paramTab) ? paramTab : 'invoices';

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Rent & Payments"
        subtitle="Manage U.S. invoices, rent collections & aging, payment ledger, settlement receipts, and trust security deposits."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Rent & Payments' }]}
      />

      <Tabs
        tabs={BILLING_TABS}
        activeTab={activeTab}
        onChange={(tabId) => setSearchParams({ tab: tabId })}
      />

      {activeTab === 'invoices' && <Invoices embedded />}
      {activeTab === 'collections' && <Collections embedded />}
      {activeTab === 'ledger' && <PaymentLedger embedded />}
      {activeTab === 'receipts' && <Receipts embedded />}
      {activeTab === 'deposits' && <SecurityDeposits embedded />}
    </div>
  );
}

