// Room registry + category metadata — duplicated here for offline-friendly
// category lookups, matching the legacy React app 1:1.

export interface RoomCategory {
  id: string;
  name: string;
  group: string;
  size: string;
}

export const ROOM_CATEGORIES: RoomCategory[] = [
  { id: 'kleines-dz', name: 'Kleines Doppelzimmer', group: 'Doppelzimmer', size: '~27 m²' },
  { id: 'geraeumiges-dz', name: 'Geräumiges Doppelzimmer', group: 'Doppelzimmer', size: '~35 m²' },
  { id: 'geraeumiges-dz-sauna', name: 'Geräumiges Doppelzimmer mit Sauna', group: 'Doppelzimmer', size: '~35 m²' },

  { id: 'bleiche-suite', name: 'Bleiche Suite (ohne Sauna)', group: 'Bleiche Suiten', size: '~80 m²' },
  { id: 'bleiche-suite-sauna', name: 'Bleiche Suite (mit Sauna)', group: 'Bleiche Suiten', size: '~80 m²' },

  { id: 'spa-suite', name: 'SPA-Suite', group: 'SPA Suiten', size: '~115 m²' },
  { id: 'grosse-spa-suite', name: 'Große SPA-Suite', group: 'SPA Suiten', size: '~180 m²' },

  { id: 'besondere-suite', name: 'Eine unserer besonderen Suiten', group: 'Besondere Suiten', size: '~240 m²' },
  { id: 'praesidentinnensuite', name: 'Präsidentinnensuite', group: 'Besondere Suiten', size: '~360 m²' },
  { id: 'japanische-suite', name: 'Japanische Suite', group: 'Besondere Suiten', size: '~240 m²' },
  { id: 'storchenburg', name: 'Storchenburg', group: 'Besondere Suiten', size: '~240 m²' },

  { id: 'custom', name: 'Sonstiges', group: 'Sonstiges', size: '' },
];

export const ROOM_GROUPS = Array.from(new Set(ROOM_CATEGORIES.map((r) => r.group)));

const AMENITIES_DOPPELZIMMER = [
  'Ab 27 m² bis 75 m² Raum mit Dusche und/oder Badewanne und WC',
  'Ihr persönlicher Bademantel für den Aufenthalt',
  'Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen',
  'Mineralwasser am Tag der Anreise in Ihrem Zimmer',
  'Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung',
  'Nutzung der vielfältigen Außensportanlagen',
  'Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl',
  'Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm',
  'Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen',
  'Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung',
  'Eintritt zu unseren regelmäßigen Lesungen während des Aufenthaltes der Spreewald-Literatur-Stipendiaten',
];

const AMENITIES_BLEICHE_SUITEN = [
  'Ca. 80 m² Raum mit geräumiger Dusche und Badewanne, WC',
  'HD-LED-TV',
  'Mit oder ohne privater finnischer Sauna oder Infrarotkabine',
  'Ihr persönlicher Bademantel für den Aufenthalt',
  'Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen',
  'Mineralwasser am Tag der Anreise in Ihrem Zimmer',
  'Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung',
  'Nutzung der vielfältigen Außensportanlagen',
  'Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl',
  'Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm',
  'Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen',
  'Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung',
  'Eintritt zu unseren regelmäßigen Lesungen während des Aufenthaltes der Spreewald-Literatur-Stipendiaten',
];

const AMENITIES_SPA_SUITEN = [
  'Ca. 115 m² bis 180 m² Raum',
  'HD-LED-TV im Wohnraum, in den Schlafbereichen und teilweise im Bad',
  'Privates SPA mit finnischer Sauna und Hamam sowie geräumiger Dusche und großer Badewanne, separates WC',
  'Ihr persönlicher Bademantel für den Aufenthalt',
  'Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen',
  'Mineralwasser am Tag der Anreise in Ihrem Zimmer',
  'Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung',
  'Nutzung der vielfältigen Außensportanlagen',
  'Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl',
  'Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm',
  'Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen',
  'Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung',
];

const AMENITIES_BESONDERE_SUITEN = [
  'Ca. 240 m² Raum mit einem Wohnzimmer, 2 bzw. 3 separaten Schlafbereichen, zugehörigen Bädern mit geräumiger Dusche oder großer Badewanne, WC',
  'HD-LED-TV im Wohnraum und teilweise in den Schlafbereichen',
  'Mit oder ohne privater finnischer Sauna und Hamam',
  'Ihr persönlicher Bademantel für den Aufenthalt',
  'Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen',
  'Minibar',
  'Hochwertige Spirituosenauswahl',
  'Verlängerte Nutzung der Landtherme am An- und Abreisetag',
  'Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung',
  'Nutzung der vielfältigen Außensportanlagen',
  'Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl',
  'Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm',
  'Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen',
  'Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung',
];

const AMENITIES_BY_GROUP: Record<string, string[]> = {
  'Doppelzimmer': AMENITIES_DOPPELZIMMER,
  'Bleiche Suiten': AMENITIES_BLEICHE_SUITEN,
  'SPA Suiten': AMENITIES_SPA_SUITEN,
  'Besondere Suiten': AMENITIES_BESONDERE_SUITEN,
  'Sonstiges': AMENITIES_DOPPELZIMMER,
};

export function getAmenitiesForRoom(name: string): string[] {
  const cat = ROOM_CATEGORIES.find((r) => r.name === name);
  if (cat && AMENITIES_BY_GROUP[cat.group]) return AMENITIES_BY_GROUP[cat.group];
  return AMENITIES_DOPPELZIMMER;
}

// Room number → category mapping (seeded in DB, mirrored here for offline UI use).
interface RoomInfo { number: string; category: string; floor: string }

const ROOMS_RAW: RoomInfo[] = [
  ...range(101, 110).map((n) => ({ number: String(n), category: 'KDZ', floor: '1.OG' })),
  ...range(111, 115).map((n) => ({ number: String(n), category: 'GDZ', floor: '1.OG' })),
  ...range(116, 118).map((n) => ({ number: String(n), category: 'GDZ+S', floor: '1.OG' })),
  ...range(201, 210).map((n) => ({ number: String(n), category: 'KDZ', floor: '2.OG' })),
  ...range(211, 215).map((n) => ({ number: String(n), category: 'GDZ', floor: '2.OG' })),
  ...range(216, 218).map((n) => ({ number: String(n), category: 'GDZ+S', floor: '2.OG' })),
  ...range(301, 305).map((n) => ({ number: String(n), category: 'KDZ', floor: 'DG' })),
  ...range(401, 406).map((n) => ({ number: String(n), category: 'BS', floor: 'Suite' })),
  ...range(407, 413).map((n) => ({ number: String(n), category: 'BS+S', floor: 'Suite' })),
  ...range(501, 504).map((n) => ({ number: String(n), category: 'SPA', floor: 'SPA' })),
  ...range(505, 507).map((n) => ({ number: String(n), category: 'GSPA', floor: 'SPA' })),
  { number: '600', category: 'PS', floor: 'Bes.' },
  { number: '601', category: 'JS', floor: 'Bes.' },
  { number: '602', category: 'STB', floor: 'Bes.' },
];

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

export const ALL_ROOMS = [...ROOMS_RAW].sort((a, b) => Number(a.number) - Number(b.number));

export function getRoomCategory(roomNr: string): string {
  const room = ROOMS_RAW.find((r) => r.number === roomNr);
  return room?.category ?? '';
}

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
