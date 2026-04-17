# Offers

## Overview

Offers are one of the main business objects in the system.

They can be created and edited either through the manual offer editor or through the assistant conversation flow.

## Main Files

Backend:

- `backend/app/models/offer.py`
- `backend/app/schemas/offer.py`
- `backend/app/routers/offers.py`

Frontend:

- `frontend/src/screens/offers/OffersListScreen.tsx`
- `frontend/src/screens/offers/OfferEditorScreen.tsx`
- `frontend/src/api/client.ts`
- `frontend/src/types/offer.ts`

## Offer Shape

The current offer model stores:

- salutation,
- client name and contact details,
- optional street / ZIP / city,
- offer date,
- arrival and departure dates,
- room category and custom room category,
- adults,
- children ages,
- price per night,
- total price,
- employee name,
- notes,
- and status.

## Status Values

Allowed values:

- `draft`
- `sent`
- `accepted`
- `declined`

The UI translates these into German labels and color cues.

## Salutation Values

Allowed values:

- `Herr`
- `Frau`
- `Familie`

The database enum stores the exact title-cased values.

## Offer Lifecycle

### 1. Manual Creation

The user opens the offer editor, fills the customer and stay fields, then saves the record.

### 2. List Management

The offer list screen can:

- search by customer,
- duplicate offers,
- delete offers,
- and change status inline.

### 3. Export

The backend exposes an HTML export endpoint.

The frontend uses that export to download a browser-safe file.

### 4. Assistant Creation

The assistant can create offers through the `create_offer` tool.

This is useful when staff want to work conversationally instead of filling the form manually.

## Export Contract

The HTML export endpoint is:

- `GET /api/offers/{offer_id}/export/html?lang=de|en`

This is used by both:

- the offer editor export button,
- and the assistant offer reference card download action.

## Duplicate Behavior

Duplicating an offer copies all business fields except:

- `id`
- `created_at`
- `updated_at`

The new copy resets the status to `draft`.

## Design Notes

The offer editor and offer list are intentionally structured around direct hotel operations:

- simple labels,
- predictable forms,
- printable output,
- and enough room for later expansion if the business process changes.

## Documentation Rule

If a field is added to the offer model or schema, update all of the following together:

- the backend model,
- the backend schema,
- the frontend TypeScript type,
- the offer editor screen,
- the assistant create-offer tool schema if needed,
- and this document.
