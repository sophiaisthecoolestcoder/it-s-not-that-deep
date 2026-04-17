import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Copy, FileText, Eye, Send, Search } from 'lucide-react';
import { useOfferStore } from '../store/offerStore';
import type { OfferStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { formatDateGerman, formatEuro, getOfferNumber } from '../utils/helpers';

const statusOptions: OfferStatus[] = ['draft', 'sent', 'accepted', 'declined'];

export default function OffersList() {
  const offers = useOfferStore(s => s.offers);
  const deleteOffer = useOfferStore(s => s.deleteOffer);
  const duplicateOffer = useOfferStore(s => s.duplicateOffer);
  const setOfferStatus = useOfferStore(s => s.setOfferStatus);
  const addToast = useOfferStore(s => s.addToast);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');

  const filtered = offers.filter(o => {
    const fullName = `${o.client.firstName} ${o.client.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Angebot für "${name}" wirklich löschen?`)) return;
    deleteOffer(id);
    addToast({ type: 'success', title: 'Angebot gelöscht', message: `Angebot für ${name} wurde entfernt.` });
  }

  function handleDuplicate(id: string, name: string) {
    const newId = duplicateOffer(id);
    if (newId) {
      addToast({ type: 'success', title: 'Angebot dupliziert', message: `Kopie für ${name} erstellt.` });
    }
  }

  function handleStatusChange(id: string, status: OfferStatus) {
    setOfferStatus(id, status);
    addToast({ type: 'info', title: 'Status geändert', message: `Status auf "${STATUS_LABELS[status]}" gesetzt.` });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Angebote</h1>
          <p className="text-sm text-dark-400 mt-1">
            {offers.length} Angebot{offers.length !== 1 ? 'e' : ''}
          </p>
        </div>
        <Link to="/angebote/neu" className="btn-primary">
          <Plus size={18} />
          Neues Angebot
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
        <input
          type="text"
          placeholder="Kunde suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto text-dark-300 mb-4" />
          <p className="text-dark-400 text-sm">
            {search ? 'Keine Angebote gefunden.' : 'Noch keine Angebote vorhanden.'}
          </p>
          {!search && (
            <Link to="/angebote/neu" className="btn-secondary btn-sm mt-4 inline-flex">
              <Plus size={16} />
              Erstes Angebot erstellen
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Nr.</th>
                  <th className="table-header">Kunde</th>
                  <th className="table-header">Zimmerkategorie</th>
                  <th className="table-header">Anreise</th>
                  <th className="table-header">Gesamtpreis</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {filtered.map(offer => {
                  const name = `${offer.client.firstName} ${offer.client.lastName}`;
                  return (
                    <tr key={offer.id} className="hover:bg-brand-50/50 transition-colors">
                      <td className="table-cell font-mono text-xs">
                        {getOfferNumber(offer.id, offer.createdAt)}
                      </td>
                      <td className="table-cell font-medium">{name}</td>
                      <td className="table-cell">{offer.roomCategory || '—'}</td>
                      <td className="table-cell">{formatDateGerman(offer.arrivalDate)}</td>
                      <td className="table-cell">{formatEuro(offer.totalPrice)}</td>
                      <td className="table-cell">
                        <span className={`badge ${STATUS_COLORS[offer.status]}`}>
                          {STATUS_LABELS[offer.status]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/angebote/${offer.id}`)}
                            className="btn-ghost btn-sm"
                            title="Anzeigen / Bearbeiten"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(offer.id, name)}
                            className="btn-ghost btn-sm"
                            title="Duplizieren"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(offer.id, name)}
                            className="btn-ghost btn-sm text-red-700 hover:text-red-900"
                            title="Löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                          <select
                            value={offer.status}
                            onChange={e => handleStatusChange(offer.id, e.target.value as OfferStatus)}
                            className="ml-1 text-xs border border-dark-200 bg-white px-2 py-1 text-dark-500 focus:outline-none focus:border-brand-400 rounded-none cursor-pointer"
                            title="Status ändern"
                          >
                            {statusOptions.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
