export type InvoiceStatus = 'open' | 'finalized' | 'voided';
export type InvoiceVenue = 'reception' | 'restaurant' | 'spa' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'room_charge' | 'other';
export type ProductCategory = 'accommodation' | 'food' | 'beverage' | 'spa' | 'misc';

export interface Product {
  id: number;
  sku: string | null;
  name: string;
  category: ProductCategory;
  venue: InvoiceVenue;
  unit_price_cents: number;
  vat_rate_bp: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  sku?: string | null;
  name: string;
  category: ProductCategory;
  venue: InvoiceVenue;
  unit_price_cents: number;
  vat_rate_bp: number;
  active?: boolean;
}

export interface InvoiceItemInput {
  product_id?: number | null;
  description: string;
  quantity: number | string;
  unit_price_cents: number;
  vat_rate_bp: number;
}

export interface InvoiceItem {
  id: number;
  product_id: number | null;
  description: string;
  quantity: string;
  unit_price_cents: number;
  vat_rate_bp: number;
  line_total_cents: number;
  line_vat_cents: number;
}

export interface Receipt {
  id: number;
  provider: string;
  provider_tss_id: string | null;
  provider_client_id: string | null;
  provider_transaction_id: string | null;
  transaction_number: number | null;
  signature_counter: number | null;
  qr_code_data: string | null;
  signature_value: string | null;
  signature_algorithm: string | null;
  time_start: string | null;
  time_end: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  number: string | null;
  status: InvoiceStatus;
  venue: InvoiceVenue;
  reference: string | null;
  payment_method: PaymentMethod | null;
  cashier_user_id: number | null;
  guest_id: number | null;
  notes: string | null;
  subtotal_cents: number;
  vat_total_cents: number;
  total_cents: number;
  currency: string;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
  receipt: Receipt | null;
}

export interface InvoiceSummary {
  id: number;
  number: string | null;
  status: InvoiceStatus;
  venue: InvoiceVenue;
  reference: string | null;
  payment_method: PaymentMethod | null;
  total_cents: number;
  currency: string;
  finalized_at: string | null;
  created_at: string;
}

export interface InvoiceCreateInput {
  venue: InvoiceVenue;
  reference?: string | null;
  guest_id?: number | null;
  notes?: string | null;
  items: InvoiceItemInput[];
}

export interface InvoiceUpdateInput {
  venue?: InvoiceVenue;
  reference?: string | null;
  guest_id?: number | null;
  notes?: string | null;
  items?: InvoiceItemInput[];
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  venue?: InvoiceVenue;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
}

export interface SalesTotals {
  from_date: string;
  to_date: string;
  invoice_count: number;
  subtotal_cents: number;
  vat_total_cents: number;
  total_cents: number;
  by_venue: Record<string, number>;
  by_payment_method: Record<string, number>;
  by_vat_rate: Array<{
    vat_rate_bp: number;
    net_cents: number;
    vat_cents: number;
    gross_cents: number;
  }>;
}
