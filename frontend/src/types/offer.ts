export type Salutation = 'Herr' | 'Frau' | 'Familie';
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export interface Offer {
  id: number;
  salutation: Salutation;
  first_name: string;
  last_name: string;
  street: string;
  zip_code: string;
  city: string;
  email: string;

  offer_date: string | null;
  arrival_date: string | null;
  departure_date: string | null;

  room_category: string;
  custom_room_category: string;
  adults: number;
  children_ages: number[];
  price_per_night: string;
  total_price: string;

  employee_name: string;
  notes: string;
  status: OfferStatus;

  created_at: string;
  updated_at: string;
}

export type OfferInput = Omit<Offer, 'id' | 'created_at' | 'updated_at'>;

export const STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  accepted: 'Angenommen',
  declined: 'Abgelehnt',
};

export const STATUS_BG: Record<OfferStatus, string> = {
  draft: '#ececec',
  sent: '#f5ede3',
  accepted: '#dcf3e2',
  declined: '#fbe0e0',
};

export const STATUS_FG: Record<OfferStatus, string> = {
  draft: '#535353',
  sent: '#8B6A43',
  accepted: '#1e6b37',
  declined: '#922b2b',
};
