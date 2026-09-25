import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Home, LayoutDashboard, LogOut, MessageCircleQuestion,
  Receipt, ShoppingBag, Store, User,
} from 'lucide-react';

import Logo from '../components/Logo';
import DashboardResumen from '../components/dashboard/DashboardResumen';
import FacturasPanel from '../components/FacturasPanel';
import MisPedidos from './MisPedidos';
import MisCompras from './MisCompras';
import MisPqr from './MisPqr';

/**
 * Secciones del panel.
 *
 * Antes cada una era una página aparte (/mis-pedidos, /mis-compras,
 * /mis-pqr...) y el cliente tenía que ir y venir entre ellas. Ahora todas
 * viven en un solo panel con sidebar y se cambian sin recargar.
 */
const SECCIONES = [
  { id: 'resumen', etiqueta: 'Resumen', icono: LayoutDashboard, descripcion: 'Tus indicadores y el estado general de tu cuenta.' },
  { id: 'pedidos', etiqueta: 'Mis pedidos', icono: ShoppingBag, descripcion: 'Sigue el estado de cada pedido y los cambios que hagamos.' },
  { id: 'compras', etiqueta: 'Mis compras', icono: FileText, descripcion: 'Historial de las compras que ya quedaron confirmadas.' },
  { id: 'facturas', etiqueta: 'Mis facturas', icono: Receipt, descripcion: 'Descarga en PDF las facturas de tus compras.' },
  { id: 'pqr', etiqueta: 'Mis solicitudes (PQR)', icono: MessageCircleQuestion, descripcion: 'Radica y consulta peticiones, quejas, reclamos y sugerencias.' },
  { id: 'perfil', etiqueta: 'Mi perfil', icono: User, descripcion: 'Los datos de tu cuenta en MiJardín.' },
];

const SECCION_POR_DEFECTO = 'resumen';

const CLAVES_SESION = [
  'mijardin_logged', 'mijardin_token', 'mijardin_user', 'mijardin_user_name',
  'mijardin_user_id', 'mijardin_user_role', 'mijardin_user_role_nombre', 'mijardin_remember',
];

