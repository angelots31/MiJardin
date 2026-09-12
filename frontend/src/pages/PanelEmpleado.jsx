import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, LayoutDashboard, Package, Wrench, ShoppingBag } from 'lucide-react';
import { API_URL } from '../api/config';
import PedidosPanel from '../components/PedidosPanel';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'servicios', label: 'Servicios', icon: Wrench },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
];

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const emptyItemForm = { nombre: '', descripcion: '', precio: '' };

function PanelEmpleado() {
  const navigate = useNavigate();
  const token = localStorage.getItem('mijardin_token');
  const userName = (localStorage.getItem('mijardin_user_name') || '').split(/\s+/)[0];
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

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
    <main className="min-h-screen bg-[#FAF3E7]">
      <div className="flex flex-col md:flex-row md:items-start">
        {/* === SIDEBAR === */}
        <aside className="shrink-0 border-b border-[#23392E]/10 bg-[#FAF3E7] p-3 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
          <div className="mb-2 px-3 pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9714E]">Panel de</p>
            <h1 className="text-xl font-bold text-[#23392E]">Empleado</h1>
            <p className="mt-1 text-xs text-[#3d3d35]">Hola, {userName}</p>
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
        <div className="min-h-screen flex-1 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#23392E]/10 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-[#23392E]">
              {NAV_ITEMS.find((n) => n.id === tab)?.label}
            </h2>
            <div className="flex gap-2">
              {tab === 'productos' && <button onClick={() => setCreatingProduct(true)} className="flex cursor-pointer items-center gap-1 rounded-full bg-[#23392E] px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> Agregar producto</button>}
              {tab === 'servicios' && <button onClick={() => setCreatingServicio(true)} className="flex cursor-pointer items-center gap-1 rounded-full bg-[#23392E] px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> Agregar servicio</button>}
              <button onClick={() => navigate('/')} className="cursor-pointer rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E] md:hidden">Inicio</button>
            </div>
          </div>

          {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {/* === DASHBOARD === */}
          {tab === 'dashboard' && (
            <>
              <div className="mb-6 rounded-3xl bg-[#23392E] p-7 text-white">
                <h3 className="text-2xl font-bold sm:text-3xl">{saludo}, {userName} 👋</h3>
                <p className="mt-1 text-sm text-white/80">Bienvenido a tu espacio de trabajo en MiJardín. Aquí tienes el resumen general.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Productos', value: productos.length, click: () => setTab('productos') },
                  { label: 'Servicios', value: servicios.length, click: () => setTab('servicios') },
                  { label: 'Pedidos', value: pedidos.length, click: () => setTab('pedidos') },
                  { label: 'Pedidos pendientes', value: pedidos.filter((p) => p.estado === 'Pendiente').length, click: () => setTab('pedidos') },
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
            </>
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
                      <td className="px-3 py-3 text-[#3d3d35]">{prod.descripcion}</td>
                      <td className="px-3 py-3 font-bold text-[#D9714E]">{money(prod.precio)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingProduct({ ...prod })} className="cursor-pointer text-[#D9714E] hover:text-[#C15E3D]"><Pencil size={18} /></button>
                          <button onClick={() => handleDeleteProduct(prod.id_producto)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!productos.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-[#3d3d35]">No hay productos registrados.</td></tr>}
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
                      <td className="px-3 py-3 text-[#3d3d35]">{serv.descripcion}</td>
                      <td className="px-3 py-3 font-bold text-[#D9714E]">{money(serv.precio)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setEditingServicio({ ...serv })} className="cursor-pointer text-[#D9714E] hover:text-[#C15E3D]"><Pencil size={18} /></button>
                          <button onClick={() => handleDeleteServicio(serv.id_servicio)} className="cursor-pointer text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!servicios.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-[#3d3d35]">No hay servicios registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* === PEDIDOS === */}
          {tab === 'pedidos' && <PedidosPanel />}
        </div>
      </div>

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

export default PanelEmpleado;
