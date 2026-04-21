import React, { createContext, useContext, useMemo, useState } from 'react';
import { storage } from '../utils/storage';

type Locale = 'de' | 'en';

type Dict = Record<string, string>;

const TRANSLATIONS: Record<Locale, Dict> = {
  de: {
    'lang.de': 'DE',
    'lang.en': 'EN',
    'common.save': 'Speichern',
    'common.print': 'Drucken',
    'common.back': 'Zurueck',
    'common.error': 'Fehler',
    'common.logout': 'Abmelden',
    'common.delete': 'Loeschen',
    'common.open': 'Oeffnen',
    'common.download': 'Download',
    'common.copy': 'Kopieren',
    'common.copied': 'Kopiert',
    'common.reload': 'Neu laden',
    'nav.home': 'Startseite',
    'nav.offers': 'Angebote',
    'nav.newOffer': 'Neues Angebot',
    'nav.allOffers': 'Alle Angebote',
    'nav.occupancy': 'Belegungsliste',
    'nav.dayView': 'Tagesansicht',
    'nav.allDays': 'Alle Tage',
    'nav.staff': 'Mitarbeiter',
    'nav.assistant': 'KI-Assistent',
    'home.loggedInAs': 'Angemeldet als',
    'home.offersDesc': 'Angebote fuer Gaeste erstellen und verwalten',
    'home.occupancyDesc': 'Taegliche Gaestebelegung und Betriebsinformationen',
    'home.assistantDesc': 'Anfragen mit Live-Datenzugriff',
    'chat.title': 'Bleiche Knowledge Desk',
    'chat.empty': 'Stellen Sie Fragen zu Anreisen, Gaesten, Personal oder tagesaktuellen Daten.',
    'chat.placeholder': 'Anfrage eingeben... (Enter zum Senden, Shift+Enter fuer Zeilenumbruch)',
    'chat.send': 'Senden',
    'chat.activeQuery': 'Aktive Datenabfrage',
    'chat.you': 'DU',
    'chat.assistant': 'ASSISTENT',
    'chat.newConversation': 'Neue Unterhaltung',
    'chat.copyConversation': 'Gesamten Chat kopieren',
    'chat.exportImage': 'Als Bild speichern',
    'chat.copyMessage': 'Nachricht kopieren',
    'chat.copyCode': 'Code kopieren',
    'chat.reloadResponse': 'Antwort neu laden',
    'chat.history': 'Verlauf',
    'chat.loading': 'Laedt Unterhaltung...',
    'conversations.title': 'Unterhaltungen',
    'conversations.empty': 'Noch keine Unterhaltungen.',
    'conversations.new': 'Neue Unterhaltung starten',
    'conversations.deleted': 'Unterhaltung geloescht',
    'conversations.deleteConfirmTitle': 'Unterhaltung loeschen',
    'conversations.deleteConfirmBody': 'Diese Unterhaltung und alle Nachrichten endgueltig loeschen?',
    'offers.title': 'Angebote',
    'offers.new': 'Neues Angebot',
    'offers.search': 'Kunde suchen...',
    'offers.none': 'Noch keine Angebote vorhanden.',
    'offers.noneFound': 'Keine Angebote gefunden.',
    'offers.createFirst': 'Erstes Angebot erstellen',
    'offers.duplicate': 'Kopie',
    'offers.deleted': 'Angebot geloescht',
    'offers.duplicated': 'Dupliziert',
    'offers.duplicatedBody': 'Kopie fuer {name}',
    'offers.statusChanged': 'Status geaendert',
    'offers.deleteConfirmTitle': 'Angebot loeschen',
    'offers.deleteConfirmBody': 'Angebot fuer "{name}" wirklich loeschen?',
    'offers.count.one': '{count} Angebot',
    'offers.count.other': '{count} Angebote',
    'offer.export': 'Export HTML',
    'offer.exportWord': 'Word (.docx)',
    'belegung.exportExcel': 'Excel (.xlsx)',
    'offer.printPdf': 'Drucken / PDF',
    'offer.edit': 'Angebot bearbeiten',
    'offer.new': 'Neues Angebot',
    'staff.title': 'Mitarbeiter verwalten',
    'days.title': 'Alle Tage',
    'days.newDay': 'Neuen Tag anlegen',
    'days.date': 'Datum',
    'days.datePlaceholder': 'JJJJ-MM-TT',
    'days.create': '+ Tag erstellen',
    'days.creating': 'Erstelle...',
    'days.created': 'Tag erstellt',
    'days.deleted': 'Tag geloescht',
    'days.deleteConfirmTitle': 'Tag loeschen',
    'days.deleteConfirmBody': 'Tag {date} wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.',
    'days.empty': 'Noch keine Tage gespeichert. Erstellen Sie einen neuen Tag oben.',
    'days.summary.one': '{count} Tag gespeichert',
    'days.summary.other': '{count} Tage gespeichert',
    'days.col.date': 'Datum',
    'days.col.weekday': 'Wochentag',
    'days.col.arrivals': 'Anreisen',
    'days.col.stayers': 'Bleiber',
    'days.col.actions': 'Aktionen',
    'common.cancel': 'Abbrechen',
    'login.username': 'Benutzername',
    'login.password': 'Passwort',
    'login.signIn': 'Anmelden',
    'login.workspace': 'Operations Workspace',
    'widget.object': 'Objekt',
    'widget.open': 'Oeffnen',
    'widget.download': 'Export',
  },
  en: {
    'lang.de': 'DE',
    'lang.en': 'EN',
    'common.save': 'Save',
    'common.print': 'Print',
    'common.back': 'Back',
    'common.error': 'Error',
    'common.logout': 'Sign out',
    'common.delete': 'Delete',
    'common.open': 'Open',
    'common.download': 'Download',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.reload': 'Reload',
    'nav.home': 'Home',
    'nav.offers': 'Offers',
    'nav.newOffer': 'New Offer',
    'nav.allOffers': 'All Offers',
    'nav.occupancy': 'Occupancy',
    'nav.dayView': 'Daily View',
    'nav.allDays': 'All Days',
    'nav.staff': 'Staff',
    'nav.assistant': 'AI Assistant',
    'home.loggedInAs': 'Logged in as',
    'home.offersDesc': 'Create and manage guest offers',
    'home.occupancyDesc': 'Daily occupancy and operations information',
    'home.assistantDesc': 'Ask questions with live data access',
    'chat.title': 'Bleiche Knowledge Desk',
    'chat.empty': 'Ask about arrivals, guests, staff, or daily operations.',
    'chat.placeholder': 'Enter request... (Enter to send, Shift+Enter for newline)',
    'chat.send': 'Send',
    'chat.activeQuery': 'Live data mode',
    'chat.you': 'YOU',
    'chat.assistant': 'ASSISTANT',
    'chat.newConversation': 'New conversation',
    'chat.copyConversation': 'Copy entire chat',
    'chat.exportImage': 'Save as image',
    'chat.copyMessage': 'Copy message',
    'chat.copyCode': 'Copy code',
    'chat.reloadResponse': 'Reload response',
    'chat.history': 'History',
    'chat.loading': 'Loading conversation...',
    'conversations.title': 'Conversations',
    'conversations.empty': 'No conversations yet.',
    'conversations.new': 'Start a new conversation',
    'conversations.deleted': 'Conversation deleted',
    'conversations.deleteConfirmTitle': 'Delete conversation',
    'conversations.deleteConfirmBody': 'Permanently delete this conversation and all its messages?',
    'offers.title': 'Offers',
    'offers.new': 'New Offer',
    'offers.search': 'Search customer...',
    'offers.none': 'No offers yet.',
    'offers.noneFound': 'No offers found.',
    'offers.createFirst': 'Create first offer',
    'offers.duplicate': 'Duplicate',
    'offers.deleted': 'Offer deleted',
    'offers.duplicated': 'Duplicated',
    'offers.duplicatedBody': 'Copy for {name}',
    'offers.statusChanged': 'Status changed',
    'offers.deleteConfirmTitle': 'Delete offer',
    'offers.deleteConfirmBody': 'Delete offer for "{name}"?',
    'offers.count.one': '{count} offer',
    'offers.count.other': '{count} offers',
    'offer.export': 'Export HTML',
    'offer.exportWord': 'Word (.docx)',
    'belegung.exportExcel': 'Excel (.xlsx)',
    'offer.printPdf': 'Print / PDF',
    'offer.edit': 'Edit Offer',
    'offer.new': 'New Offer',
    'staff.title': 'Manage Staff',
    'days.title': 'All Days',
    'days.newDay': 'Create new day',
    'days.date': 'Date',
    'days.datePlaceholder': 'YYYY-MM-DD',
    'days.create': '+ Create day',
    'days.creating': 'Creating...',
    'days.created': 'Day created',
    'days.deleted': 'Day deleted',
    'days.deleteConfirmTitle': 'Delete day',
    'days.deleteConfirmBody': 'Delete day {date}? This action cannot be undone.',
    'days.empty': 'No days saved yet. Create a new day above.',
    'days.summary.one': '{count} day stored',
    'days.summary.other': '{count} days stored',
    'days.col.date': 'Date',
    'days.col.weekday': 'Weekday',
    'days.col.arrivals': 'Arrivals',
    'days.col.stayers': 'Stayers',
    'days.col.actions': 'Actions',
    'common.cancel': 'Cancel',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.signIn': 'Sign In',
    'login.workspace': 'Operations Workspace',
    'widget.object': 'Object',
    'widget.open': 'Open',
    'widget.download': 'Download',
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'de',
  setLocale: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'bleiche_locale';

function normaliseLocale(raw: string | null): Locale {
  return raw === 'en' ? 'en' : 'de';
}

// Only expand `{knownKey}` placeholders whose names actually appear in `vars`,
// so interpolated values containing `{foo}` can't be re-expanded as templates.
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => normaliseLocale(storage.get(STORAGE_KEY)));

  const setLocale = (next: Locale) => {
    const safe = normaliseLocale(next);
    setLocaleState(safe);
    storage.set(STORAGE_KEY, safe);
  };

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => {
      const base = TRANSLATIONS[locale][key] ?? TRANSLATIONS.de[key] ?? key;
      if (!vars) return base;
      return interpolate(base, vars);
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
