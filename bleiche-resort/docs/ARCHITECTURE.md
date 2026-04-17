# Architecture - Bleiche Resort & Spa Operations Platform

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  React   │  │   Zustand    │  │  localStorage │  │
│  │  Router  │──│   Stores     │──│  Persistence  │  │
│  │  (v6)    │  │  (2 stores)  │  │               │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
│       │              │                    │          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Pages   │  │   Export     │  │    Data       │  │
│  │  & UI    │  │   Utils      │  │    (Rooms)    │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
│                                                     │
│  Future: ──── REST API ──── Backend ──── PostgreSQL │
└─────────────────────────────────────────────────────┘
```

## Module Architecture

### 1. Angebote (Offers) Module

```
OfferEditor.tsx ──────── offerStore.ts ──────── storage.ts ──────── localStorage
       │                      │
       ├── roomCategories.ts  │
       ├── helpers.ts         │
       └── docxExport.ts      │
                              │
OffersList.tsx ───────────────┘
```

**Data Flow:**
1. User fills offer form in `OfferEditor`
2. Store action `addOffer()` / `updateOffer()` saves to Zustand state
3. State change triggers `saveOffers()` to localStorage
4. `OffersList` reads from store to display all offers
5. Export: `generateDocx()` reads offer data and produces .docx file

### 2. Belegungsliste (Occupancy) Module

```
BelegungEditor.tsx ──── belegungStore.ts ──── belegungStorage.ts ──── localStorage
       │                      │
       ├── roomData.ts        │
       ├── helpers.ts         │
       └── excelExport.ts     │
                              │
DaysList.tsx ─────────────────┤
StaffManager.tsx ─────────────┘
```

**Data Flow:**
1. User selects/creates a date in `BelegungEditor` or `DaysList`
2. Store loads day data from localStorage (or creates empty template)
3. User edits guests, ops sections, stats, etc.
4. `saveDay()` persists full `DailyData` object to localStorage
5. Export: `exportBelegung()` reads day data and produces formatted .xlsx

## State Management (Zustand)

### offerStore

```typescript
State: {
  offers: Offer[]            // All saved offers
  toasts: Toast[]            // Notification queue
  sidebarCollapsed: boolean  // UI state
}

Actions: addOffer, updateOffer, deleteOffer, duplicateOffer,
         setOfferStatus, loadFromStorage, addToast, removeToast, toggleSidebar
```

### belegungStore

```typescript
State: {
  currentDate: string        // Selected date (ISO)
  data: DailyData            // Current day's full data
  allDays: string[]          // All saved date strings
  staff: StaffMember[]       // Employee list
  toasts: Toast[]            // Notification queue
  sidebarCollapsed: boolean  // UI state
}

Actions: loadDay, saveDay, deleteDay, setCurrentDate, updateData,
         addArrival, removeArrival, updateArrival,
         addStayer, removeStayer, updateStayer,
         addOpsEntry, updateOpsEntry, removeOpsEntry,
         addStaffMember, removeStaffMember, loadStaffFromStorage,
         addToast, removeToast, toggleSidebar
```

## Component Hierarchy

```
App.tsx
└── Layout.tsx
    ├── Sidebar.tsx
    ├── Toast.tsx
    └── <Outlet> (React Router)
        ├── Home.tsx
        ├── OfferEditor.tsx
        ├── OffersList.tsx
        ├── BelegungEditor.tsx
        ├── DaysList.tsx
        └── StaffManager.tsx
```

## Data Models

### Offer

```
Offer
├── id: string (UUID)
├── client: ClientInfo
│   ├── salutation: 'Herr' | 'Frau' | 'Familie'
│   ├── firstName, lastName
│   ├── street, zipCode, city
│   └── email
├── arrivalDate, departureDate (ISO)
├── roomCategory, customRoomCategory
├── adults, children, childrenAges[]
├── pricePerNight, totalPrice
├── employeeName, notes
├── status: 'draft' | 'sent' | 'accepted' | 'declined'
└── createdAt, updatedAt
```

### DailyData (Belegung)

```
DailyData
├── id, date (ISO)
├── header: HeaderData
│   ├── standDate, standTime
│   ├── tkName, tkTimeRange
│   ├── hskName, hskTimeRange
│   └── chefDerNacht, chefTimeRange
├── stats: DailyStats
│   ├── anrZi, anrPer (arrivals rooms/persons)
│   ├── abrZi, abrPer (departures rooms/persons)
│   ├── bleiberZi, bleiberPer (stayers rooms/persons)
│   ├── uenZi, uenPer (overnight rooms/persons)
│   └── fruehAnreisen, spaetAbreisen, spaetAnreisen
├── weeklyOccupancy: { mo, di, mi, do_, fr, sa, so }
├── arrivals: GuestRow[]
├── stayers: GuestRow[]
├── [11 ops sections]: OpsEntry[]
│   ├── fruehschicht, spaetschicht
│   ├── kueche, tischwuensche
│   ├── englischeMenukarten (free text)
│   ├── geburtstag, housekeeping
│   ├── empfangChauffeure
│   ├── eAuto (free text)
│   └── landtherme
├── newspapers: NewspaperRow[]
├── newGuests: NewGuestRow[]
├── freeRooms: FreeRoomRow[]
└── createdAt, updatedAt
```

## Room System

**53 rooms total** across 10 categories:

| Category | Abbreviation | Size | Room Numbers |
|----------|-------------|------|--------------|
| Kleines Doppelzimmer | KDZ | ~27 m2 | Various 1xx-2xx |
| Geraumiges Doppelzimmer | GDZ | ~35 m2 | Various 1xx-2xx |
| Geraumiges DZ + Sauna | GDZ+S | ~35 m2 | Various 1xx-2xx |
| Bleiche Suite | BS | ~80 m2 | 4xx range |
| Bleiche Suite + Sauna | BS+S | ~80 m2 | 4xx range |
| SPA-Suite | SPA | ~115 m2 | 5xx range |
| Grosse SPA-Suite | GSPA | ~180 m2 | 5xx range |
| Prasidentinnensuite | PS | ~360 m2 | 600 |
| Japanische Suite | JS | ~240 m2 | 601 |
| Storchenburg | STB | ~240 m2 | 602 |

## Export System

### Word Export (Offers)

- Uses `docx` library to generate professional letter
- Embeds Alegreya Sans font files (Regular + Bold) via OOXML obfuscation
- Includes: logo, client address, greeting, room details, amenities, pricing, terms
- A4 page, 20mm margins, page numbers in footer
- Filename: `Angebot_[LastName]_[Date].docx`

### Excel Export (Occupancy)

- Uses `ExcelJS` to generate formatted spreadsheet
- Matches hotel's existing spreadsheet format exactly
- Landscape orientation, Tahoma 8pt font
- All sections: header, stats, weekly occupancy, guest tables, 11 ops sections, newspapers, new guests, free rooms
- Filename: `Belegungsliste_[Date].xlsx`

## Styling System

- **Tailwind CSS** with custom brand palette (warm earth tones)
- **Brand colors:** #faf6f1 (lightest) to #251c11 (darkest)
- **Dark palette:** For sidebar and dark UI elements
- **Custom CSS classes** in index.css: `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.badge`, `.table-header`, `.table-cell`
- **Print styles:** `.print-area` class for PDF-via-print layout
- **Responsive:** Sidebar collapses, grid layouts adapt

## Future Plans

- **Backend:** Node.js (Express/Fastify) + PostgreSQL
- **Authentication:** User accounts and roles
- **Cloud sync:** Replace localStorage with API persistence
- **PMS integration:** Connect to Property Management System
