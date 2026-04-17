import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trash2, Plus, ExternalLink } from 'lucide-react';
import { useBelegungStore } from '../../store/belegungStore';
import { formatDateGerman, formatWeekday, todayISO } from '../../utils/helpers';

export default function DaysList() {
  const allDays = useBelegungStore((s) => s.allDays);
  const setCurrentDate = useBelegungStore((s) => s.setCurrentDate);
  const deleteDay = useBelegungStore((s) => s.deleteDay);
  const addToast = useBelegungStore((s) => s.addToast);
  const navigate = useNavigate();

  const [newDate, setNewDate] = useState(todayISO());

  /** Navigate to the editor for a specific date */
  function handleOpenDay(date: string) {
    setCurrentDate(date);
    navigate('/belegung');
  }

  /** Create a new day and navigate to it */
  function handleCreateDay() {
    if (!newDate) return;
    if (allDays.includes(newDate)) {
      // Day already exists, just navigate to it
      handleOpenDay(newDate);
      return;
    }
    setCurrentDate(newDate);
    // Save immediately so it appears in the list
    useBelegungStore.getState().saveDay();
    addToast({ type: 'success', title: 'Tag erstellt', message: formatDateGerman(newDate) });
  }

  /** Delete a day with confirmation */
  function handleDeleteDay(date: string) {
    const confirmed = window.confirm(
      `Tag ${formatDateGerman(date)} wirklich loschen? Diese Aktion kann nicht ruckgangig gemacht werden.`
    );
    if (!confirmed) return;
    deleteDay(date);
    addToast({ type: 'success', title: 'Tag geloscht', message: formatDateGerman(date) });
  }

  // Sort days descending (newest first)
  const sortedDays = [...allDays].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-brand-400" />
          <h1 className="page-title">Alle Tage</h1>
        </div>
      </div>

      {/* Create new day */}
      <div className="card p-5">
        <h2 className="label mb-3">Neuen Tag anlegen</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Datum</label>
            <input
              type="date"
              className="input w-48"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <button onClick={handleCreateDay} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tag erstellen
          </button>
        </div>
      </div>

      {/* Days table */}
      <div className="card overflow-hidden">
        {sortedDays.length === 0 ? (
          <div className="p-8 text-center text-dark-400 text-sm">
            Noch keine Tage gespeichert. Erstellen Sie einen neuen Tag oben.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-dark-50 border-b border-dark-200">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-dark-500">
                  Datum
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-dark-500">
                  Wochentag
                </th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wide text-dark-500">
                  Anreisen
                </th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wide text-dark-500">
                  Bleiber
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-dark-500">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDays.map((date) => {
                // We load minimal info; for counts we'd need to load each day's data.
                // For performance, we show the formatted date and action buttons.
                return (
                  <tr
                    key={date}
                    className="border-b border-dark-100 hover:bg-brand-50/30 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleOpenDay(date)}
                  >
                    <td className="px-4 py-3 text-sm text-dark-700 font-medium">
                      {formatDateGerman(date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-500">
                      {formatWeekday(date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-400 text-center">
                      &mdash;
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-400 text-center">
                      &mdash;
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDay(date)}
                          className="btn-ghost text-brand-400 hover:text-brand-600"
                          title="Tag offnen"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDay(date)}
                          className="btn-ghost text-dark-300 hover:text-rose-500"
                          title="Tag loschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {sortedDays.length > 0 && (
        <p className="text-xs text-dark-400 text-right">
          {sortedDays.length} {sortedDays.length === 1 ? 'Tag' : 'Tage'} gespeichert
        </p>
      )}
    </div>
  );
}
