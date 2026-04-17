import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useOfferStore } from './store/offerStore';
import { useBelegungStore } from './store/belegungStore';
import Layout from './components/Layout';
import Home from './components/Home';
import OffersList from './components/OffersList';
import OfferEditor from './components/OfferEditor';
import BelegungEditor from './components/belegung/BelegungEditor';
import DaysList from './components/belegung/DaysList';
import StaffManager from './components/belegung/StaffManager';

export default function App() {
  const loadOffers = useOfferStore(s => s.loadFromStorage);
  const loadBelegung = useBelegungStore(s => s.loadStaffFromStorage);
  const loadDay = useBelegungStore(s => s.loadDay);
  const currentDate = useBelegungStore(s => s.currentDate);

  useEffect(() => {
    loadOffers();
    loadBelegung();
    loadDay(currentDate);
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />

          {/* Angebote */}
          <Route path="angebote" element={<OffersList />} />
          <Route path="angebote/neu" element={<OfferEditor />} />
          <Route path="angebote/:id" element={<OfferEditor />} />

          {/* Legacy routes redirect */}
          <Route path="offers" element={<Navigate to="/angebote" replace />} />
          <Route path="offers/new" element={<Navigate to="/angebote/neu" replace />} />

          {/* Belegungsliste */}
          <Route path="belegung" element={<BelegungEditor />} />
          <Route path="belegung/tage" element={<DaysList />} />
          <Route path="belegung/mitarbeiter" element={<StaffManager />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
