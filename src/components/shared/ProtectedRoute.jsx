import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role || 'manager';

  // Admin has unrestricted access everywhere
  if (role === 'admin' || allowedRoles.length === 0 || allowedRoles.includes(role)) {
    return <Outlet />;
  }

  // Redirect to role-appropriate home if unauthorized
  if (role === 'tenant') {
    return <Navigate to="/tenant/pay" replace />;
  }
  if (role === 'owner') {
    return <Navigate to="/owner/properties" replace />;
  }
  if (role === 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}
