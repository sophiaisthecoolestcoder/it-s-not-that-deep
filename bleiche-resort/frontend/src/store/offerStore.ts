import { create } from 'zustand';
import type { Offer, OfferStatus } from '../types';
import { loadOffers, saveOffers } from '../utils/storage';
import { generateId } from '../utils/helpers';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface OfferState {
  offers: Offer[];
  toasts: Toast[];
  sidebarCollapsed: boolean;

  addOffer: (offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateOffer: (id: string, updates: Partial<Offer>) => void;
  deleteOffer: (id: string) => void;
  duplicateOffer: (id: string) => string;
  setOfferStatus: (id: string, status: OfferStatus) => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;

  loadFromStorage: () => void;
}

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: [],
  toasts: [],
  sidebarCollapsed: false,

  addOffer: (offerData) => {
    const now = new Date().toISOString();
    const id = generateId();
    const offer: Offer = { ...offerData, id, createdAt: now, updatedAt: now };
    const updated = [offer, ...get().offers];
    saveOffers(updated);
    set({ offers: updated });
    return id;
  },

  updateOffer: (id, updates) => {
    const updated = get().offers.map(o =>
      o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
    );
    saveOffers(updated);
    set({ offers: updated });
  },

  deleteOffer: (id) => {
    const updated = get().offers.filter(o => o.id !== id);
    saveOffers(updated);
    set({ offers: updated });
  },

  duplicateOffer: (id) => {
    const original = get().offers.find(o => o.id === id);
    if (!original) return '';
    const now = new Date().toISOString();
    const newId = generateId();
    const copy: Offer = {
      ...original,
      id: newId,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    const updated = [copy, ...get().offers];
    saveOffers(updated);
    set({ offers: updated });
    return newId;
  },

  setOfferStatus: (id, status) => {
    const updated = get().offers.map(o =>
      o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
    );
    saveOffers(updated);
    set({ offers: updated });
  },

  addToast: (toast) => {
    const id = generateId();
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  },

  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  loadFromStorage: () => {
    set({ offers: loadOffers() });
  },
}));
