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
    'chat.copyConversation': 'Gesamten Chat kopieren',
    'chat.exportImage': 'Als Bild speichern',
    'chat.copyMessage': 'Nachricht kopieren',
    'chat.copyCode': 'Code kopieren',
    'chat.reloadResponse': 'Antwort neu laden',
    'offers.title': 'Angebote',
    'offers.new': 'Neues Angebot',
    'offers.search': 'Kunde suchen...',
    'offers.none': 'Noch keine Angebote vorhanden.',
    'offers.noneFound': 'Keine Angebote gefunden.',
    'offers.createFirst': 'Erstes Angebot erstellen',
    'offers.duplicate': 'Kopie',
    'offers.deleted': 'Angebot geloescht',
    'offers.deleteConfirmTitle': 'Angebot loeschen',
    'offers.deleteConfirmBody': 'Angebot fuer "{name}" wirklich loeschen?',
    'offer.export': 'Export HTML',
    'offer.printPdf': 'Drucken / PDF',
    'offer.edit': 'Angebot bearbeiten',
    'offer.new': 'Neues Angebot',
    'staff.title': 'Mitarbeiter verwalten',
    'days.title': 'Alle Tage',
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
    'chat.copyConversation': 'Copy entire chat',
    'chat.exportImage': 'Save as image',
    'chat.copyMessage': 'Copy message',
    'chat.copyCode': 'Copy code',
    'chat.reloadResponse': 'Reload response',
    'offers.title': 'Offers',
    'offers.new': 'New Offer',
    'offers.search': 'Search customer...',
    'offers.none': 'No offers yet.',
    'offers.noneFound': 'No offers found.',
    'offers.createFirst': 'Create first offer',
    'offers.duplicate': 'Duplicate',
    'offers.deleted': 'Offer deleted',
    'offers.deleteConfirmTitle': 'Delete offer',
    'offers.deleteConfirmBody': 'Delete offer for "{name}"?',
    'offer.export': 'Export HTML',
    'offer.printPdf': 'Print / PDF',
    'offer.edit': 'Edit Offer',
    'offer.new': 'New Offer',
    'staff.title': 'Manage Staff',
    'days.title': 'All Days',
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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const initial = (storage.get(STORAGE_KEY) as Locale | null) || 'de';
  const [locale, setLocaleState] = useState<Locale>(initial === 'en' ? 'en' : 'de');

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    storage.set(STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => {
      const base = TRANSLATIONS[locale][key] ?? TRANSLATIONS.de[key] ?? key;
      if (!vars) return base;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, v),
        base,
      );
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
