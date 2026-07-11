// Shared types between client and server

export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  DRIVER = 'driver',
  MEMBER = 'member',
}

export enum BookingType {
  PICKUP = 'pickup',
  SENDOFF = 'sendoff',
  GENERAL = 'general',
  URGENT = 'urgent',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ASSIGNED = 'assigned',
  DRIVER_ACCEPTED = 'driver_accepted',
  DRIVER_EN_ROUTE = 'driver_en_route',
  ARRIVED_AT_PICKUP = 'arrived_at_pickup',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  VAN = 'van',
  LUXURY = 'luxury',
  ACCESSIBLE = 'accessible',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  LINE_PAY = 'line_pay',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  WAIVED = 'waived',
}

export enum DriverStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ON_TRIP = 'on_trip',
  UNAVAILABLE = 'unavailable',
}

export interface PriceQuoteRequest {
  vehicleType: VehicleType;
  origin: string;
  dest: string;
  isNight?: boolean;
  isHoliday?: boolean;
  extraStops?: number;
}

export interface PriceQuoteResponse {
  basePrice: number;
  nightSurcharge: number;
  holidaySurcharge: number;
  extraStopsFee: number;
  totalPrice: number;
  matchedRule: string;
}

export interface BookingRequest {
  bookingType: BookingType;
  pickupAddress: string;
  dropoffAddress: string;
  flightNumber?: string;
  flightDatetime?: string;
  scheduledPickupAt: string;
  passengerCount: number;
  luggageCount: number;
  vehicleType: VehicleType;
  isGuaranteed?: boolean;
  paymentMethod: PaymentMethod;
  specialRequests?: string;
  // For agent walk-in bookings
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}
