# Component Reference - Bleiche Resort & Spa

## Page Components

### Home (`src/components/Home.tsx`)

Dashboard landing page with two navigation cards:
- **Angebote** card - links to `/angebote`, FileText icon
- **Belegungsliste** card - links to `/belegung`, ClipboardList icon

Responsive 2-column grid. Hover animations with brand color highlights.

---

### OfferEditor (`src/components/OfferEditor.tsx`)

Full-featured offer creation and editing form with live document preview.

**Layout:** Split-view with draggable divider (form left, preview right)

**Form Sections:**
1. **Kundendaten** - Salutation (Herr/Frau/Familie), first name, last name, street, zip, city, email
2. **Aufenthalt** - Arrival date, departure date, room category dropdown, adults count, children count, children age inputs (dynamic)
3. **Preisgestaltung** - Price per night (manual input), total price (auto-calculated or manual override)
4. **Angebotsdaten** - Offer date, employee name

**Price Calculation Logic:**
```
nightlyTotal = (adults x pricePerNight) + sum(childCosts)
totalPrice = nightlyTotal x numberOfNights

Child cost: age <= 3 = 0 EUR, age 4-15 = 80 EUR/night
```

**Live Preview:** Professional letter format with logo, client address, greeting, stay details, room amenities, Genusspauschale section, total price, terms, closing.

**Actions:** Save (to store), Export DOCX, Print

**Route params:** `/angebote/neu` (new) or `/angebote/:id` (edit existing)

---

### OffersList (`src/components/OffersList.tsx`)

Table view of all saved offers.

**Columns:** Offer number, Customer name, Room category, Arrival date, Price, Status

**Features:**
- Search by customer name
- Status badge with color coding (draft=gray, sent=brand, accepted=green, declined=red)
- Status dropdown to change status inline
- Actions: Edit, Duplicate, Delete (with confirmation)
- Offer number format: `ANG-DDMMYYYY-XXXX`

---

### BelegungEditor (`src/components/belegung/BelegungEditor.tsx`)

The largest and most complex component (~550 lines). Daily occupancy management.

**Sections (top to bottom):**

1. **Header Bar** - Stand date/time, TK info, HSK info, Chef der Nacht
2. **Day Title** - "Tagesinformation fur [Weekday], [Full Date]"
3. **Statistics Row** - Arrivals, departures, stayers, overnight (rooms + persons), early arrivals, late departures, late arrivals
4. **Weekly Occupancy** - 7-day guest count (Mo-So)
5. **Arrivals Table** - Guest check-ins (16-column table)
6. **Stayers Table** - Continuing guests (same format)
7. **Fruhschicht** (Morning Shift) - FS extern + ops entries
8. **Spatschicht** (Evening Shift) - AE extern + ops entries
9. **Kuche** (Kitchen) - FS/AE extern + dietary subheadings + ops entries
10. **Tischwunsche** (Table Wishes) - AE extern + ops entries
11. **Englische Menukarten** - Free text field
12. **Geburtstag/Anlasse** (Birthdays/Occasions) - ops entries
13. **Housekeeping** - ops entries
14. **Empfang/Chauffeure** (Reception/Drivers) - LT extern + ops entries
15. **E-Auto** - Free text field
16. **Landtherme** (Spa) - LT extern + ops entries
17. **Zeitungen** (Newspapers) - Room, newspaper name, date range, remarks
18. **Neue Gaste** (New Guests) - Like arrivals with table number
19. **Freie Zimmer** (Free/Out-of-Order Rooms) - Room, category, reason

**Guest Table Columns (16):** #, Kat, Name, E, K, Gruppe, Arr, Anr, Abr, Preis, HP, Booking, FS/AE, Ort/KFZ, Notizen, Delete

**Internal Subcomponents:**
- `SectionHeader` - Grey section divider bar
- `StatusBadge` - Color-coded guest status (Anr=green, Abr=red, Bl=blue)
- `GuestTable` - Reusable guest data table
- `OpsSection` - Reusable operations entry section
- `NewGuestTable` - New guests variant table

**Toolbar:** Date picker, Save, Excel export, Print

---

### DaysList (`src/components/belegung/DaysList.tsx`)

Manage all saved daily occupancy records.

**Features:**
- Date picker to create new day
- Table: Date, Weekday, Arrivals count, Stayers count, Actions
- Sorted newest-first
- Open/Delete actions per day
- Total days counter

---

### StaffManager (`src/components/belegung/StaffManager.tsx`)

Manage employee names used in dropdown selectors throughout the app.

**Features:**
- Add staff member by name (Enter key or button)
- Duplicate detection (case-insensitive)
- Alphabetical sorting (German locale)
- Remove individual staff members
- Toast notifications for actions

---

## Layout Components

### Layout (`src/components/Layout.tsx`)

Main page wrapper. Renders sidebar, main content area (React Router `<Outlet>`), and toast container. Background color: #faf6f1.

### Sidebar (`src/components/Sidebar.tsx`)

