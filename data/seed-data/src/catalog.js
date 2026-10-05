/**
 * Static catalogue of realistic, fictional demo records. Dates are not stored
 * here; they are derived relative to an anchor date by the generator.
 */

export const SEED_VERSION = '2026.10.1';
export const DEFAULT_SEED = 20261005;

export const PROPERTIES = [
  {
    id: 'prop_001',
    code: 'MHR',
    name: 'Misty Hills Retreat',
    description: 'A restored planter bungalow surrounded by tea estates with sweeping valley views.',
    address: {
      line1: '14 Tea Garden Road, Chithirapuram',
      city: 'Munnar',
      state: 'Kerala',
      country: 'India',
      postalCode: '685565',
    },
    phone: '+91 98470 11001',
    email: 'misty-hills@homestay.demo',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    amenities: ['Wi-Fi', 'Breakfast', 'Bonfire', 'Parking', 'Garden'],
  },
  {
    id: 'prop_002',
    code: 'CBH',
    name: 'Coral Bay Homestay',
    description: 'A Portuguese-style villa five minutes from Candolim beach with a plunge pool.',
    address: {
      line1: '7 Fort Aguada Road, Candolim',
      city: 'North Goa',
      state: 'Goa',
      country: 'India',
      postalCode: '403515',
    },
    phone: '+91 98220 22002',
    email: 'coral-bay@homestay.demo',
    checkInTime: '13:00',
    checkOutTime: '11:00',
    amenities: ['Wi-Fi', 'Pool', 'Air Conditioning', 'Bicycle Rental', 'Breakfast'],
  },
  {
    id: 'prop_003',
    code: 'CVL',
    name: 'Cedar Valley Lodge',
    description: 'A timber lodge on the banks of the Beas river with mountain-facing balconies.',
    address: {
      line1: '22 Old Manali Road',
      city: 'Manali',
      state: 'Himachal Pradesh',
      country: 'India',
      postalCode: '175131',
    },
    phone: '+91 94180 33003',
    email: 'cedar-valley@homestay.demo',
    checkInTime: '14:00',
    checkOutTime: '10:30',
    amenities: ['Wi-Fi', 'Heating', 'Fireplace', 'Mountain View', 'Parking'],
  },
];

/** Room templates per property: [number, name, type, capacity, floor, rate in minor units, amenities] */
export const ROOM_TEMPLATES = {
  prop_001: [
    ['101', 'Tea Garden Room', 'double', 2, 1, 350000, ['Balcony', 'Garden View']],
    ['102', 'Valley View Deluxe', 'deluxe', 3, 1, 480000, ['Balcony', 'Valley View', 'Bathtub']],
    ['103', 'Planter Single', 'single', 1, 1, 220000, ['Work Desk']],
    ['201', 'Misty Suite', 'suite', 4, 2, 750000, ['Living Area', 'Valley View', 'Fireplace']],
    ['202', 'Family Loft', 'family', 5, 2, 620000, ['Bunk Beds', 'Garden View']],
  ],
  prop_002: [
    ['101', 'Seashell Room', 'double', 2, 1, 400000, ['Pool Access']],
    ['102', 'Lagoon Deluxe', 'deluxe', 3, 1, 520000, ['Pool Access', 'Bathtub']],
    ['103', 'Palm Cottage', 'cottage', 2, 0, 580000, ['Private Garden', 'Outdoor Shower']],
    ['201', 'Sunset Suite', 'suite', 4, 2, 890000, ['Sea View', 'Terrace', 'Jacuzzi']],
    ['202', 'Coral Family Room', 'family', 5, 2, 650000, ['Sea View', 'Sofa Bed']],
  ],
  prop_003: [
    ['101', 'Riverside Double', 'double', 2, 1, 320000, ['River View', 'Heater']],
    ['102', 'Pinewood Single', 'single', 1, 1, 200000, ['Heater', 'Work Desk']],
    ['103', 'Deodar Deluxe', 'deluxe', 3, 1, 450000, ['River View', 'Fireplace']],
    ['201', 'Summit Suite', 'suite', 4, 2, 820000, ['Mountain View', 'Fireplace', 'Balcony']],
    ['202', 'Himalayan Family Room', 'family', 6, 2, 600000, ['Mountain View', 'Heater']],
  ],
};

/** Rooms that carry an active, booking-blocking maintenance request in the seed. */
export const BLOCKED_ROOM_IDS = ['room_003', 'room_008'];

