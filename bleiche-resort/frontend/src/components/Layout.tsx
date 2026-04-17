import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useOfferStore } from '../store/offerStore';
import Sidebar from './Sidebar';
import ToastContainer from './ui/Toast';

export default function Layout() {
  const collapsed = useOfferStore(s => s.sidebarCollapsed);
  return (
    <div className="flex min-h-screen bg-[#faf6f1]">
      <Sidebar />
      <main className={clsx('flex-1 transition-all duration-200', collapsed ? 'ml-[72px]' : 'ml-[280px]')}>
        <div className="flex justify-center pt-6">
          <img src="/bleiche-logo-text.png" alt="Bleiche Resort & Spa" className="h-20 object-contain" />
        </div>
        <div className="p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
