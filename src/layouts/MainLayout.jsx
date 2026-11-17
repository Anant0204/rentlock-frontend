import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';

export default function MainLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-[#F0F4FA] overflow-hidden">
      <Toaster position="top-right" toastOptions={{
        className: '!rounded-xl !shadow-xl !border !border-gray-100 !text-sm',
        duration: 3000,
      }} />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-3 lg:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
