import { Link } from 'react-router-dom';
import { FileText, ClipboardList } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {/* Two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          to="/angebote"
          className="card p-8 flex flex-col items-center gap-4 hover:border-brand-400 hover:shadow-md transition-all duration-200 group"
        >
          <div className="w-14 h-14 flex items-center justify-center bg-brand-50 text-brand-400 group-hover:bg-brand-400 group-hover:text-white transition-all duration-200">
            <FileText size={28} />
          </div>
          <h2 className="font-serif text-lg text-dark-500">Angebote</h2>
          <p className="text-xs text-dark-400 text-center">
            Angebote für Gäste erstellen und verwalten
          </p>
        </Link>

        <Link
          to="/belegung"
          className="card p-8 flex flex-col items-center gap-4 hover:border-brand-400 hover:shadow-md transition-all duration-200 group"
        >
          <div className="w-14 h-14 flex items-center justify-center bg-brand-50 text-brand-400 group-hover:bg-brand-400 group-hover:text-white transition-all duration-200">
            <ClipboardList size={28} />
          </div>
          <h2 className="font-serif text-lg text-dark-500">Belegungsliste</h2>
          <p className="text-xs text-dark-400 text-center">
            Tägliche Gästebelegung und Betriebsinformationen
          </p>
        </Link>
      </div>
    </div>
  );
}