Dark-themed navigation sidebar.

**Width:** 280px expanded, 72px collapsed

**Sections:**
- Logo area (Bleiche Resort branding)
- Startseite (Home) link
- Angebote section: Neues Angebot, Alle Angebote
- Belegungsliste section: Tagesansicht, Alle Tage, Mitarbeiter
- Collapse toggle button
- Version number (expanded only)

**Icons:** Home, FilePlus, FileText, ClipboardList, Calendar, Users (lucide-react)

### Toast (`src/components/ui/Toast.tsx`)

Fixed bottom-right notification system.

**Types:** success (green), error (red), warning (yellow), info (blue)

**Behavior:** Auto-dismiss after 4 seconds, manual dismiss button

---

## Data Files

### roomCategories.ts (`src/data/roomCategories.ts`)

Defines 14 room categories with amenities.

**Exports:**
- `ROOM_CATEGORIES` - Full array of `{ name, group, size, amenities }`
- `ROOM_GROUPS` - Unique group names
- `getAmenitiesForRoom(name)` - Lookup amenities by category name

**Groups:** Doppelzimmer, Bleiche Suiten, SPA Suiten, Besondere Suiten, Sonstiges

### roomData.ts (`src/data/roomData.ts`)

Maps all 53 physical rooms to their categories.

**Exports:**
- `getRoomCategory(roomNr)` - Room number to category abbreviation
- `getAllRoomNumbers()` - Sorted array of all room numbers
- `CATEGORY_LABELS` - Display names for abbreviations (KDZ, GDZ, etc.)

---

## Store Files

### offerStore.ts (`src/store/offerStore.ts`)

Zustand store for offers module. Manages offers array, toast notifications, and sidebar state. All mutations auto-persist to localStorage.

### belegungStore.ts (`src/store/belegungStore.ts`)

Zustand store for occupancy module. Manages current day data, all saved days list, staff list, toasts, and sidebar state. Guest rows auto-sort by room number. Room category auto-fills on room number change.

---

## Utility Files

### helpers.ts (`src/utils/helpers.ts`)

| Function | Purpose | Example Output |
|----------|---------|----------------|
| `generateId()` | UUID generation | `"a1b2c3d4-..."` |
| `formatDateGerman(iso)` | Long German date | `"15. Oktober 2025"` |
| `formatDateShort(iso)` | Short date | `"15.10.2025"` |
| `formatWeekday(iso)` | Weekday name | `"Montag"` |
| `formatFullDate(iso)` | Full with weekday | `"Montag, 15. Oktober 2025"` |
| `todayISO()` | Today's date | `"2025-10-15"` |
| `formatEuro(val)` | Euro formatting | `"1.234,50 EUR"` |
| `getGreeting(sal, name)` | Formal greeting | `"Sehr geehrter Herr Schmidt"` |
| `getOfferNumber(id, date)` | Offer ID | `"ANG-15102025-A1B2"` |

### storage.ts (`src/utils/storage.ts`)

localStorage wrapper for offers. Functions: `loadOffers()`, `saveOffers()`. Key: `bleiche_offers`.

### belegungStorage.ts (`src/utils/belegungStorage.ts`)

localStorage wrapper for occupancy data. Functions: `loadDailyData()`, `saveDailyData()`, `loadAllDays()`, `loadStaff()`, `saveStaff()`, `deleteDailyData()`.

### docxExport.ts (`src/utils/docxExport.ts`)

Generates professional Word documents for guest offers. Embeds Alegreya Sans fonts via OOXML obfuscation. Produces A4 letter with logo, address, details, amenities, pricing, terms, and signature block. Export: `generateDocx(offer)`.

### excelExport.ts (`src/utils/excelExport.ts`)

Generates Excel spreadsheets for daily occupancy matching hotel's existing format. Landscape, Tahoma 8pt, 16 columns, all sections from header to free rooms. Export: `exportBelegung(data)`.

---

## Type Definitions

### types/index.ts

- `Salutation` - `'Herr' | 'Frau' | 'Familie'`
- `ClientInfo` - Customer contact details
- `Offer` - Full offer data object
- `OfferStatus` - `'draft' | 'sent' | 'accepted' | 'declined'`
- `STATUS_LABELS` - German status translations
- `STATUS_COLORS` - Tailwind color classes per status

### types/belegung.ts

- `GuestStatus` - `'Anr' | 'Abr' | 'Bl'`
- `GuestRow` - 16 fields for guest table entry
- `OpsEntry` - Room, name, status, info for operations sections
- `NewspaperRow` - Room, newspaper, date range, remarks
- `NewGuestRow` - Like GuestRow with tableNr instead of hp
- `FreeRoomRow` - Room, category, out-of-order reason
- `WeeklyOccupancy` - 7 day fields (mo-so)
- `StaffMember` - id + name
- `HeaderData` - Stand date/time, TK, HSK, Chef der Nacht
- `DailyStats` - All occupancy statistics fields
- `DailyData` - Complete daily record (all sections combined)
