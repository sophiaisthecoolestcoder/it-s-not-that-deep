export interface RoomCategory {
  id: string;
  name: string;
  group: string;
  size: string;
}

export const ROOM_CATEGORIES: RoomCategory[] = [
  // Doppelzimmer
  { id: 'kleines-dz', name: 'Kleines Doppelzimmer', group: 'Doppelzimmer', size: '~27 m²' },
  { id: 'geraeumiges-dz', name: 'Geräumiges Doppelzimmer', group: 'Doppelzimmer', size: '~35 m²' },
  { id: 'geraeumiges-dz-sauna', name: 'Geräumiges Doppelzimmer mit Sauna', group: 'Doppelzimmer', size: '~35 m²' },

  // Bleiche Suiten
  { id: 'bleiche-suite', name: 'Bleiche Suite (ohne Sauna)', group: 'Bleiche Suiten', size: '~80 m²' },
  { id: 'bleiche-suite-sauna', name: 'Bleiche Suite (mit Sauna)', group: 'Bleiche Suiten', size: '~80 m²' },

  // SPA Suiten
  { id: 'spa-suite', name: 'SPA-Suite', group: 'SPA Suiten', size: '~115 m²' },
  { id: 'grosse-spa-suite', name: 'Große SPA-Suite', group: 'SPA Suiten', size: '~180 m²' },

  // Besondere Suiten
  { id: 'besondere-suite', name: 'Eine unserer besonderen Suiten', group: 'Besondere Suiten', size: '~240 m²' },
  { id: 'praesidentinnensuite', name: 'Präsidentinnensuite', group: 'Besondere Suiten', size: '~360 m²' },
  { id: 'japanische-suite', name: 'Japanische Suite', group: 'Besondere Suiten', size: '~240 m²' },
  { id: 'storchenburg', name: 'Storchenburg', group: 'Besondere Suiten', size: '~240 m²' },

  // Sonstiges
  { id: 'custom', name: 'Sonstiges', group: 'Sonstiges', size: '' },
];

export const ROOM_GROUPS = [...new Set(ROOM_CATEGORIES.map(r => r.group))];

// ─── Amenities per room group ───────────────────────────────────────────────

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

/** Get amenities list for a room category name */
export function getAmenitiesForRoom(roomCategoryName: string): string[] {
  const cat = ROOM_CATEGORIES.find(r => r.name === roomCategoryName);
  if (cat && AMENITIES_BY_GROUP[cat.group]) return AMENITIES_BY_GROUP[cat.group];
  return AMENITIES_DOPPELZIMMER;
}
