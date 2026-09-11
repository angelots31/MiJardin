import { useEffect, useState } from 'react';
import { Pencil, RefreshCw, Trash2, Plus } from 'lucide-react';
import { API_URL } from '../api/config';

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const ESTADOS = ['Pendiente', 'En revisión', 'Modificado', 'Confirmado', 'En preparación', 'En camino', 'Entregado', 'Cancelado'];

function PedidosPanel() {
  const token = localStorage.getItem('mijardin_token');
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [itemsEditados, setItemsEditados] = useState([]);
  const [estado, setEstado] = useState('Pendiente');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [resPedidos, resProductos] = await Promise.all([
        fetch(`${API_URL}/api/v1/pedidos`, { headers: authHeaders }),
        fetch(`${API_URL}/api/v1/productos`),
      ]);
      const pedidosData = await resPedidos.json();
      const productosData = await resProductos.json();
      if (!resPedidos.ok || !pedidosData.success) throw new Error(pedidosData.detail || 'No fue posible cargar los pedidos.');
      setPedidos(pedidosData.data || []);
      if (productosData.success) setProductos(productosData.data || []);
      setError('');
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { cargar(); }, []);

  const abrir = (pedido) => {
    setPedidoSeleccionado(pedido);
    setItemsEditados(pedido.items.map((item) => ({ ...item })));
    setEstado(pedido.estado);
    setObservaciones(pedido.observaciones || '');
    setError('');
  };

  const cambiarCantidad = (index, delta) => {
    setItemsEditados((items) => items.map((item, i) => i === index ? { ...item, cantidad: Math.max(1, Number(item.cantidad) + delta) } : item));
  };

  const agregarProducto = (e) => {
    const id = Number(e.target.value);
    if (!id) return;
    const producto = productos.find((p) => Number(p.id_producto) === id);
    if (!producto) return;
    setItemsEditados((items) => {
      const index = items.findIndex((item) => Number(item.id_producto) === id);
      if (index >= 0) return items.map((item, i) => i === index ? { ...item, cantidad: Number(item.cantidad) + 1 } : item);
      return [...items, { id_producto: producto.id_producto, nombre_producto: producto.nombre, cantidad: 1, precio: Number(producto.precio) }];
    });
    e.target.value = '';
  };

  const quitar = (index) => setItemsEditados((items) => items.filter((_, i) => i !== index));

  const total = itemsEditados.reduce((sum, item) => sum + Number(item.precio) * Number(item.cantidad), 0);

  const guardar = async (e) => {
    e.preventDefault();
    if (!itemsEditados.length) { setError('El pedido debe conservar al menos un producto.'); return; }
    setGuardando(true);
    try {
      const items = itemsEditados.map((item) => ({
        id_producto: item.id_producto ? Number(item.id_producto) : null,
        nombre_producto: item.nombre_producto,
        cantidad: Number(item.cantidad),
        precio: Number(item.precio),
      }));
      const res = await fetch(`${API_URL}/api/v1/pedidos/${pedidoSeleccionado.id_pedido}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ items, estado, observaciones }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message || 'No fue posible actualizar el pedido.');
      setPedidoSeleccionado(null);
      await cargar();
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#3d3d35]">Consulta y modifica los pedidos realizados por los clientes.</p>
        </div>
        <button onClick={cargar} className="flex cursor-pointer items-center gap-2 rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-semibold text-[#23392E]"><RefreshCw size={16} /> Actualizar</button>
      </div>
      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        {pedidos.map((pedido) => (
          <div key={pedido.id_pedido} className="rounded-2xl border border-[#23392E]/10 bg-[#FAF3E7] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[#23392E]">Pedido #{pedido.id_pedido}</p>
                <p className="mt-1 text-sm font-medium text-[#23392E]">Cliente: {pedido.nombres} {pedido.apellidos}</p>
                <p className="text-sm text-[#3d3d35]">{pedido.email} · {pedido.telefono}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#23392E]">{pedido.estado}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {pedido.items.map((item) => <div key={item.id_detalle} className="rounded-xl bg-white p-3 text-sm"><span className="font-bold text-[#23392E]">{item.nombre_producto}</span> <span className="text-[#3d3d35]">· {item.cantidad} × {money(item.precio)}</span></div>)}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#23392E]/10 pt-4">
              <p className="font-bold text-[#D9714E]">Total: {money(pedido.total)}</p>
              <button onClick={() => abrir(pedido)} className="flex cursor-pointer items-center gap-2 rounded-full bg-[#23392E] px-4 py-2 text-sm font-bold text-white"><Pencil size={16} /> Modificar pedido</button>
            </div>
          </div>
        ))}
        {!pedidos.length && <div className="rounded-2xl bg-[#FAF3E7] p-8 text-center text-sm text-[#3d3d35]">No hay pedidos registrados.</div>}
      </div>

      {pedidoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/60 p-4" onClick={() => !guardando && setPedidoSeleccionado(null)}>
          <form onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-[#FAF3E7] p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-2xl font-bold text-[#23392E]">Editar pedido #{pedidoSeleccionado.id_pedido}</h2><p className="mt-1 text-sm font-medium text-[#23392E]">{pedidoSeleccionado.nombres} {pedidoSeleccionado.apellidos}</p></div>
              <button type="button" onClick={() => setPedidoSeleccionado(null)} className="cursor-pointer text-2xl text-[#23392E]">×</button>
            </div>

            <div className="mt-5 space-y-3">
              {itemsEditados.map((item, index) => (
                <div key={`${item.id_producto || 'custom'}-${index}`} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4">
                  <div className="min-w-0 flex-1"><p className="font-bold text-[#23392E]">{item.nombre_producto}</p><p className="text-sm text-[#3d3d35]">{money(item.precio)} c/u</p></div>
                  <div className="flex items-center gap-2"><button type="button" onClick={() => cambiarCantidad(index, -1)} className="h-8 w-8 cursor-pointer rounded-full bg-[#F1E7D6]">−</button><span className="w-8 text-center font-bold">{item.cantidad}</span><button type="button" onClick={() => cambiarCantidad(index, 1)} className="h-8 w-8 cursor-pointer rounded-full bg-[#F1E7D6]">+</button></div>
                  <button type="button" onClick={() => quitar(index)} className="cursor-pointer rounded-full p-2 text-red-500 hover:bg-red-50"><Trash2 size={17} /></button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2"><Plus size={17} className="text-[#D9714E]" /><select onChange={agregarProducto} defaultValue="" className="flex-1 rounded-xl border-0 bg-white px-4 py-2.5 text-sm"><option value="">Agregar producto...</option>{productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre} — {money(p.precio)}</option>)}</select></div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#7C9473]">Estado</label><select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm">{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select></div>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#7C9473]">Total</label><div className="rounded-xl bg-white px-4 py-2.5 font-bold text-[#D9714E]">{money(total)}</div></div>
            </div>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows="3" placeholder="Observaciones o explicación del cambio para el cliente" className="mt-3 w-full rounded-xl border-0 bg-white px-4 py-3 text-sm" />
            <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={guardando} onClick={() => setPedidoSeleccionado(null)} className="cursor-pointer rounded-full bg-[#F1E7D6] px-5 py-2.5 text-sm font-semibold text-[#23392E]">Cancelar</button><button type="submit" disabled={guardando} className="cursor-pointer rounded-full bg-[#D9714E] px-5 py-2.5 text-sm font-bold text-white">{guardando ? 'Guardando...' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

export default PedidosPanel;
