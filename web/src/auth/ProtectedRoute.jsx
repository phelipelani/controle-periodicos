import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, somenteAdmin = false }) {
  const { usuario, carregando, isAdmin } = useAuth();
  if (carregando) return <div className="centro">Carregando…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (somenteAdmin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}
