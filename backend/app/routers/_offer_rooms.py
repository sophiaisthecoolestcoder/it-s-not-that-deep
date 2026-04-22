"""Room catalogue + amenity lists used by the offer HTML export.

Mirrors frontend/src/data/roomCategories.ts and frontend/src/utils/rooms.ts so the
backend HTML output matches the Word document without the frontend needing to
round-trip through the server.
"""
from typing import Dict, List, Tuple


# (id, name, group)
ROOM_CATEGORIES: List[Tuple[str, str, str]] = [
    ("kleines-dz", "Kleines Doppelzimmer", "Doppelzimmer"),
    ("geraeumiges-dz", "Geräumiges Doppelzimmer", "Doppelzimmer"),
    ("geraeumiges-dz-sauna", "Geräumiges Doppelzimmer mit Sauna", "Doppelzimmer"),

    ("bleiche-suite", "Bleiche Suite (ohne Sauna)", "Bleiche Suiten"),
    ("bleiche-suite-sauna", "Bleiche Suite (mit Sauna)", "Bleiche Suiten"),

    ("spa-suite", "SPA-Suite", "SPA Suiten"),
    ("grosse-spa-suite", "Große SPA-Suite", "SPA Suiten"),

    ("besondere-suite", "Eine unserer besonderen Suiten", "Besondere Suiten"),
    ("praesidentinnensuite", "Präsidentinnensuite", "Besondere Suiten"),
    ("japanische-suite", "Japanische Suite", "Besondere Suiten"),
    ("storchenburg", "Storchenburg", "Besondere Suiten"),

    ("custom", "Sonstiges", "Sonstiges"),
]


def room_name_by_id(room_id: str) -> str:
    for rid, name, _ in ROOM_CATEGORIES:
        if rid == room_id:
            return name
    return ""


def room_group_by_id(room_id: str) -> str:
    for rid, _, group in ROOM_CATEGORIES:
        if rid == room_id:
            return group
    return ""


AMENITIES_DOPPELZIMMER: List[str] = [
    "Ab 27 m² bis 75 m² Raum mit Dusche und/oder Badewanne und WC",
    "Ihr persönlicher Bademantel für den Aufenthalt",
    "Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen",
    "Mineralwasser am Tag der Anreise in Ihrem Zimmer",
    "Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung",
    "Nutzung der vielfältigen Außensportanlagen",
    "Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl",
    "Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm",
    "Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen",
    "Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung",
    "Eintritt zu unseren regelmäßigen Lesungen während des Aufenthaltes der Spreewald-Literatur-Stipendiaten",
]

AMENITIES_BLEICHE_SUITEN: List[str] = [
    "Ca. 80 m² Raum mit geräumiger Dusche und Badewanne, WC",
    "HD-LED-TV",
    "Mit oder ohne privater finnischer Sauna oder Infrarotkabine",
    "Ihr persönlicher Bademantel für den Aufenthalt",
    "Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen",
    "Mineralwasser am Tag der Anreise in Ihrem Zimmer",
    "Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung",
    "Nutzung der vielfältigen Außensportanlagen",
    "Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl",
    "Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm",
    "Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen",
    "Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung",
    "Eintritt zu unseren regelmäßigen Lesungen während des Aufenthaltes der Spreewald-Literatur-Stipendiaten",
]

AMENITIES_SPA_SUITEN: List[str] = [
    "Ca. 115 m² bis 180 m² Raum",
    "HD-LED-TV im Wohnraum, in den Schlafbereichen und teilweise im Bad",
    "Privates SPA mit finnischer Sauna und Hamam sowie geräumiger Dusche und großer Badewanne, separates WC",
    "Ihr persönlicher Bademantel für den Aufenthalt",
    "Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen",
    "Mineralwasser am Tag der Anreise in Ihrem Zimmer",
    "Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung",
    "Nutzung der vielfältigen Außensportanlagen",
    "Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl",
    "Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm",
    "Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen",
    "Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung",
]

AMENITIES_BESONDERE_SUITEN: List[str] = [
    "Ca. 240 m² Raum mit einem Wohnzimmer, 2 bzw. 3 separaten Schlafbereichen, zugehörigen Bädern mit geräumiger Dusche oder großer Badewanne, WC",
    "HD-LED-TV im Wohnraum und teilweise in den Schlafbereichen",
    "Mit oder ohne privater finnischer Sauna und Hamam",
    "Ihr persönlicher Bademantel für den Aufenthalt",
    "Nutzung der Landtherme mit dem Schwimmbad am Kamin, beheiztem Außenpool, Whirlpool, Saunen, Saline, Dampfbad, Fitnessraum, dem Familienpool mit extra Sauna, den großzügigen Ruheräumen mit extra vielen Liegen, der Bleiche Bibliothek zu Kunst und Philosophie sowie den Landtherme Lichtspielen",
    "Minibar",
    "Hochwertige Spirituosenauswahl",
    "Verlängerte Nutzung der Landtherme am An- und Abreisetag",
    "Teilnahme an täglichen Fitness- & Entspannungsangeboten nach vorheriger Reservierung",
    "Nutzung der vielfältigen Außensportanlagen",
    "Unsere großzügige Gartenanlage mit viel Platz für Ihren Liegestuhl",
    "Nutzung unseres SPA-Cinema Landtherme Lichtspiele mit täglich wechselndem, ausgesuchten Filmprogramm",
    "Nutzung unserer Bibliotheken zu ausgesucht schönen und interessanten Themen",
    "Shuttle vom und zum Bahnhof Vetschau nach rechtzeitiger Anmeldung",
]

AMENITIES_BY_GROUP: Dict[str, List[str]] = {
    "Doppelzimmer": AMENITIES_DOPPELZIMMER,
    "Bleiche Suiten": AMENITIES_BLEICHE_SUITEN,
    "SPA Suiten": AMENITIES_SPA_SUITEN,
    "Besondere Suiten": AMENITIES_BESONDERE_SUITEN,
    "Sonstiges": AMENITIES_DOPPELZIMMER,
}


def amenities_for_room_id(room_id: str) -> List[str]:
    group = room_group_by_id(room_id)
    return AMENITIES_BY_GROUP.get(group, AMENITIES_DOPPELZIMMER)


GENUSSPAUSCHALE: List[str] = [
    "Frühstück ab 7:30 Uhr, wann immer sie ausgeschlafen haben",
    "Kulinarische Kleinigkeiten in unserem Bios für zwischendurch",
    "Unser exklusives Bleiche-Abendmenü",
]

CLOSING_PARAGRAPHS: List[str] = [
    "Unsere Zimmer und Suiten sowie unsere Landtherme stehen am Anreisetag ab 16.00 Uhr und am Abreisetag bis 12.00 Uhr zur Verfügung.",
    "Unsere SPA-Quellen stehen Ihnen gern für Ihre Reservierungswünsche für Anwendungen in der Landtherme zur Verfügung (Tel. +49 (0)35603-62519 sowie landtherme@bleiche.de).",
    "Unsere Stornierungsbedingungen finden Sie auf unserer Homepage www.bleiche.de unter der Rubrik \"Impressum/AGB\".",
    "Wir freuen uns, wenn Ihnen unser Angebot zusagt und wir Sie als Gäste in unserem Haus begrüßen dürfen.",
]
