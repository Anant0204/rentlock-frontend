import {
  LayoutDashboard, Building2, DoorOpen, Users, FileText, CircleDollarSign,
  Wrench, Receipt, BarChart3, Settings, Home, CalendarCheck, CreditCard,
  MessageSquare, ArrowLeftRight, Landmark, FolderOpen, UserCheck, Briefcase,
  Truck, Car, KeyRound, Megaphone, ShieldCheck, Activity
} from 'lucide-react';

export const sidebarMenu = [
  {
    section: '',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['super_admin', 'admin'] },
      { label: 'Properties', icon: Building2, path: '/properties', roles: ['super_admin', 'admin'] },
      { label: 'Units', icon: DoorOpen, path: '/units', roles: ['super_admin', 'admin'] },
      { label: 'Tenants', icon: Users, path: '/tenants', roles: ['super_admin', 'admin'] },
      { label: 'Owners', icon: UserCheck, path: '/owners', roles: ['super_admin', 'admin'] },
      { label: 'Managers', icon: Briefcase, path: '/managers', roles: ['super_admin', 'admin'] },
      { label: 'Operations Overview', icon: Activity, path: '/operations', roles: ['super_admin', 'admin'] },
      { label: 'Vendors & Payees', icon: Truck, path: '/vendors', roles: ['super_admin', 'admin'] },
      { label: 'Parking', icon: Car, path: '/parking', roles: ['super_admin', 'admin'] },
      { label: 'Visitor Management', icon: ShieldCheck, path: '/visitors', roles: ['super_admin', 'admin'] },
      { label: 'Staff & Access', icon: KeyRound, path: '/staff', roles: ['super_admin', 'admin'] },
      { label: 'Communication', icon: Megaphone, path: '/communication', roles: ['super_admin', 'admin'] },
      { label: 'Leases', icon: FileText, path: '/leases', roles: ['super_admin', 'admin'] },
      { label: 'Rent & Payments', icon: CircleDollarSign, path: '/rent-payments', roles: ['super_admin', 'admin'] },
      { label: 'Maintenance', icon: Wrench, path: '/maintenance', roles: ['super_admin', 'admin'] },
      { label: 'Expenses', icon: Receipt, path: '/expenses', roles: ['super_admin', 'admin'] },
      { label: 'Reports', icon: BarChart3, path: '/reports', roles: ['super_admin', 'admin'] },
      { label: 'Settings', icon: Settings, path: '/settings', roles: ['super_admin', 'admin'] },
    ],
  },
  {
    section: 'Owner Portal',
    items: [
      { label: 'Overview', icon: Home, path: '/dashboard', roles: ['owner'] },
      { label: 'Properties', icon: Building2, path: '/owner/properties', roles: ['owner'] },
      { label: 'Income & out', icon: ArrowLeftRight, path: '/owner/income-out', roles: ['owner'] },
      { label: 'Expenses', icon: Receipt, path: '/owner/expenses', roles: ['owner'] },
      { label: 'Disbursements', icon: Landmark, path: '/owner/disbursements', roles: ['owner'] },
      { label: 'Records', icon: FolderOpen, path: '/owner/records', roles: ['owner'] },
      { label: 'Communication', icon: Megaphone, path: '/owner/communication', roles: ['owner'] },
      { label: 'Settings', icon: Settings, path: '/owner/settings', roles: ['owner'] },
    ],
  },
  {
    section: 'Manager Workspace',
    items: [
      { label: 'Home', icon: Home, path: '/dashboard', roles: ['manager'] },
      { label: 'Properties', icon: Building2, path: '/manager/properties', roles: ['manager'] },
      { label: 'Tenants', icon: Users, path: '/manager/tenants', roles: ['manager'] },
      { label: 'Work Orders', icon: Wrench, path: '/manager/work-orders', roles: ['manager'] },
      { label: 'Communication', icon: Megaphone, path: '/manager/communication', roles: ['manager'] },
      { label: 'Schedule', icon: CalendarCheck, path: '/manager/schedule', roles: ['manager'] },
      { label: 'Reports', icon: BarChart3, path: '/manager/reports', roles: ['manager'] },
      { label: 'Settings', icon: Settings, path: '/manager/settings', roles: ['manager'] },
    ],
  },
  {
    section: 'Tenant Portal',
    items: [
      { label: 'Home', icon: Home, path: '/dashboard', roles: ['tenant'] },
      { label: 'Pay', icon: CreditCard, path: '/tenant/pay', roles: ['tenant'] },
      { label: 'Work order', icon: Wrench, path: '/tenant/work-order', roles: ['tenant'] },
      { label: 'Messages', icon: MessageSquare, path: '/tenant/messages', roles: ['tenant'] },
      { label: 'Settings', icon: Settings, path: '/tenant/settings', roles: ['tenant'] },
    ],
  },
];