export const USERS = [
  { id: 'user_001', name: 'Aarav Mehta', email: 'owner@homestay.demo', role: 'owner', phone: '+91 98100 00001', jobTitle: 'Owner' },
  { id: 'user_002', name: 'Priya Nair', email: 'manager@homestay.demo', role: 'manager', phone: '+91 98100 00002', jobTitle: 'Operations Manager' },
  { id: 'user_003', name: 'Rohan Das', email: 'staff@homestay.demo', role: 'staff', phone: '+91 98100 00003', jobTitle: 'Front Desk Executive' },
  { id: 'user_004', name: 'Meera Iyer', email: 'meera.iyer@homestay.demo', role: 'staff', phone: '+91 98100 00004', jobTitle: 'Housekeeping Lead' },
  { id: 'user_005', name: 'Kabir Singh', email: 'kabir.singh@homestay.demo', role: 'staff', phone: '+91 98100 00005', jobTitle: 'Maintenance Technician' },
];

/** [firstName, lastName, nationality, phone, city, vip] */
export const GUESTS = [
  ['Ananya', 'Sharma', 'India', '+91 98450 12345', 'Bengaluru', true],
  ['Vikram', 'Reddy', 'India', '+91 99000 23456', 'Hyderabad', false],
  ['Sofia', 'Martinez', 'Spain', '+34 612 345 678', 'Madrid', false],
  ['Liam', "O'Connor", 'Ireland', '+353 85 123 4567', 'Dublin', false],
  ['Hana', 'Kobayashi', 'Japan', '+81 90 1234 5678', 'Osaka', true],
  ['Arjun', 'Kapoor', 'India', '+91 98110 34567', 'New Delhi', false],
  ['Emma', 'Schneider', 'Germany', '+49 151 2345 6789', 'Munich', false],
  ['Noah', 'Williams', 'United Kingdom', '+44 7700 900123', 'Manchester', false],
  ['Isha', 'Patel', 'India', '+91 98250 45678', 'Ahmedabad', true],
  ['Lucas', 'Dubois', 'France', '+33 6 12 34 56 78', 'Lyon', false],
  ['Zara', 'Khan', 'India', '+91 98200 56789', 'Mumbai', false],
  ['Mateo', 'Rossi', 'Italy', '+39 347 123 4567', 'Florence', false],
  ['Chloe', 'Bennett', 'Australia', '+61 412 345 678', 'Melbourne', false],
  ['Dev', 'Malhotra', 'India', '+91 98720 67890', 'Chandigarh', false],
  ['Amara', 'Okafor', 'Nigeria', '+234 803 123 4567', 'Lagos', false],
  ['Ethan', 'Clarke', 'United States', '+1 415 555 0142', 'San Francisco', true],
  ['Nisha', 'Menon', 'India', '+91 94470 78901', 'Kochi', false],
  ['Oliver', 'Jensen', 'Denmark', '+45 20 12 34 56', 'Copenhagen', false],
];

/** [roomId, title, category, priority, status, blocksRoom, daysAgo, assignedTo, description] */
export const MAINTENANCE_REQUESTS = [
  ['room_003', 'Leaking bathroom faucet', 'plumbing', 'high', 'in_progress', true, 2, 'user_005', 'Constant drip from the washbasin tap; water pooling under the vanity.'],
  ['room_008', 'Ceiling light short circuit', 'electrical', 'urgent', 'open', true, 0, null, 'Guests reported sparks from the main ceiling fixture. Power isolated.'],
  ['room_012', 'Wardrobe hinge broken', 'furniture', 'low', 'assigned', false, 3, 'user_005', 'Left door of the wardrobe does not close properly.'],
  ['room_005', 'Weak Wi-Fi signal on second floor', 'internet', 'medium', 'open', false, 1, null, 'Speed drops below 2 Mbps in the family loft.'],
  ['room_010', 'AC not cooling efficiently', 'hvac', 'high', 'in_progress', false, 1, 'user_005', 'Unit runs constantly but room stays warm. Possible gas refill needed.'],
  ['room_014', 'Balcony door lock jammed', 'furniture', 'medium', 'assigned', false, 2, 'user_005', 'Key turns but latch does not engage.'],
  ['room_002', 'Bathtub drain clogged', 'plumbing', 'medium', 'resolved', false, 9, 'user_005', 'Slow drain reported after checkout.'],
  ['room_011', 'Geyser thermostat replacement', 'appliance', 'high', 'resolved', false, 14, 'user_005', 'Water heater not reaching set temperature.'],
  ['room_007', 'Pool light flickering', 'electrical', 'low', 'resolved', false, 20, 'user_005', 'Underwater light near the deluxe room flickers at night.'],
];

export const DEFAULT_SETTINGS = {
  businessName: 'Homestay Collective',
  contactEmail: 'hello@homestay.demo',
  contactPhone: '+91 80 4000 1234',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  defaultCheckInTime: '14:00',
  defaultCheckOutTime: '11:00',
  autoCreateCheckoutTask: true,
  notifyOnNewReservation: true,
  notifyOnMaintenance: true,
  notifyOnPayment: true,
};