function PanelCliente() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const nombre = localStorage.getItem('mijardin_user_name') || 'Cliente';
  const email = localStorage.getItem('mijardin_user') || '';
  const idUsuario = localStorage.getItem('mijardin_user_id') || '—';

  const solicitada = params.get('seccion');
  const seccion = SECCIONES.some((s) => s.id === solicitada) ? solicitada : SECCION_POR_DEFECTO;
  const actual = SECCIONES.find((s) => s.id === seccion);

  const irA = (id) => setParams({ seccion: id }, { replace: true });

  const cerrarSesion = () => {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
    navigate('/');
  };

  return (
    <main className="min-h-screen bg-jardin-fondo">
      <div className="flex flex-col md:flex-row md:items-start">
        {/* === SIDEBAR === */}
        <aside className="shrink-0 border-b border-jardin-verde/10 bg-white p-3 md:fixed md:left-0 md:top-0 md:z-30 md:h-screen md:w-64 md:border-b-0 md:border-r">
          <Link to="/" className="mb-4 flex items-center px-2 pt-2" aria-label="MiJardín, ir al inicio">
            <Logo size={34} tono="oscuro" />
          </Link>

          <div className="mb-4 rounded-2xl bg-jardin-fondo p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-jardin-terracota">
              Mi cuenta
            </p>
            <p className="mt-1 truncate font-bold text-jardin-verde">{nombre}</p>
            <p className="truncate text-xs text-[#6B7B70]">{email}</p>
          </div>

          <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {SECCIONES.map(({ id, etiqueta, icono: Icono }) => (
              <button
                key={id}
                onClick={() => irA(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors md:w-full md:text-left ${
                  seccion === id
                    ? 'bg-jardin-verde text-white shadow-md'
                    : 'bg-jardin-fondo text-jardin-verde hover:bg-jardin-crema md:bg-transparent'
                }`}
              >
                <Icono size={17} className="shrink-0" />
                <span className="whitespace-nowrap md:whitespace-normal">{etiqueta}</span>
              </button>
            ))}
          </nav>

          <div className="mt-4 hidden space-y-2 border-t border-jardin-borde pt-4 md:block">
            <Link
              to="/tienda"
              className="flex items-center gap-2 rounded-xl bg-jardin-terracota px-3 py-2.5 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro"
            >
              <Store size={17} /> Ir a la tienda
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl bg-jardin-crema px-3 py-2.5 text-sm font-semibold text-jardin-verde hover:bg-jardin-borde"
            >
              <Home size={17} /> Volver al inicio
            </Link>
            <button
              onClick={cerrarSesion}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#B3431E] hover:bg-jardin-errorBg"
            >
              <LogOut size={17} /> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* === CONTENIDO === */}
        <div className="min-h-screen flex-1 p-4 sm:p-8 md:ml-64">
          <div className="mx-auto max-w-6xl">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-jardin-terracota">
                  MiJardín
                </p>
                <h1 className="mt-1 text-2xl font-bold text-jardin-verde sm:text-3xl">
                  {actual.etiqueta}
                </h1>
                <p className="mt-1 text-sm text-[#6B7B70]">{actual.descripcion}</p>
              </div>
              {/* En móvil las acciones del sidebar no se ven, así que dejamos accesos rápidos aquí */}
              <div className="flex gap-2 md:hidden">
                <Link
                  to="/tienda"
                  className="rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white"
                >
                  Tienda
                </Link>
                <button
                  onClick={cerrarSesion}
                  className="rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-[#B3431E]"
                >
                  Salir
                </button>
              </div>
            </header>

            {seccion === 'resumen' && (
              <div className="space-y-6">
                <section className="rounded-3xl bg-jardin-verde p-7 text-jardin-fondo">
                  <h2 className="text-2xl font-bold sm:text-3xl">
                    Hola, {nombre.split(/\s+/)[0]} 👋
                  </h2>
                  <p className="mt-1 text-sm text-jardin-crema">
                    Este es tu espacio en MiJardín: revisa tus pedidos, tus compras,
                    tus facturas y tus solicitudes, todo en un mismo lugar.
                  </p>
                </section>
                <DashboardResumen rol="Cliente" />
              </div>
            )}

            {seccion === 'pedidos' && <MisPedidos />}
            {seccion === 'compras' && <MisCompras />}
            {seccion === 'facturas' && <FacturasPanel soloLectura />}
            {seccion === 'pqr' && <MisPqr />}
            {seccion === 'perfil' && (
              <section className="max-w-2xl rounded-3xl border border-jardin-borde bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-jardin-fondo text-xl font-bold text-jardin-verde">
                    {nombre.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-jardin-verde">{nombre}</p>
                    <p className="truncate text-sm text-[#6B7B70]">{email}</p>
                  </div>
                </div>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-jardin-borde pb-3">
                    <dt className="text-[#6B7B70]">Nombre completo</dt>
                    <dd className="text-right font-semibold text-jardin-verde">{nombre}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-jardin-borde pb-3">
                    <dt className="text-[#6B7B70]">Correo</dt>
                    <dd className="truncate text-right font-semibold text-jardin-verde">{email || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-jardin-borde pb-3">
                    <dt className="text-[#6B7B70]">Número de cliente</dt>
                    <dd className="text-right font-semibold text-jardin-verde">{idUsuario}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#6B7B70]">Rol</dt>
                    <dd className="text-right font-semibold text-jardin-verde">Cliente</dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    to="/tienda"
                    className="rounded-full bg-jardin-terracota px-5 py-2.5 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro"
                  >
                    Ir a la tienda
                  </Link>
                  <button
                    onClick={cerrarSesion}
                    className="rounded-full bg-jardin-crema px-5 py-2.5 text-sm font-semibold text-[#B3431E] hover:bg-jardin-borde"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default PanelCliente;
