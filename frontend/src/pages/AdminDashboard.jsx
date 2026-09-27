import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, LayoutDashboard, Users, Package, Wrench, ShoppingBag, BadgeDollarSign, Receipt, MessageCircleQuestion, Home, LogOut, Store } from 'lucide-react';
import { API_URL } from '../api/config';
import Logo from '../components/Logo';
import PedidosPanel from '../components/PedidosPanel';
import DashboardResumen from '../components/dashboard/DashboardResumen';
import VentasPanel from '../components/VentasPanel';
import FacturasPanel from '../components/FacturasPanel';
import PqrPanel from '../components/PqrPanel';
import { validateField, validateRegister, progresoFormulario } from '../components/auth/validation';

const ROLES = { 1: 'Administrador', 2: 'Cliente', 4: 'Empleado' };
const emptyUserForm = { nombres: '', apellidos: '', tipo_documento: 'CC', numero_documento: '', direccion: '', telefono: '', email: '', password: '', confirmPassword: '', rol_id: 4 };
const emptyItemForm = { nombre: '', descripcion: '', precio: '' };

function Campo({ error, className = '', children }) {
  return (
    <div className={className}>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, descripcion: 'El resumen general de MiJardín: ventas, pedidos, facturas y más.' },
  { id: 'usuarios', label: 'Cuentas', icon: Users, descripcion: 'Crea, edita y activa o inactiva las cuentas de los usuarios.' },
  { id: 'productos', label: 'Productos', icon: Package, descripcion: 'Administra el catálogo de productos de la tienda.' },
  { id: 'servicios', label: 'Servicios', icon: Wrench, descripcion: 'Gestiona los servicios que ofrece MiJardín.' },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, descripcion: 'Consulta y actualiza el estado de los pedidos de los clientes.' },
  { id: 'ventas', label: 'Ventas', icon: BadgeDollarSign, descripcion: 'Registra ventas, descarga reportes y revisa el historial.' },
  { id: 'facturas', label: 'Facturas', icon: Receipt, descripcion: 'Busca, revisa y descarga en PDF las facturas emitidas.' },
  { id: 'pqr', label: 'PQR', icon: MessageCircleQuestion, descripcion: 'Atiende las peticiones, quejas, reclamos y sugerencias.' },
];

