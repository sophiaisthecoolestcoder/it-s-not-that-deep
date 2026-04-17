export type Salutation = 'Herr' | 'Frau' | 'Familie';

export interface ClientInfo {
  salutation: Salutation;
  firstName: string;
  lastName: string;
  street: string;
  zipCode: string;
  city: string;
  email: string;
}

export interface Offer {
  id: string;
  client: ClientInfo;
  date: string;            // ISO date string for the offer date
  arrivalDate: string;     // ISO date
  departureDate: string;   // ISO date
  roomCategory: string;
  customRoomCategory: string;  // for "Sonstiges" free-text entry
  adults: number;
  children: number;           // kept for backward compat
  childrenAges: number[];     // age of each child
  pricePerNight: string;      // stored as string for form input
  totalPrice: string;
  employeeName: string;
  notes: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export const STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  accepted: 'Angenommen',
  declined: 'Abgelehnt',
};

export const STATUS_COLORS: Record<OfferStatus, string> = {
  draft: 'bg-dark-100 text-dark-500',
  sent: 'bg-brand-100 text-brand-600',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
};
