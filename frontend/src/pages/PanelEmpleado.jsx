import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, LayoutDashboard, Package, Wrench, ShoppingBag, Clock, Home, LogOut, Store } from 'lucide-react';
import { API_URL } from '../api/config';
import Logo from '../components/Logo';
import PedidosPanel from '../components/PedidosPanel';
import DashboardResumen from '../components/dashboard/DashboardResumen';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, descripcion: 'El resumen general de tu trabajo en MiJardín.' },
  { id: 'productos', label: 'Productos', icon: Package, descripcion: 'Consulta, crea y actualiza los productos de la tienda.' },
  { id: 'servicios', label: 'Servicios', icon: Wrench, descripcion: 'Gestiona los servicios que ofrece MiJardín.' },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, descripcion: 'Revisa y actualiza el estado de los pedidos de los clientes.' },
];

const CLAVES_SESION = [
  'mijardin_logged', 'mijardin_token', 'mijardin_user', 'mijardin_user_name',
  'mijardin_user_id', 'mijardin_user_role', 'mijardin_user_role_nombre', 'mijardin_remember',
];

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const emptyItemForm = { nombre: '', descripcion: '', precio: '' };

function PanelEmpleado() {
  const navigate = useNavigate();
  const token = localStorage.getItem('mijardin_token');
  const userName = localStorage.getItem('mijardin_user_name') || 'Empleado';
  const email = localStorage.getItem('mijardin_user') || '';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const cerrarSesion = () => {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
    navigate('/');
  };

  const [tab, setTab] = useState('dashboard');
  const [error, setError] = useState('');

  // --- Pedidos (para resumen) ---
  const [pedidos, setPedidos] = useState([]);

  // --- Productos ---
  const [productos, setProductos] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productForm, setProductForm] = useState(emptyItemForm);

  // --- Servicios ---
  const [servicios, setServicios] = useState([]);
  const [editingServicio, setEditingServicio] = useState(null);
  const [creatingServicio, setCreatingServicio] = useState(false);
  const [servicioForm, setServicioForm] = useState(emptyItemForm);

  // --- Fetch ---
  const fetchProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/productos`);
      const data = await res.json();
      if (data.success) setProductos(data.data);
    } catch (err) { setError(err.message); }
  };

  const fetchServicios = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/servicios`);
      const data = await res.json();
      if (data.success) setServicios(data.data);
    } catch (err) { setError(err.message); }
  };

  const fetchPedidos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/pedidos`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) setPedidos(data.data || []);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { fetchProductos(); fetchServicios(); fetchPedidos(); }, []);

  // --- Productos CRUD ---
  const createProduct = async (e) => {
    e.preventDefault();
    if (!productForm.nombre || !productForm.precio) { setError('Completa nombre y precio.'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/productos`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ nombre: productForm.nombre, descripcion: productForm.descripcion, precio: Number(productForm.precio), imagen: '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      setCreatingProduct(false);
      setProductForm(emptyItemForm);
      fetchProductos();
    } catch (err) { setError(err.message); }
  };

  const saveEditProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/v1/productos/${editingProduct.id_producto}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ nombre: editingProduct.nombre, descripcion: editingProduct.descripcion, precio: Number(editingProduct.precio), imagen: editingProduct.imagen || '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      setEditingProduct(null);
      fetchProductos();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar este producto permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/productos/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      fetchProductos();
    } catch (err) { setError(err.message); }
  };

  // --- Servicios CRUD ---
  const createServicio = async (e) => {
    e.preventDefault();
    if (!servicioForm.nombre || !servicioForm.precio) { setError('Completa nombre y precio.'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/servicios`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ nombre: servicioForm.nombre, descripcion: servicioForm.descripcion, precio: Number(servicioForm.precio), imagen: '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      setCreatingServicio(false);
      setServicioForm(emptyItemForm);
      fetchServicios();
    } catch (err) { setError(err.message); }
  };

  const saveEditServicio = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/v1/servicios/${editingServicio.id_servicio}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ nombre: editingServicio.nombre, descripcion: editingServicio.descripcion, precio: Number(editingServicio.precio), imagen: editingServicio.imagen || '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      setEditingServicio(null);
      fetchServicios();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteServicio = async (id) => {
    if (!window.confirm('¿Eliminar este servicio permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/servicios/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      fetchServicios();
    } catch (err) { setError(err.message); }
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
            <p className="mt-1 truncate font-bold text-jardin-verde">{userName}</p>
            <p className="truncate text-xs text-[#6B7B70]">{email}</p>
          </div>

          <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors md:w-full md:text-left ${
                  tab === id
                    ? 'bg-jardin-verde text-white shadow-md'
                    : 'bg-jardin-fondo text-jardin-verde hover:bg-jardin-crema md:bg-transparent'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="whitespace-nowrap md:whitespace-normal">{label}</span>
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
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#B3431E] hover:bg-jardin-errorBg"
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
                  MiJardín · Panel de empleado
                </p>
                <h1 className="mt-1 text-2xl font-bold text-jardin-verde sm:text-3xl">
                  {NAV_ITEMS.find((n) => n.id === tab)?.label}
                </h1>
                <p className="mt-1 text-sm text-[#6B7B70]">
                  {NAV_ITEMS.find((n) => n.id === tab)?.descripcion}
                </p>
              </div>
              <div className="flex gap-2">
                {tab === 'productos' && <button onClick={() => setCreatingProduct(true)} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-jardin-terracotaOscuro"><Plus size={16} /> Agregar producto</button>}
                {tab === 'servicios' && <button onClick={() => setCreatingServicio(true)} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-jardin-terracotaOscuro"><Plus size={16} /> Agregar servicio</button>}
                <Link to="/tienda" className="rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white md:hidden">Tienda</Link>
                <button onClick={() => navigate('/')} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde md:hidden">Inicio</button>
                <button onClick={cerrarSesion} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-[#B3431E] md:hidden">Salir</button>
              </div>
            </header>

            {error && <div className="mb-4 rounded-2xl border border-jardin-errorBorder bg-jardin-errorBg p-3 text-sm text-[#B3431E]">{error}</div>}

          {/* === DASHBOARD === */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-jardin-verde p-7 text-jardin-fondo">
                <h3 className="text-2xl font-bold sm:text-3xl">{saludo}, {userName.split(/\s+/)[0]} 👋</h3>
                <p className="mt-1 text-sm text-jardin-crema">Bienvenido a tu espacio de trabajo en MiJardín. Aquí tienes el resumen general.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Productos', value: productos.length, icon: Package, barra: 'bg-jardin-verde', color: 'text-jardin-verde', click: () => setTab('productos') },
                  { label: 'Servicios', value: servicios.length, icon: Wrench, barra: 'bg-jardin-salvia', color: 'text-[#5F7657]', click: () => setTab('servicios') },
                  { label: 'Pedidos', value: pedidos.length, icon: ShoppingBag, barra: 'bg-jardin-mostaza', color: 'text-[#B57F24]', click: () => setTab('pedidos') },
                  { label: 'Pedidos pendientes', value: pedidos.filter((p) => p.estado === 'Pendiente').length, icon: Clock, barra: 'bg-jardin-terracota', color: 'text-jardin-terracotaOscuro', click: () => setTab('pedidos') },
                ].map(({ label, value, icon: Icon, barra, color, click }) => (
                  <button
                    key={label}
                    onClick={click}
                    className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-jardin-borde bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                  >
                    <span className={`absolute left-0 top-0 h-full w-1 ${barra}`} aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <div className="min-w-0">
                        <p className="text-sm text-[#6B7B70]">{label}</p>
                        <p className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</p>
                      </div>
                      <Icon size={22} className="shrink-0 text-jardin-salvia" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>

              {/* === ESTADÍSTICAS Y GRÁFICOS === */}
              <DashboardResumen rol="Empleado" />
            </div>
          )}

          {/* === TABLA PRODUCTOS === */}
          {tab === 'productos' && (
            <div className="overflow-x-auto rounded-3xl border border-jardin-borde bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-jardin-borde bg-jardin-fondo text-xs font-bold uppercase tracking-wide text-jardin-salvia">
                  <tr>
                    <th className="px-3 py-3">Producto</th>
                    <th className="px-3 py-3">Descripción</th>
                    <th className="px-3 py-3">Precio</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((prod) => (
                    <tr key={prod.id_producto} className="border-b border-jardin-borde/60 hover:bg-jardin-fondo">
                      <td className="px-3 py-3 font-semibold text-jardin-verde">{prod.nombre}</td>
                      <td className="px-3 py-3 text-[#6B7B70]">{prod.descripcion}</td>
                      <td className="px-3 py-3 font-bold text-jardin-terracota">{money(prod.precio)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingProduct({ ...prod })} className="cursor-pointer text-jardin-terracota hover:text-jardin-terracotaOscuro"><Pencil size={18} /></button>
                          <button onClick={() => handleDeleteProduct(prod.id_producto)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!productos.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-[#6B7B70]">No hay productos registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* === TABLA SERVICIOS === */}
          {tab === 'servicios' && (
            <div className="overflow-x-auto rounded-3xl border border-jardin-borde bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-jardin-borde bg-jardin-fondo text-xs font-bold uppercase tracking-wide text-jardin-salvia">
                  <tr>
                    <th className="px-3 py-3">Servicio</th>
                    <th className="px-3 py-3">Descripción</th>
                    <th className="px-3 py-3">Precio</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map((serv) => (
                    <tr key={serv.id_servicio} className="border-b border-jardin-borde/60 hover:bg-jardin-fondo">
                      <td className="px-3 py-3 font-semibold text-jardin-verde">{serv.nombre}</td>
                      <td className="px-3 py-3 text-[#6B7B70]">{serv.descripcion}</td>
                      <td className="px-3 py-3 font-bold text-jardin-terracota">{money(serv.precio)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingServicio({ ...serv })} className="cursor-pointer text-jardin-terracota hover:text-jardin-terracotaOscuro"><Pencil size={18} /></button>
                          <button onClick={() => handleDeleteServicio(serv.id_servicio)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!servicios.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-[#6B7B70]">No hay servicios registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* === PEDIDOS === */}
          {tab === 'pedidos' && (
            <div className="rounded-3xl border border-jardin-borde bg-white p-5 shadow-sm sm:p-6">
              <PedidosPanel />
            </div>
          )}
          </div>
        </div>
      </div>

      {/* === MODAL EDITAR PRODUCTO === */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-jardin-verdeOscuro/60 p-4 backdrop-blur-sm" onClick={() => setEditingProduct(null)}>
          <form onSubmit={saveEditProduct} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-jardin-borde">
            <h2 className="text-xl font-bold text-jardin-verde">Editar producto</h2>
            <div className="mt-4 space-y-3">
              <input value={editingProduct.nombre} onChange={(e) => setEditingProduct((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" required />
              <textarea value={editingProduct.descripcion} onChange={(e) => setEditingProduct((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" />
              <input type="number" min="0" value={editingProduct.precio} onChange={(e) => setEditingProduct((p) => ({ ...p, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingProduct(null)} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde hover:bg-jardin-borde">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL CREAR PRODUCTO === */}
      {creatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-jardin-verdeOscuro/60 p-4 backdrop-blur-sm" onClick={() => setCreatingProduct(false)}>
          <form onSubmit={createProduct} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-jardin-borde">
            <h2 className="text-xl font-bold text-jardin-verde">Agregar producto</h2>
            <div className="mt-4 space-y-3">
              <input value={productForm.nombre} onChange={(e) => setProductForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm" required />
              <textarea value={productForm.descripcion} onChange={(e) => setProductForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm" />
              <input type="number" min="0" value={productForm.precio} onChange={(e) => setProductForm((f) => ({ ...f, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreatingProduct(false)} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde hover:bg-jardin-borde">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro">Crear</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL EDITAR SERVICIO === */}
      {editingServicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-jardin-verdeOscuro/60 p-4 backdrop-blur-sm" onClick={() => setEditingServicio(null)}>
          <form onSubmit={saveEditServicio} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-jardin-borde">
            <h2 className="text-xl font-bold text-jardin-verde">Editar servicio</h2>
            <div className="mt-4 space-y-3">
              <input value={editingServicio.nombre} onChange={(e) => setEditingServicio((s) => ({ ...s, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" required />
              <textarea value={editingServicio.descripcion} onChange={(e) => setEditingServicio((s) => ({ ...s, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" />
              <input type="number" min="0" value={editingServicio.precio} onChange={(e) => setEditingServicio((s) => ({ ...s, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingServicio(null)} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde hover:bg-jardin-borde">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL CREAR SERVICIO === */}
      {creatingServicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-jardin-verdeOscuro/60 p-4 backdrop-blur-sm" onClick={() => setCreatingServicio(false)}>
          <form onSubmit={createServicio} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-jardin-borde">
            <h2 className="text-xl font-bold text-jardin-verde">Agregar servicio</h2>
            <div className="mt-4 space-y-3">
              <input value={servicioForm.nombre} onChange={(e) => setServicioForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm" required />
              <textarea value={servicioForm.descripcion} onChange={(e) => setServicioForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm" />
              <input type="number" min="0" value={servicioForm.precio} onChange={(e) => setServicioForm((f) => ({ ...f, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreatingServicio(false)} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde hover:bg-jardin-borde">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro">Crear</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default PanelEmpleado;
