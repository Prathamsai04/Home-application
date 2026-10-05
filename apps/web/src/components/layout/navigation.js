import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Settings,
  Sparkles,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';

/** Role-aware navigation. Items are shown only when the role has `permission`. */
export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:view', end: true }],
  },
  {
    title: 'Front office',
    items: [
      { to: '/reservations', label: 'Reservations', icon: CalendarDays, permission: 'reservations:view' },
      { to: '/guests', label: 'Guests', icon: Users, permission: 'guests:view' },
      { to: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments:view' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/properties', label: 'Properties', icon: Building2, permission: 'properties:view' },
      { to: '/rooms', label: 'Rooms', icon: BedDouble, permission: 'rooms:view' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/housekeeping', label: 'Housekeeping', icon: Sparkles, permission: 'housekeeping:view' },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench, permission: 'maintenance:view' },
    ],
  },
  {
    title: 'Insights & admin',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports:view' },
      { to: '/notifications', label: 'Notifications', icon: Bell, permission: 'notifications:view' },
      { to: '/users', label: 'Users', icon: UserCog, permission: 'users:view' },
      { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings:view' },
    ],
  },
];
