import { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { useBelegungStore } from '../../store/belegungStore';

export default function StaffManager() {
  const staff = useBelegungStore((s) => s.staff);
  const addStaffMember = useBelegungStore((s) => s.addStaffMember);
  const removeStaffMember = useBelegungStore((s) => s.removeStaffMember);
  const addToast = useBelegungStore((s) => s.addToast);

  const [newName, setNewName] = useState('');

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // Check for duplicates
    if (staff.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      addToast({ type: 'warning', title: 'Mitarbeiter existiert bereits', message: trimmed });
      return;
    }

    addStaffMember(trimmed);
    setNewName('');
    addToast({ type: 'success', title: 'Mitarbeiter hinzugefugt', message: trimmed });
  }

  function handleRemove(id: string, name: string) {
    removeStaffMember(id);
    addToast({ type: 'success', title: 'Mitarbeiter entfernt', message: name });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  // Sort alphabetically
  const sortedStaff = [...staff].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Users className="w-6 h-6 text-brand-400" />
          <h1 className="page-title">Mitarbeiter verwalten</h1>
        </div>
        <p className="text-sm text-dark-400 ml-9">
          Diese Namen stehen in der Belegungsliste zur Auswahl
        </p>
      </div>

      {/* Add new staff member */}
      <div className="card p-5">
        <h2 className="label mb-3">Neuen Mitarbeiter hinzufugen</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              placeholder="Vor- und Nachname..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary" disabled={!newName.trim()}>
            <Plus className="w-4 h-4" />
            Hinzufugen
          </button>
        </div>
      </div>

      {/* Staff list */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-dark-50 border-b border-dark-200">
          <h2 className="text-xs font-bold uppercase tracking-wide text-dark-500">
            Mitarbeiter ({staff.length})
          </h2>
        </div>

        {sortedStaff.length === 0 ? (
          <div className="p-8 text-center text-dark-400 text-sm">
            Noch keine Mitarbeiter angelegt. Fugen Sie oben einen neuen hinzu.
          </div>
        ) : (
          <ul className="divide-y divide-dark-100">
            {sortedStaff.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-brand-50/30 transition-colors duration-150"
              >
                <span className="text-sm text-dark-700">{member.name}</span>
                <button
                  onClick={() => handleRemove(member.id, member.name)}
                  className="btn-ghost text-dark-300 hover:text-rose-500"
                  title={`${member.name} entfernen`}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
