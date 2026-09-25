import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './Footer.css';

function Footer() {
  const año = new Date().getFullYear();
  const { pathname } = useLocation();

  // Los tres paneles son vistas a pantalla completa con su propio sidebar,
  // así que ahí no mostramos el pie de página.
  if (['/admin', '/empleado', '/mi-cuenta'].includes(pathname)) return null;

  return (
    <footer className="footer">
      <div className="footer-contenido">
        <div className="footer-marca-col">
          <Logo size={40} />
          <p className="footer-descripcion">
            Conectamos personas con flores, ramos y floristerías para que puedan crear
            momentos especiales desde casa.
          </p>
        </div>

        <div className="footer-columna">
          <h3>Explora</h3>
          <Link to="/">Inicio</Link>
          <Link to="/quienes-somos">¿Quiénes Somos?</Link>
          <Link to="/tienda">Tienda</Link>
          <Link to="/contacto">Contacto</Link>
        </div>

        <div className="footer-columna">
          <h3>MiJardín</h3>
          <span>Flores y ramos</span>
          <span>Ramos personalizados</span>
          <span>Tiendas aliadas</span>
          <span>Entrega a domicilio</span>
        </div>

        <div className="footer-columna">
          <h3>Contáctanos</h3>
          <span>Medellín, Antioquia</span>
          <span>Colombia</span>
          <span>mijardin@gmail.com</span>
          <span>+57 312 345 6789</span>
        </div>
      </div>

      <div className="footer-final">
        <p>© {año} MiJardín. Todos los derechos reservados.</p>
        <p>Flores que conectan personas.</p>
      </div>
    </footer>
  );
}

export default Footer;
