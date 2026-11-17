import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { SearchProvider } from './context/SearchContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
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
