import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from '../components/shared/ProtectedRoute';

// Auth
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// Dashboard
import Dashboard from '../pages/dashboard/Dashboard';

// Properties
import PropertyList from '../pages/properties/PropertyList';
import AddProperty from '../pages/properties/AddProperty';
import PropertyDetail from '../pages/properties/PropertyDetail';

// Units
import UnitList from '../pages/units/UnitList';
import AddUnit from '../pages/units/AddUnit';
import UnitDetail from '../pages/units/UnitDetail';

// Tenants
import TenantList from '../pages/tenants/TenantList';
import AddTenant from '../pages/tenants/AddTenant';
import TenantProfile from '../pages/tenants/TenantProfile';

// Owners
import OwnerList from '../pages/owners/OwnerList';
import OwnerDetail from '../pages/owners/OwnerDetail';

// Managers
import ManagerList from '../pages/managers/ManagerList';
import ManagerDetail from '../pages/managers/ManagerDetail';

// Leases
import LeaseList from '../pages/leases/LeaseList';
import CreateLease from '../pages/leases/CreateLease';
import LeaseDetail from '../pages/leases/LeaseDetail';

// Rent & Payments
import RentAndPayments from '../pages/billing/RentAndPayments';

// Maintenance
import ComplaintBoard from '../pages/maintenance/ComplaintBoard';

// Expenses
import ExpenseList from '../pages/expenses/ExpenseList';
import AddExpense from '../pages/expenses/AddExpense';

// Reports
import ReportsDashboard from '../pages/reports/ReportsDashboard';

// Settings
import SettingsPage from '../pages/settings/SettingsPage';
import ProfileSettings from '../pages/settings/ProfileSettings';

// Operations & Property Services (Admin)
import OperationsOverview from '../pages/operations/OperationsOverview';
import VendorList from '../pages/vendors/VendorList';
import ParkingList from '../pages/parking/ParkingList';
import VisitorList from '../pages/visitors/VisitorList';
import StaffList from '../pages/staff/StaffList';
import CommunicationsHub from '../pages/communications/CommunicationsHub';

// Tenant Portal
import TenantPay from '../pages/tenant/TenantPay';
import TenantWorkOrder from '../pages/tenant/TenantWorkOrder';
import TenantMessages from '../pages/tenant/TenantMessages';

// Owner Portal
import OwnerOverview from '../pages/owner/OwnerOverview';
import OwnerProperties from '../pages/owner/OwnerProperties';
import OwnerTenants from '../pages/owner/OwnerTenants';
import OwnerIncomeOut from '../pages/owner/OwnerIncomeOut';
import OwnerExpenses from '../pages/owner/OwnerExpenses';
import OwnerDisbursements from '../pages/owner/OwnerDisbursements';
import OwnerRecords from '../pages/owner/OwnerRecords';
import OwnerCommunication from '../pages/owner/OwnerCommunication';

// Manager Workspace
import ManagerProperties from '../pages/manager/ManagerProperties';
import ManagerPropertyDetail from '../pages/manager/ManagerPropertyDetail';
import ManagerTenants from '../pages/manager/ManagerTenants';
import ManagerWorkOrders from '../pages/manager/ManagerWorkOrders';
import ManagerMessages from '../pages/manager/ManagerMessages';
import ManagerSchedule from '../pages/manager/ManagerSchedule';
import ManagerReports from '../pages/manager/ManagerReports';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* App */}
      <Route element={<MainLayout />}>
        {/* Admin & Manager Operations */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Properties */}
          <Route path="/properties" element={<PropertyList />} />
          <Route path="/properties/add" element={<AddProperty />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />

          {/* Units */}
          <Route path="/units" element={<UnitList />} />
          <Route path="/units/add" element={<AddUnit />} />
          <Route path="/units/:id" element={<UnitDetail />} />

          {/* Tenants */}
          <Route path="/tenants" element={<TenantList />} />
          <Route path="/tenants/add" element={<AddTenant />} />
          <Route path="/tenants/:id" element={<TenantProfile />} />

          {/* Owners */}
          <Route path="/owners" element={<OwnerList />} />
          <Route path="/owners/:id" element={<OwnerDetail />} />

          {/* Managers */}
          <Route path="/managers" element={<ManagerList />} />
          <Route path="/managers/:id" element={<ManagerDetail />} />

          {/* Leases */}
          <Route path="/leases" element={<LeaseList />} />
          <Route path="/leases/create" element={<CreateLease />} />
          <Route path="/leases/:id" element={<LeaseDetail />} />

          {/* Rent & Payments */}
          <Route path="/rent-payments" element={<RentAndPayments />} />

          {/* Maintenance */}
          <Route path="/maintenance" element={<ComplaintBoard />} />

          {/* Operations & Building Management */}
          <Route path="/operations" element={<OperationsOverview />} />
          <Route path="/operations-overview" element={<Navigate to="/operations" replace />} />
          <Route path="/vendors" element={<VendorList />} />
          <Route path="/parking" element={<ParkingList />} />
          <Route path="/visitors" element={<VisitorList />} />
          <Route path="/staff" element={<StaffList />} />
          <Route path="/communication" element={<CommunicationsHub />} />

          {/* Expenses */}
          <Route path="/expenses" element={<ExpenseList />} />
          <Route path="/expenses/add" element={<AddExpense />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsDashboard />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Tenant Portal */}
        <Route element={<ProtectedRoute allowedRoles={['tenant', 'admin']} />}>
          <Route path="/tenant/pay" element={<TenantPay />} />
          <Route path="/tenant/work-order" element={<TenantWorkOrder />} />
          <Route path="/tenant/messages" element={<TenantMessages />} />
          <Route path="/tenant/settings" element={<ProfileSettings />} />
        </Route>

        {/* Owner Portal */}
        <Route element={<ProtectedRoute allowedRoles={['owner', 'admin']} />}>
          <Route path="/owner/properties" element={<OwnerProperties />} />
          <Route path="/owner/tenants" element={<Navigate to="/owner/properties" replace />} />
          <Route path="/owner/income-out" element={<OwnerIncomeOut />} />
          <Route path="/owner/expenses" element={<OwnerExpenses />} />
          <Route path="/owner/disbursements" element={<OwnerDisbursements />} />
          <Route path="/owner/records" element={<OwnerRecords />} />
          <Route path="/owner/communication" element={<OwnerCommunication />} />
          <Route path="/owner/messages" element={<Navigate to="/owner/communication" replace />} />
          <Route path="/owner/settings" element={<ProfileSettings />} />
        </Route>

        {/* Manager Workspace */}
        <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
          <Route path="/manager/properties" element={<ManagerProperties />} />
          <Route path="/manager/properties/:id" element={<ManagerPropertyDetail />} />
          <Route path="/manager/tenants" element={<ManagerTenants />} />
          <Route path="/manager/work-orders" element={<ManagerWorkOrders />} />
          <Route path="/manager/communication" element={<ManagerMessages />} />
          <Route path="/manager/messages" element={<ManagerMessages />} />
          <Route path="/manager/schedule" element={<ManagerSchedule />} />
          <Route path="/manager/reports" element={<ManagerReports />} />
          <Route path="/manager/settings" element={<ProfileSettings />} />
        </Route>
      </Route>

      {/* Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
