import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, LayoutDashboard, Users, Package, Wrench, ShoppingBag } from 'lucide-react';
import { API_URL } from '../api/config';
import PedidosPanel from '../components/PedidosPanel';

const ROLES = { 1: 'Administrador', 2: 'Cliente', 4: 'Empleado' };
const emptyUserForm = { nombres: '', apellidos: '', tipo_documento: 'CC', numero_documento: '', direccion: '', telefono: '', email: '', password: '', rol_id: 4 };
const emptyItemForm = { nombre: '', descripcion: '', precio: '' };

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'usuarios', label: 'Cuentas', icon: Users },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'servicios', label: 'Servicios', icon: Wrench },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('mijardin_token');
  const [tab, setTab] = useState('dashboard');

  // --- Usuarios ---
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyUserForm);

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

  useEffect(() => { fetchUsers(); fetchProductos(); fetchServicios(); }, []);

  // --- Usuarios CRUD ---
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este usuario permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, { method: 'DELETE', headers: authHeaders });
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

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message);
      setCreating(false);
      setForm(emptyUserForm);
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

  const cuentasActivas = users.filter((u) => u.estado === 'activo').length;

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row">
        {/* === SIDEBAR === */}
        <aside className="w-full shrink-0 rounded-3xl bg-[#FAF3E7] p-3 shadow-xl ring-1 ring-[#23392E]/10 md:w-56">
          <div className="mb-2 px-3 pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9714E]">Panel de</p>
            <h1 className="text-xl font-bold text-[#23392E]">Administración</h1>
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tab === id ? 'bg-[#23392E] text-white shadow-md' : 'bg-white text-[#23392E] hover:bg-[#F1E7D6]'
                }`}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
          </nav>
          <button onClick={() => navigate('/')} className="mt-3 hidden w-full cursor-pointer rounded-xl bg-[#F1E7D6] px-3 py-2.5 text-sm font-semibold text-[#23392E] md:block">
            Volver al inicio
          </button>
        </aside>

        {/* === CONTENIDO === */}
        <div className="flex-1 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#23392E]/10 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-[#23392E]">
              {NAV_ITEMS.find((n) => n.id === tab)?.label}
            </h2>
            <div className="flex gap-2">
              {tab === 'usuarios' && <button onClick={() => setCreating(true)} className="flex cursor-pointer items-center gap-1 rounded-full bg-[#23392E] px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> Agregar usuario</button>}
              {tab === 'productos' && <button onClick={() => setCreatingProduct(true)} className="flex cursor-pointer items-center gap-1 rounded-full bg-[#23392E] px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> Agregar producto</button>}
              {tab === 'servicios' && <button onClick={() => setCreatingServicio(true)} className="flex cursor-pointer items-center gap-1 rounded-full bg-[#23392E] px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> Agregar servicio</button>}
              <button onClick={() => navigate('/')} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E] md:hidden">Inicio</button>
            </div>
          </div>

          {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {tab === 'pedidos' && <PedidosPanel />}

          {/* === DASHBOARD === */}
          {tab === 'dashboard' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Cuentas totales', value: users.length, click: () => setTab('usuarios') },
                { label: 'Cuentas activas', value: cuentasActivas, click: () => setTab('usuarios') },
                { label: 'Productos', value: productos.length, click: () => setTab('productos') },
                { label: 'Servicios', value: servicios.length, click: () => setTab('servicios') },
              ].map((card) => (
                <button
                  key={card.label}
                  onClick={card.click}
                  className="cursor-pointer rounded-2xl bg-[#FAF3E7] p-5 text-left ring-1 ring-[#23392E]/10 transition-colors hover:bg-[#F1E7D6]"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-[#7C9473]">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-[#23392E]">{card.value}</p>
                </button>
              ))}
            </div>
          )}

          {/* === TABLA USUARIOS === */}
          {tab === 'usuarios' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#23392E]/10 text-xs font-bold uppercase tracking-wide text-[#7C9473]">
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
                    <tr key={user.id_usuario} className="border-b border-[#23392E]/5 hover:bg-[#FAF3E7]">
                      <td className="px-3 py-3 font-semibold text-[#23392E]">{user.nombres} {user.apellidos}</td>
                      <td className="px-3 py-3 text-[#5b5b50]">{user.tipo_documento} {user.numero_documento}</td>
                      <td className="px-3 py-3 text-[#5b5b50]">{user.email}</td>
                      <td className="px-3 py-3 text-[#5b5b50]">{ROLES[user.rol_id] || user.rol_id}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleEstado(user)} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${user.estado === 'activo' ? 'bg-[#E7EFE2] text-[#23392E]' : 'bg-red-100 text-red-700'}`}>
                          {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingUser({ id_usuario: user.id_usuario, nombres: user.nombres, apellidos: user.apellidos, estado: user.estado })} className="cursor-pointer text-[#D9714E] hover:text-[#C15E3D]"><Pencil size={18} /></button>
                          <button onClick={() => handleDelete(user.id_usuario)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-[#5b5b50]">No hay usuarios registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* === TABLA PRODUCTOS === */}
          {tab === 'productos' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#23392E]/10 text-xs font-bold uppercase tracking-wide text-[#7C9473]">
                  <tr>
                    <th className="px-3 py-3">Producto</th>
                    <th className="px-3 py-3">Descripción</th>
                    <th className="px-3 py-3">Precio</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((prod) => (
                    <tr key={prod.id_producto} className="border-b border-[#23392E]/5 hover:bg-[#FAF3E7]">
                      <td className="px-3 py-3 font-semibold text-[#23392E]">{prod.nombre}</td>
                      <td className="px-3 py-3 text-[#5b5b50]">{prod.descripcion}</td>
                      <td className="px-3 py-3 font-bold text-[#D9714E]">{money(prod.precio)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingProduct({ ...prod })} className="cursor-pointer text-[#D9714E] hover:text-[#C15E3D]"><Pencil size={18} /></button>
                          <button onClick={() => handleDeleteProduct(prod.id_producto)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!productos.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-[#5b5b50]">No hay productos registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* === TABLA SERVICIOS === */}
          {tab === 'servicios' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#23392E]/10 text-xs font-bold uppercase tracking-wide text-[#7C9473]">
                  <tr>
                    <th className="px-3 py-3">Servicio</th>
                    <th className="px-3 py-3">Descripción</th>
                    <th className="px-3 py-3">Precio</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map((serv) => (
                    <tr key={serv.id_servicio} className="border-b border-[#23392E]/5 hover:bg-[#FAF3E7]">
                      <td className="px-3 py-3 font-semibold text-[#23392E]">{serv.nombre}</td>
                      <td className="px-3 py-3 text-[#5b5b50]">{serv.descripcion}</td>
                      <td className="px-3 py-3 font-bold text-[#D9714E]">{money(serv.precio)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingServicio({ ...serv })} className="cursor-pointer text-[#D9714E] hover:text-[#C15E3D]"><Pencil size={18} /></button>
                          <button onClick={() => handleDeleteServicio(serv.id_servicio)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!servicios.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-[#5b5b50]">No hay servicios registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* === MODAL EDITAR USUARIO === */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/60 p-4" onClick={() => setEditingUser(null)}>
          <form onSubmit={saveEdit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#FAF3E7] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#23392E]">Editar usuario</h2>
            <div className="mt-4 space-y-3">
              <input value={editingUser.nombres} onChange={(e) => setEditingUser((u) => ({ ...u, nombres: e.target.value }))} placeholder="Nombres" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <input value={editingUser.apellidos} onChange={(e) => setEditingUser((u) => ({ ...u, apellidos: e.target.value }))} placeholder="Apellidos" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <select value={editingUser.estado} onChange={(e) => setEditingUser((u) => ({ ...u, estado: e.target.value }))} className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingUser(null)} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E]">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-[#D9714E] px-4 py-2 text-sm font-bold text-white">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL CREAR USUARIO === */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/60 p-4" onClick={() => setCreating(false)}>
          <form onSubmit={createUser} onClick={(e) => e.stopPropagation()} className="grid w-full max-w-lg gap-3 rounded-2xl bg-[#FAF3E7] p-6 shadow-2xl sm:grid-cols-2">
            <h2 className="sm:col-span-2 text-xl font-bold text-[#23392E]">Agregar usuario</h2>
            <input value={form.nombres} onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))} placeholder="Nombres" className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            <input value={form.apellidos} onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))} placeholder="Apellidos" className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            <select value={form.tipo_documento} onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))} className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm">
              <option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="TI">Tarjeta de identidad</option><option value="Pasaporte">Pasaporte</option>
            </select>
            <input value={form.numero_documento} onChange={(e) => setForm((f) => ({ ...f, numero_documento: e.target.value }))} placeholder="Número de documento" className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            <input value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))} placeholder="Dirección" className="sm:col-span-2 rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            <input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="Teléfono" className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Correo electrónico" className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Contraseña (mín. 9 caracteres)" className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required minLength={9} />
            <select value={form.rol_id} onChange={(e) => setForm((f) => ({ ...f, rol_id: Number(e.target.value) }))} className="rounded-xl border-0 bg-white px-4 py-2.5 text-sm">
              <option value={4}>Empleado</option><option value={1}>Administrador</option><option value={2}>Cliente</option>
            </select>
            <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E]">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-[#D9714E] px-4 py-2 text-sm font-bold text-white">Crear</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL EDITAR PRODUCTO === */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/60 p-4" onClick={() => setEditingProduct(null)}>
          <form onSubmit={saveEditProduct} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#FAF3E7] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#23392E]">Editar producto</h2>
            <div className="mt-4 space-y-3">
              <input value={editingProduct.nombre} onChange={(e) => setEditingProduct((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" required />
              <textarea value={editingProduct.descripcion} onChange={(e) => setEditingProduct((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <input type="number" min="0" value={editingProduct.precio} onChange={(e) => setEditingProduct((p) => ({ ...p, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingProduct(null)} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E]">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-[#D9714E] px-4 py-2 text-sm font-bold text-white">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL CREAR PRODUCTO === */}
      {creatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/60 p-4" onClick={() => setCreatingProduct(false)}>
          <form onSubmit={createProduct} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#FAF3E7] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#23392E]">Agregar producto</h2>
            <div className="mt-4 space-y-3">
              <input value={productForm.nombre} onChange={(e) => setProductForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
              <textarea value={productForm.descripcion} onChange={(e) => setProductForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm" />
              <input type="number" min="0" value={productForm.precio} onChange={(e) => setProductForm((f) => ({ ...f, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreatingProduct(false)} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E]">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-[#D9714E] px-4 py-2 text-sm font-bold text-white">Crear</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL EDITAR SERVICIO === */}
      {editingServicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/60 p-4" onClick={() => setEditingServicio(null)}>
          <form onSubmit={saveEditServicio} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#FAF3E7] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#23392E]">Editar servicio</h2>
            <div className="mt-4 space-y-3">
              <input value={editingServicio.nombre} onChange={(e) => setEditingServicio((s) => ({ ...s, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" required />
              <textarea value={editingServicio.descripcion} onChange={(e) => setEditingServicio((s) => ({ ...s, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <input type="number" min="0" value={editingServicio.precio} onChange={(e) => setEditingServicio((s) => ({ ...s, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9714E]" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingServicio(null)} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E]">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-[#D9714E] px-4 py-2 text-sm font-bold text-white">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL CREAR SERVICIO === */}
      {creatingServicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/60 p-4" onClick={() => setCreatingServicio(false)}>
          <form onSubmit={createServicio} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#FAF3E7] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#23392E]">Agregar servicio</h2>
            <div className="mt-4 space-y-3">
              <input value={servicioForm.nombre} onChange={(e) => setServicioForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
              <textarea value={servicioForm.descripcion} onChange={(e) => setServicioForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción" rows="2" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm" />
              <input type="number" min="0" value={servicioForm.precio} onChange={(e) => setServicioForm((f) => ({ ...f, precio: e.target.value }))} placeholder="Precio" className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm" required />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreatingServicio(false)} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E]">Cancelar</button>
              <button type="submit" className="cursor-pointer rounded-full bg-[#D9714E] px-4 py-2 text-sm font-bold text-white">Crear</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;
