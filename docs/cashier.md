# Cashier / POS

Unified point-of-sale across reception, restaurant, and spa. Every cash sale becomes an `Invoice` with one or more `InvoiceItem` rows. On finalize the invoice is signed by a fiscalization provider (fiskaly KassenSichV in production, a deterministic mock in development) and the signed artifact lands in `cashier_receipts`.

## Why custom + fiskaly instead of packaged POS

- fiskaly handles the TSE signing only; we own the UI, data model, and reporting.
- Unified schema: sales share the DB with offers, guests, calendar, employees. One reconciliation.
- Cheaper subscription at small volume (~€40/month combined vs €250+ for 3 packaged terminals).
- Engineering maintenance falls on us — acceptable while we have in-house capacity.

## Data model

All tables live in `public` with the `cashier_` prefix.

### `cashier_products`

Catalogue of sellable items — auto-populates new invoice lines.

| column | notes |
|---|---|
| `sku` | unique; optional |
| `name` | |
| `category` | enum `productcategory` — `accommodation`, `food`, `beverage`, `spa`, `misc` |
| `venue` | enum `invoicevenue` — `reception`, `restaurant`, `spa`, `other` |
| `unit_price_cents` | integer; VAT-inclusive |
| `vat_rate_bp` | integer basis-points (e.g. 700 = 7.00%, 1900 = 19.00%) |
| `active` | soft-delete flag |

### `cashier_invoices`

One row per sale (open or finalized).

| column | notes |
|---|---|
| `number` | `YYYYMMDD-NNNN`, assigned on finalize, unique |
| `status` | enum `invoicestatus` — `open` → `finalized` → (optional) `voided` |
| `venue`, `reference` | arbitrary labels like "Room 207" or "Table 12" |
| `payment_method` | enum `paymentmethod` — `cash`, `card`, `bank_transfer`, `room_charge`, `other` |
| `cashier_user_id` | FK to `users` (SET NULL on delete) |
| `guest_id` | optional FK to `guests` (SET NULL on delete) |
| `subtotal_cents`, `vat_total_cents`, `total_cents` | denormalized for cheap reporting |
| `finalized_at` | stamped on finalize |

### `cashier_invoice_items`

Line items. Totals are always recomputed server-side from `quantity × unit_price_cents` and the VAT rate — never trusted from the client.

### `cashier_receipts`

The fiscalized artifact returned by the provider. 1:1 with invoices. Stores the QR code payload, signature counter, algorithm, TSS and transaction IDs, plus the full raw provider response for audit.

## Fiscalization providers

A small `FiscalizationProvider` protocol in `backend/app/services/fiscalization/base.py` abstracts signing. Two concrete implementations:

- **`FiskalyFiscalizationProvider`** — real KassenSichV integration. OAuth-style auth (`POST /api/v2/auth`), transaction lifecycle `ACTIVE → FINISHED` via `PUT /api/v2/tss/{tss}/tx/{tx}`, last-revision handling, and QR / signature extraction.
- **`MockFiscalizationProvider`** — deterministic SHA-based signer. Returns plausible-looking `qr_code_data` so the UI flows end-to-end without fiskaly creds. Never use in production — the signature is not a valid TSE signature.

The factory in `services/fiscalization/__init__.py` picks a provider at runtime based on `FISCAL_PROVIDER` and the presence of fiskaly env vars. Missing vars silently fall back to mock with a warning.

## Endpoints

Prefix `/api/cashier`. Access: `admin`, `manager`, `receptionist`, `waiter` for the catalog/invoice endpoints; `admin` / `manager` only for product mutations, invoice deletes, and reports.

- `GET    /products?venue=&active=` → `ProductRead[]`
- `POST   /products` → `ProductRead` (admin/manager)
- `PATCH  /products/{id}` → `ProductRead` (admin/manager)
- `DELETE /products/{id}` → 204 (admin/manager)
- `GET    /invoices?status=&venue=&from=&to=` → `InvoiceSummary[]`
- `GET    /invoices/{id}` → full `InvoiceRead` with items + receipt
- `POST   /invoices` → create OPEN invoice with items
- `PATCH  /invoices/{id}` → edit items / reference (only while OPEN)
- `POST   /invoices/{id}/finalize` → sign via provider, assign number, lock
- `DELETE /invoices/{id}` → hard-delete OPEN invoice (admin/manager)
- `GET    /summary?from=&to=` → totals by venue, payment method, VAT rate (admin/manager)

## Frontend

- `/cashier` — POS screen: venue picker, item catalog, custom-line entry, cart, totals, payment method, finalize.
- `/invoices` — sales history list with status + venue filters.
- `/invoices/:id` — detail view; shows the full line-items table, totals, and the fiscalized receipt block (QR data + TSS ID + signature + counter). Print button triggers browser print.

Sidebar gates both routes on `user.modules.includes('cashier')`.

## Configuration

`.env` variables (see `backend/.env.example` for placeholders):

```
FISKALY_API_KEY=
FISKALY_API_SECRET=
FISKALY_TSS_ID=
FISKALY_CLIENT_ID=
FISKALY_API_BASE_URL=https://kassensichv-middleware.fiskaly.com
FISCAL_PROVIDER=           # fiskaly | mock | blank=auto
```

Signup flow:

1. Register at https://dashboard.fiskaly.com/signup.
2. Activate the **KassenSichV (SIGN DE)** API.
3. Create API credentials → copy `api_key` + `api_secret`.
4. Create a TSS → initialize → activate → copy `tss_id`.
5. Create a client under that TSS → copy `client_id`.
6. Paste into `.env` and restart the backend.

With no creds the app uses the mock provider so the flow still demos end-to-end; the UI badge-warns "MOCK fiscalization active".

## Tax rates (Germany, 2026)

Germany uses two headline rates relevant here:

- **7% reduced** — hotel accommodation, some printed goods.
- **19% standard** — restaurant dine-in (after the 2024 reversion), spa services, beverages, most retail.

The `vat_rate_bp` column supports any rate; fiskaly's `VAT_RATE` enum names are mapped in `services/fiscalization/fiskaly.py::_VAT_RATE_BP_TO_FISKALY`. Custom rates need a matching entry there before they can be signed.

## Out of scope (v1)

- Refunds / voids (fiskaly supports both; wiring postponed to v2 with operator role gating).
- Split bills across payment methods.
- Tip allocation / pooling.
- Hardware ESC/POS receipt-printer integration — browser print only for now.
- Inventory / stock deduction on sale.
- Scheduled Z-reports via fiskaly's export API.
- Automatic invoice-from-offer hand-off (when a quote is accepted, auto-create a draft invoice).