const CLAVES_SESION = [
  'mijardin_logged', 'mijardin_token', 'mijardin_user', 'mijardin_user_name',
  'mijardin_user_id', 'mijardin_user_role', 'mijardin_user_role_nombre', 'mijardin_remember',
];

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('mijardin_token');
  const userName = localStorage.getItem('mijardin_user_name') || 'Administrador';
  const email = localStorage.getItem('mijardin_user') || '';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const [tab, setTab] = useState('dashboard');

  const cerrarSesion = () => {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
    navigate('/');
  };

  // --- Usuarios ---
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyUserForm);
  const [formErrors, setFormErrors] = useState({});

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

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  // --- Fetch ---
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message || 'No fue posible cargar los usuarios.');
      setUsers(data.data);
    } catch (err) { setError(err.message); }
  };

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

  useEffect(() => {
    (async () => {
      await Promise.all([fetchUsers(), fetchProductos(), fetchServicios()]);
    })();
  }, []);

  // --- Usuarios CRUD ---
  const handleDelete = async (user) => {
    // Una cuenta activa no se elimina directamente: primero hay que
    // inactivarla, para no dejar sin acceso a alguien que aún la usa.
    if (user.estado === 'activo') {
      setError('No puedes eliminar una cuenta activa. Márcala como inactiva antes de eliminarla.');
      return;
    }
    if (!window.confirm('¿Eliminar este usuario permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users/${user.id_usuario}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      fetchUsers();
    } catch (err) { setError(err.message); }
  };

  const toggleEstado = async (user) => {
    const nuevoEstado = user.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users/${user.id_usuario}/estado`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      fetchUsers();
    } catch (err) { setError(err.message); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users/${editingUser.id_usuario}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ nombres: editingUser.nombres, apellidos: editingUser.apellidos, estado: editingUser.estado }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      setEditingUser(null);
      fetchUsers();
    } catch (err) { setError(err.message); }
  };

  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    const siguiente = { ...form, [name]: name === 'rol_id' ? Number(value) : value };
    setForm(siguiente);
    setFormErrors((prev) => {
      const next = { ...prev, [name]: validateField(name, value, siguiente) };
      // Al cambiar la contraseña se vuelve a comparar la confirmación, igual
      // que en el modal de registro público.
      if (name === 'password' && siguiente.confirmPassword) {
        next.confirmPassword = validateField('confirmPassword', siguiente.confirmPassword, siguiente);
      }
      return next;
    });
  };

  const createUser = async (e) => {
    e.preventDefault();
    const nextErrors = validateRegister(form);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      // Se envía solo lo que espera el backend: la confirmación es una
      // regla del frontend y no debe viajar en el payload.
      const payload = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        direccion: form.direccion,
        telefono: form.telefono,
        email: form.email,
        password: form.password,
        rol_id: form.rol_id,
      };
      const res = await fetch(`${API_URL}/api/v1/admin/users`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      setCreating(false);
      setForm(emptyUserForm);
      setFormErrors({});
      fetchUsers();
    } catch (err) { setError(err.message); }
  };

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

  const { completados, total } = progresoFormulario(form);
  const porcentaje = Math.round((completados / total) * 100);
  const inputCls = (campo) =>
    `rounded-xl border ${formErrors[campo] ? 'border-red-500' : 'border-jardin-borde'} bg-jardin-fondo px-4 py-2.5 text-sm`;

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
                  MiJardín · Administración
                </p>
                <h1 className="mt-1 text-2xl font-bold text-jardin-verde sm:text-3xl">
                  {NAV_ITEMS.find((n) => n.id === tab)?.label}
                </h1>
                <p className="mt-1 text-sm text-[#6B7B70]">
                  {NAV_ITEMS.find((n) => n.id === tab)?.descripcion}
                </p>
              </div>
              <div className="flex gap-2">
                {tab === 'usuarios' && <button onClick={() => { setFormErrors({}); setCreating(true); }} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-jardin-terracotaOscuro"><Plus size={16} /> Agregar usuario</button>}
                {tab === 'productos' && <button onClick={() => setCreatingProduct(true)} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-jardin-terracotaOscuro"><Plus size={16} /> Agregar producto</button>}
                {tab === 'servicios' && <button onClick={() => setCreatingServicio(true)} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-jardin-terracotaOscuro"><Plus size={16} /> Agregar servicio</button>}
                <Link to="/tienda" className="rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white md:hidden">Tienda</Link>
                <button onClick={() => navigate('/')} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde md:hidden">Inicio</button>
                <button onClick={cerrarSesion} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-[#B3431E] md:hidden">Salir</button>
              </div>
            </header>

            {error && <div className="mb-4 rounded-2xl border border-jardin-errorBorder bg-jardin-errorBg p-3 text-sm text-[#B3431E]">{error}</div>}

          {tab === 'pedidos' && (
            <div className="rounded-3xl border border-jardin-borde bg-white p-5 shadow-sm sm:p-6">
              <PedidosPanel />
            </div>
          )}
          {tab === 'ventas' && <VentasPanel />}
          {tab === 'facturas' && <FacturasPanel />}
          {tab === 'pqr' && <PqrPanel />}

          {/* === BIENVENIDA === */}
          {tab === 'dashboard' && (
            <div className="mb-6 rounded-3xl bg-jardin-verde p-7 text-jardin-fondo">
              <h3 className="text-2xl font-bold sm:text-3xl">{saludo}, {userName.split(/\s+/)[0]} 👋</h3>
              <p className="mt-1 text-sm text-jardin-crema">Bienvenido al panel de administración de MiJardín. Aquí tienes el resumen general.</p>
            </div>
          )}

          {/* === DASHBOARD === */}
          {tab === 'dashboard' && <DashboardResumen rol="Administrador" />}

          {/* === TABLA USUARIOS === */}
          {tab === 'usuarios' && (
            <div className="overflow-x-auto rounded-3xl border border-jardin-borde bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-jardin-borde bg-jardin-fondo text-xs font-bold uppercase tracking-wide text-jardin-salvia">
                  <tr>
                    <th className="px-3 py-3">Nombre</th>
                    <th className="px-3 py-3">Documento</th>
                    <th className="px-3 py-3">Correo</th>
                    <th className="px-3 py-3">Rol</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id_usuario} className="border-b border-jardin-borde/60 hover:bg-jardin-fondo">
                      <td className="px-3 py-3 font-semibold text-jardin-verde">{user.nombres} {user.apellidos}</td>
                      <td className="px-3 py-3 text-[#6B7B70]">{user.tipo_documento} {user.numero_documento}</td>
                      <td className="px-3 py-3 text-[#6B7B70]">{user.email}</td>
                      <td className="px-3 py-3 text-[#6B7B70]">{ROLES[user.rol_id] || user.rol_id}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleEstado(user)} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${user.estado === 'activo' ? 'bg-jardin-successBg text-jardin-success' : 'bg-red-100 text-red-700'}`}>
                          {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingUser({ id_usuario: user.id_usuario, nombres: user.nombres, apellidos: user.apellidos, estado: user.estado })} className="cursor-pointer text-jardin-terracota hover:text-jardin-terracotaOscuro"><Pencil size={18} /></button>
                          <button onClick={() => handleDelete(user)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-[#6B7B70]">No hay usuarios registrados.</td></tr>}
                </tbody>
              </table>
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
          </div>
        </div>
      </div>

      {/* === MODAL EDITAR USUARIO === */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-jardin-verdeOscuro/60 p-4 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
          <form onSubmit={saveEdit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-jardin-borde">
            <h2 className="text-xl font-bold text-jardin-verde">Editar usuario</h2>
            <div className="mt-4 space-y-3">
              <input value={editingUser.nombres} onChange={(e) => setEditingUser((u) => ({ ...u, nombres: e.target.value }))} placeholder="Nombres" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" />
              <input value={editingUser.apellidos} onChange={(e) => setEditingUser((u) => ({ ...u, apellidos: e.target.value }))} placeholder="Apellidos" className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-jardin-terracota" />
              <select value={editingUser.estado} onChange={(e) => setEditingUser((u) => ({ ...u, estado: e.target.value }))} className="w-full rounded-xl border border-jardin-borde bg-jardin-fondo px-4 py-2.5 text-sm">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUser(null)} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde hover:bg-jardin-borde">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL CREAR USUARIO === */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-jardin-verdeOscuro/60 p-4 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <form onSubmit={createUser} noValidate onClick={(e) => e.stopPropagation()} className="grid w-full max-w-lg gap-3 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-jardin-borde sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <h2 className="text-xl font-bold text-jardin-verde">Agregar usuario</h2>
              <span className="whitespace-nowrap rounded-full bg-jardin-fondo px-3 py-1 text-xs font-bold text-jardin-verde">
                {completados} de {total} datos
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-jardin-fondo sm:col-span-2" role="progressbar" aria-valuenow={completados} aria-valuemin={0} aria-valuemax={total} aria-label="Datos completados">
              <div className="h-full rounded-full bg-jardin-verde transition-all duration-300" style={{ width: `${porcentaje}%` }} />
            </div>

            {Object.values(formErrors).some((mensaje) => mensaje) && (
              <div className="rounded-xl border border-jardin-errorBorder bg-jardin-errorBg px-3 py-2 text-xs font-medium text-[#B3431E] sm:col-span-2">
                Revisa los campos marcados antes de continuar.
              </div>
            )}

            <Campo error={formErrors.nombres}>
              <input name="nombres" value={form.nombres} onChange={handleChangeForm} placeholder="Nombres" maxLength={40} className={inputCls('nombres')} />
            </Campo>
            <Campo error={formErrors.apellidos}>
              <input name="apellidos" value={form.apellidos} onChange={handleChangeForm} placeholder="Apellidos" maxLength={40} className={inputCls('apellidos')} />
            </Campo>
            <Campo error={formErrors.tipo_documento}>
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChangeForm} className={inputCls('tipo_documento')}>
                <option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="TI">Tarjeta de identidad</option><option value="Pasaporte">Pasaporte</option>
              </select>
            </Campo>
            <Campo error={formErrors.numero_documento}>
              <input name="numero_documento" value={form.numero_documento} onChange={handleChangeForm} placeholder="Número de documento" maxLength={12} className={inputCls('numero_documento')} />
            </Campo>
            <Campo error={formErrors.direccion} className="sm:col-span-2">
              <input name="direccion" value={form.direccion} onChange={handleChangeForm} placeholder="Dirección" maxLength={100} className={inputCls('direccion')} />
            </Campo>
            <Campo error={formErrors.telefono}>
              <input name="telefono" value={form.telefono} onChange={handleChangeForm} placeholder="Teléfono" maxLength={10} className={inputCls('telefono')} />
            </Campo>
            <Campo error={formErrors.email}>
              <input type="email" name="email" value={form.email} onChange={handleChangeForm} placeholder="Correo electrónico" maxLength={80} className={inputCls('email')} />
            </Campo>
            <Campo error={formErrors.password}>
              <input type="password" name="password" value={form.password} onChange={handleChangeForm} placeholder="Contraseña (9-20 caracteres)" maxLength={20} minLength={9} className={inputCls('password')} />
            </Campo>
            <Campo error={formErrors.confirmPassword}>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChangeForm} placeholder="Confirmar contraseña" maxLength={20} minLength={9} className={inputCls('confirmPassword')} />
            </Campo>
            <Campo error={formErrors.rol_id}>
              <select name="rol_id" value={form.rol_id} onChange={handleChangeForm} className={inputCls('rol_id')}>
                <option value={4}>Empleado</option><option value={1}>Administrador</option><option value={2}>Cliente</option>
              </select>
            </Campo>
            <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setCreating(false); setFormErrors({}); }} className="cursor-pointer rounded-full bg-jardin-crema px-4 py-2 text-sm font-semibold text-jardin-verde hover:bg-jardin-borde">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-jardin-terracota px-4 py-2 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro">Crear</button>
            </div>
          </form>
        </div>
      )}

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

export default AdminDashboard;
