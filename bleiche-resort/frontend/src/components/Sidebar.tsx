import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { FileText, FilePlus2, ClipboardList, Calendar, Users, Home, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useOfferStore } from '../store/offerStore';

const SECTIONS = [
  {
    label: 'Angebote',
    prefix: '/angebote',
    items: [
      { to: '/angebote/neu', label: 'Neues Angebot', icon: FilePlus2, end: false },
      { to: '/angebote', label: 'Alle Angebote', icon: FileText, end: true },
    ],
  },
  {
    label: 'Belegungsliste',
    prefix: '/belegung',
    items: [
      { to: '/belegung', label: 'Tagesansicht', icon: ClipboardList, end: true },
      { to: '/belegung/tage', label: 'Alle Tage', icon: Calendar, end: false },
      { to: '/belegung/mitarbeiter', label: 'Mitarbeiter', icon: Users, end: false },
    ],
  },
];

export default function Sidebar() {
  const collapsed = useOfferStore(s => s.sidebarCollapsed);
  const toggleSidebar = useOfferStore(s => s.toggleSidebar);
  const location = useLocation();

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 h-screen bg-dark-800 text-dark-200 flex flex-col transition-all duration-200 z-40',
        collapsed ? 'w-[72px]' : 'w-[280px]'
      )}
    >
      {/* Logo area */}
      <NavLink to="/" className="flex items-center gap-3 px-4 py-5 border-b border-dark-700 hover:bg-dark-700/30 transition-all duration-200">
        <img src="/logo_transparent.png" alt="Bleiche Logo" className="w-9 h-9 object-contain flex-shrink-0" />
        {!collapsed && (
          <span className="font-serif text-brand-400 text-sm tracking-wide whitespace-nowrap">
            Bleiche Resort &amp; Spa
          </span>
        )}
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 border-l-2',
              isActive
                ? 'border-brand-400 text-brand-400 bg-dark-900/40'
                : 'border-transparent text-dark-300 hover:text-brand-400 hover:bg-dark-900/20'
            )
          }
        >
          <Home size={18} className="flex-shrink-0" />
          {!collapsed && <span>Startseite</span>}
        </NavLink>

        {SECTIONS.map(section => {
          const isActiveSection = location.pathname.startsWith(section.prefix);
          return (
            <div key={section.prefix} className="mt-1">
              {!collapsed && (
                <div className={clsx(
                  'px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest',
                  isActiveSection ? 'text-brand-400' : 'text-dark-500'
                )}>
                  {section.label}
                </div>
              )}
              {collapsed && <div className="border-t border-dark-700 my-1 mx-3" />}
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-2 text-sm transition-all duration-150 border-l-2',
                      isActive
                        ? 'border-brand-400 text-brand-400 bg-dark-900/40'
                        : 'border-transparent text-dark-300 hover:text-brand-400 hover:bg-dark-900/20',
                      collapsed && 'justify-center px-0'
                    )
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-dark-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={toggleSidebar}
          className="text-dark-400 hover:text-brand-400 transition-colors duration-150"
          title={collapsed ? 'Sidebar einblenden' : 'Sidebar ausblenden'}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
        {!collapsed && <span className="text-xs text-dark-500 tracking-wide">v1.0.0</span>}
      </div>
    </aside>
  );
}
