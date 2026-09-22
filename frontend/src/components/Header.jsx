import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const RUTA_POR_ROL = { '1': '/admin', '4': '/empleado', '2': '/mi-cuenta' };

function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const esPanel = pathname === '/admin' || pathname === '/empleado';
  const logged = localStorage.getItem('mijardin_logged') === 'true';
  const userName = (localStorage.getItem('mijardin_user_name') || 'Mi cuenta').split(/\s+/)[0];
  const userRole = localStorage.getItem('mijardin_user_role');
  const rutaPanel = RUTA_POR_ROL[userRole];
  const tienePanel = userRole === '1' || userRole === '4';

  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const handleLogout = () => {
    ['mijardin_logged', 'mijardin_token', 'mijardin_user', 'mijardin_user_name', 'mijardin_user_id', 'mijardin_user_role', 'mijardin_user_role_nombre', 'mijardin_remember']
      .forEach((key) => localStorage.removeItem(key));
    setMenuAbierto(false);
    navigate('/');
  };

  if (esPanel) return null;

  return (
    <header className="header flex items-center justify-between">
      <div className="header-logo">
        <svg width="30" height="30" viewBox="0 0 26 26" fill="none" aria-hidden="true">
          <circle cx="13" cy="7" r="4" fill="#D9714E" />
          <circle cx="19" cy="13" r="4" fill="#E8AC4F" />
          <circle cx="13" cy="19" r="4" fill="#7C9473" />
          <circle cx="7" cy="13" r="4" fill="#F1E7D6" />
          <circle cx="13" cy="13" r="3" fill="#FAF3E7" />
        </svg>
        MiJardín
      </div>
      <nav className="header-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'activo' : ''}>Inicio</NavLink>
        <NavLink to="/quienes-somos" className={({ isActive }) => isActive ? 'activo' : ''}>¿Quiénes Somos?</NavLink>
        <NavLink to="/contacto" className={({ isActive }) => isActive ? 'activo' : ''}>Contacto</NavLink>
        <NavLink to="/tienda" className={({ isActive }) => isActive ? 'activo' : ''}>Tienda</NavLink>
        {logged ? (
          <div className="header-user-menu" ref={menuRef}>
            <button
              type="button"
              className="header-user"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
            >
              {userName}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`header-user-caret ${menuAbierto ? 'abierto' : ''}`}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {menuAbierto && (
              <div className="header-user-dropdown">
                {userRole === '2' && (
                  <NavLink to="/mis-pedidos" onClick={() => setMenuAbierto(false)} className="header-user-dropdown-item">
                    Mis pedidos
                  </NavLink>
                )}
                {userRole === '2' && (
                  <NavLink to="/mis-compras" onClick={() => setMenuAbierto(false)} className="header-user-dropdown-item">
                    Mis compras y facturas
                  </NavLink>
                )}
                {userRole === '2' && (
                  <NavLink to="/mis-pqr" onClick={() => setMenuAbierto(false)} className="header-user-dropdown-item">
                    Mis solicitudes (PQR)
                  </NavLink>
                )}
                {tienePanel && (
                  <NavLink to={rutaPanel} onClick={() => setMenuAbierto(false)} className="header-user-dropdown-item">
                    Mi panel
                  </NavLink>
                )}
                <button type="button" onClick={handleLogout} className="header-user-dropdown-item header-user-dropdown-danger">
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <NavLink to="/login" className={({ isActive }) => isActive ? 'activo' : ''}>Iniciar sesión</NavLink>
        )}
      </nav>
    </header>
  );
}

export default Header;
