import { ActivityService } from './ActivityService.js';
import { AuthService } from './AuthService.js';
import { AvailabilityService } from './AvailabilityService.js';
import { DashboardService } from './DashboardService.js';
import { DemoService } from './DemoService.js';
import { GuestService } from './GuestService.js';
import { HousekeepingService } from './HousekeepingService.js';
import { LookupService } from './LookupService.js';
import { MaintenanceService } from './MaintenanceService.js';
import { NotificationService } from './NotificationService.js';
import { PaymentService } from './PaymentService.js';
import { PropertyService } from './PropertyService.js';
import { ReportService } from './ReportService.js';
import { ReservationService } from './ReservationService.js';
import { RoomService } from './RoomService.js';
import { SettingsService } from './SettingsService.js';
import { UserService } from './UserService.js';

/** Wires the service layer. Services receive repositories only - never storage. */
export function createServices({ storage, repositories, clock, config, seedGenerator }) {
  const activity = new ActivityService({ repositories, clock });
  const availability = new AvailabilityService({ repositories, clock });
  const deps = { repositories, clock, config, activity, availability };
  return {
    activity,
    availability,
    demo: new DemoService({ storage, repositories, clock, seedGenerator }),
    auth: new AuthService(deps),
    properties: new PropertyService(deps),
    rooms: new RoomService(deps),
    guests: new GuestService(deps),
    reservations: new ReservationService(deps),
    payments: new PaymentService(deps),
    housekeeping: new HousekeepingService(deps),
    maintenance: new MaintenanceService(deps),
    notifications: new NotificationService(deps),
    settings: new SettingsService(deps),
    users: new UserService(deps),
    lookups: new LookupService(deps),
    dashboard: new DashboardService(deps),
    reports: new ReportService(deps),
  };
}
