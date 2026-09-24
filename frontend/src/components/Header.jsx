import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './Header.css';

const RUTA_POR_ROL = { '1': '/admin', '4': '/empleado', '2': '/mi-cuenta' };

function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Los tres paneles tienen su propia cabecera y sidebar, así que ahí no
  // mostramos la navegación pública.
  const esPanel = ['/admin', '/empleado', '/mi-cuenta'].includes(pathname);
  const logged = localStorage.getItem('mijardin_logged') === 'true';
  const userName = (localStorage.getItem('mijardin_user_name') || 'Mi cuenta').split(/\s+/)[0];
  const userRole = localStorage.getItem('mijardin_user_role');
  const rutaPanel = RUTA_POR_ROL[userRole];

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
      <Link to="/" className="header-logo" aria-label="MiJardín, ir al inicio">
        <Logo size={32} />
      </Link>
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
                {rutaPanel && (
                  <NavLink to={rutaPanel} onClick={() => setMenuAbierto(false)} className="header-user-dropdown-item">
                    Mi panel
                  </NavLink>
                )}
                {userRole === '2' && (
                  <NavLink to="/tienda" onClick={() => setMenuAbierto(false)} className="header-user-dropdown-item">
                    Ir a la tienda
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
