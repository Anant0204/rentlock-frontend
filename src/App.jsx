import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { SearchProvider } from './context/SearchContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        className: '!rounded-xl !shadow-xl !border !border-gray-100 !text-sm',
        duration: 4000,
      }} />
      <ErrorBoundary>
        <AuthProvider>
          <SidebarProvider>
            <SearchProvider>
              <AppRoutes />
            </SearchProvider>
          </SidebarProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
