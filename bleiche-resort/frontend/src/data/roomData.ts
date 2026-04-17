// ─── Room number → Category mapping ─────────────────────────────────────────
// This will be expanded with actual room data from the hotel.
// For now, a placeholder mapping is provided.

export interface RoomInfo {
  number: string;
  category: string;
  floor: string;
}

// Placeholder room data — to be replaced with actual hotel room list
const ROOMS: RoomInfo[] = [
  // Doppelzimmer
  ...['101','102','103','104','105','106','107','108','109','110'].map(n => ({ number: n, category: 'KDZ', floor: '1.OG' })),
  ...['111','112','113','114','115'].map(n => ({ number: n, category: 'GDZ', floor: '1.OG' })),
  ...['116','117','118'].map(n => ({ number: n, category: 'GDZ+S', floor: '1.OG' })),
  // 2.OG
  ...['201','202','203','204','205','206','207','208','209','210'].map(n => ({ number: n, category: 'KDZ', floor: '2.OG' })),
  ...['211','212','213','214','215'].map(n => ({ number: n, category: 'GDZ', floor: '2.OG' })),
  ...['216','217','218'].map(n => ({ number: n, category: 'GDZ+S', floor: '2.OG' })),
  // DG
  ...['301','302','303','304','305'].map(n => ({ number: n, category: 'KDZ', floor: 'DG' })),
  // Suiten
  ...['401','402','403','404','405','406'].map(n => ({ number: n, category: 'BS', floor: 'Suite' })),
  ...['407','408','409'].map(n => ({ number: n, category: 'BS+S', floor: 'Suite' })),
  ...['410','411','412','413'].map(n => ({ number: n, category: 'BS+S', floor: 'Suite' })),
  // SPA Suiten
  ...['501','502','503','504'].map(n => ({ number: n, category: 'SPA', floor: 'SPA' })),
  ...['505','506','507'].map(n => ({ number: n, category: 'GSPA', floor: 'SPA' })),
  // Besondere
  { number: '600', category: 'PS', floor: 'Bes.' },
  { number: '601', category: 'JS', floor: 'Bes.' },
  { number: '602', category: 'STB', floor: 'Bes.' },
];

export const ALL_ROOMS = ROOMS.sort((a, b) => parseInt(a.number) - parseInt(b.number));

/** Get category abbreviation for a room number */
export function getRoomCategory(roomNr: string): string {
  const room = ROOMS.find(r => r.number === roomNr);
  return room?.category ?? '';
}

/** Get all room numbers sorted */
export function getAllRoomNumbers(): string[] {
  return ALL_ROOMS.map(r => r.number);
}

// ─── Category abbreviation labels ───────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  'KDZ': 'Kleines DZ',
  'GDZ': 'Geräumiges DZ',
  'GDZ+S': 'Geräumiges DZ+Sauna',
  'BS': 'Bleiche Suite',
  'BS+S': 'Bleiche Suite+Sauna',
  'SPA': 'SPA-Suite',
  'GSPA': 'Große SPA-Suite',
  'PS': 'Präsidentinnensuite',
  'JS': 'Japanische Suite',
  'STB': 'Storchenburg',
};
