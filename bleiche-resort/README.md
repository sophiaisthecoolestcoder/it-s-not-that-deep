# Bleiche Resort & Spa — Operations Platform

Hotel operations platform for BLEICHE Resort & Spa, combining guest offer management and daily occupancy tracking.

## Structure

```
bleiche-resort/
├── frontend/          # React + TypeScript + Vite application
│   ├── src/           # Source code
│   ├── public/        # Static assets (logos, fonts)
│   └── package.json   # Frontend dependencies
├── backend/           # Backend API (coming soon)
├── data/              # Reference data
└── README.md
```

## Frontend

### Tech Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- docx (Word document generation with embedded fonts)
- ExcelJS (Excel export)
- Local storage

### Modules

#### Angebote (Offers)
- Create and manage guest offers
- Live document preview
- Export to Word (.docx) with embedded Alegreya Sans font
- PDF export via print
- Room categories from BLEICHE website
- Auto-calculated pricing (adults + children by age)

#### Belegungsliste (Daily Occupancy)
- Daily guest list management
- Arrivals / Stayers tracking
- Operations sections (Frühschicht, Spätschicht, Küche, etc.)
- Excel export matching hotel's existing format
- Staff management

### Getting Started

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3001`.

## License

Proprietary - BLEICHE Resort & Spa
