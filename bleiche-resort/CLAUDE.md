# CLAUDE.md - Bleiche Resort & Spa Operations Platform

## Project Overview

Hotel operations platform for **Bleiche Resort & Spa** (Spreewald, Germany). Two core modules:

1. **Angebote** (Guest Offers) - Create, manage, and export guest stay proposals
2. **Belegungsliste** (Daily Occupancy) - Daily guest lists, operations briefings, staff management

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite (port 3001), Tailwind CSS
- **State:** Zustand (2 stores: `offerStore`, `belegungStore`)
- **Persistence:** Browser localStorage (backend planned but not yet built)
- **Export:** `docx` library for Word, `ExcelJS` for Excel, print-to-PDF
- **Routing:** React Router v6
- **Icons:** lucide-react
- **Dates:** date-fns with German locale
- **Fonts:** Alegreya Sans (documents), Noto Serif/Sans (UI), JetBrains Mono (code)

## Project Structure

```
bleiche-resort/
├── CLAUDE.md                    # This file
├── README.md                    # Project readme
├── backend/                     # Placeholder - not yet implemented
│   └── README.md
├── frontend/
│   ├── package.json
│   ├── vite.config.ts           # Dev server on port 3001, auto-open
│   ├── tailwind.config.js       # Brand colors, custom fonts
│   ├── tsconfig.json            # ES2020 target, strict mode
│   ├── index.html               # Google Fonts imports, German lang
│   ├── public/
│   │   ├── fonts/               # Alegreya Sans TTF (embedded in DOCX)
│   │   └── *.png                # Bleiche logos
│   └── src/
│       ├── main.tsx             # React entry point
│       ├── App.tsx              # Routes + store initialization
│       ├── index.css            # Tailwind + custom utility classes
│       ├── components/
│       │   ├── Home.tsx         # Dashboard with 2 module cards
│       │   ├── Layout.tsx       # Sidebar + content wrapper + toasts
│       │   ├── Sidebar.tsx      # Dark nav sidebar, collapsible (280/72px)
│       │   ├── OfferEditor.tsx  # Split-view offer form + live preview
│       │   ├── OffersList.tsx   # Offers table with search, status, actions
│       │   ├── ui/Toast.tsx     # Toast notification system
│       │   └── belegung/
│       │       ├── BelegungEditor.tsx  # Main daily occupancy editor (~550 lines)
│       │       ├── DaysList.tsx        # All saved days management
│       │       └── StaffManager.tsx    # Employee name management
│       ├── data/
│       │   ├── roomCategories.ts  # 14 room types + amenities per type
│       │   └── roomData.ts        # 53 rooms mapped to categories
│       ├── store/
│       │   ├── offerStore.ts      # Zustand: offers CRUD, toasts, sidebar
│       │   └── belegungStore.ts   # Zustand: daily data, guests, ops, staff
│       ├── types/
│       │   ├── index.ts           # Offer, ClientInfo, OfferStatus types
│       │   └── belegung.ts        # DailyData, GuestRow, OpsEntry, etc.
│       └── utils/
│           ├── helpers.ts         # Date formatting, ID gen, currency, greetings
│           ├── storage.ts         # localStorage for offers
│           ├── belegungStorage.ts # localStorage for occupancy + staff
│           ├── docxExport.ts      # Word export with font embedding
│           └── excelExport.ts     # Excel export matching hotel format
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Home | Dashboard |
| `/angebote` | OffersList | All offers list |
| `/angebote/neu` | OfferEditor | New offer |
| `/angebote/:id` | OfferEditor | Edit offer |
| `/belegung` | BelegungEditor | Daily occupancy editor |
| `/belegung/tage` | DaysList | All saved days |
| `/belegung/mitarbeiter` | StaffManager | Staff management |

## Key Conventions

- **Language:** All UI text is in German (the app is for a German hotel)
- **Date format:** German locale - "15. Oktober 2025", "15.10.2025"
- **Currency:** Euro with German formatting - "1.234,50 EUR"
- **Offer numbers:** Format `ANG-DDMMYYYY-XXXX`
- **Room numbers:** 101-118 (1F), 201-218 (2F), 301-305 (DG), 401-413 (Suites), 501-507 (SPA), 600-602 (Special)
- **Room abbreviations:** KDZ, GDZ, GDZ+S, BS, BS+S, SPA, GSPA, PS, JS, STB

## Storage Keys (localStorage)

- `bleiche_offers` - Offer array
- `bleiche_belegung_daily` - Daily data keyed by ISO date
- `bleiche_belegung_staff` - Staff member array
- `bleiche_belegung_days` - List of saved date strings

## Development

```bash
cd frontend
npm install
npm run dev      # http://localhost:3001
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Important Notes

- No backend exists yet - all data lives in localStorage
- The DOCX export embeds Alegreya Sans fonts using OOXML obfuscation
- The Excel export must match the hotel's existing spreadsheet format exactly
- Brand colors defined in tailwind.config.js (brand-50 #faf6f1 to brand-950 #251c11)
- Print styles in index.css handle `.print-area` for PDF export
- Child pricing: 0 EUR for age <= 3, 80 EUR/night for age 4-15
- License: Proprietary - BLEICHE Resort & Spa
