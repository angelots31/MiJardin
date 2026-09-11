import { Navigate } from 'react-router-dom';

// roles: lista de nombres de rol permitidos, ej. ['Administrador']
function ProtectedRoute({ roles, children }) {
  const logged = localStorage.getItem('mijardin_logged') === 'true';
  const rolNombre = localStorage.getItem('mijardin_user_role_nombre');

  if (!logged) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(rolNombre)) return <Navigate to="/" replace />;

  return children;
}

export default ProtectedRoute;