import { useEffect, useState } from 'react';
import { API_URL } from '../api/config';

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    const token = localStorage.getItem('mijardin_token');
    try {
      const res = await fetch(`${API_URL}/api/v1/pedidos/mis-pedidos`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || 'No fue posible cargar tus pedidos.');
      setPedidos(data.data || []);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D9714E]">MiJardín</p>
          <h1 className="mt-2 text-3xl font-bold text-[#23392E]">Mis pedidos</h1>
          <p className="mt-2 text-[#5b5b50]">Consulta tus pedidos y revisa cualquier cambio realizado por el equipo.</p>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading && <div className="rounded-3xl bg-white p-8 text-center shadow-sm">Cargando pedidos...</div>}
        {!loading && !pedidos.length && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-[#23392E]/10">
            <div className="text-5xl">🌷</div>
            <h2 className="mt-3 text-xl font-bold text-[#23392E]">Todavía no tienes pedidos</h2>
            <p className="mt-2 text-[#5b5b50]">Ve a la tienda, agrega tus flores favoritas y solicita tu primer pedido.</p>
          </div>
        )}

        <div className="space-y-5">
          {pedidos.map((pedido) => (
            <article key={pedido.id_pedido} className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-[#23392E]/10 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#23392E]/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-[#7C9473]">Pedido #{pedido.id_pedido}</p>
                  <p className="mt-1 text-xs text-[#5b5b50]">{new Date(pedido.fecha_creacion).toLocaleString('es-CO')}</p>
                </div>
                <span className="rounded-full bg-[#F1E7D6] px-4 py-2 text-sm font-bold text-[#23392E]">{pedido.estado}</span>
              </div>

              <div className="mt-5 space-y-3">
                {pedido.items.map((item) => (
                  <div key={item.id_detalle} className="flex items-center justify-between gap-4 rounded-2xl bg-[#FAF3E7] p-4">
                    <div>
                      <p className="font-bold text-[#23392E]">{item.nombre_producto}</p>
                      <p className="text-sm text-[#5b5b50]">Cantidad: {item.cantidad} · {money(item.precio)} c/u</p>
                    </div>
                    <p className="font-bold text-[#D9714E]">{money(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              {pedido.observaciones && (
                <div className="mt-4 rounded-2xl border border-[#E8AC4F]/30 bg-[#FFF8E9] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#D9714E]">Observaciones / cambios</p>
                  <p className="mt-1 text-sm leading-6 text-[#5b5b50]">{pedido.observaciones}</p>
                </div>
              )}

              <div className="mt-5 flex justify-end border-t border-[#23392E]/10 pt-4">
                <p className="text-xl font-bold text-[#23392E]">Total: <span className="text-[#D9714E]">{money(pedido.total)}</span></p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default MisPedidos;
