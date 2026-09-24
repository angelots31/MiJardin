import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, fechaCorta, pesos } from '../api/client';

/**
 * Sección "Mis pedidos" del panel del cliente.
 *
 * Se usa embebida dentro de PanelCliente, así que no define su propio
 * <main> ni repite el título: el panel ya aporta el encabezado.
 */
function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const datos = await api('/api/v1/pedidos/mis-pedidos');
      setPedidos(datos.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-jardin-errorBorder bg-jardin-errorBg p-4 text-sm text-jardin-terracotaOscuro">
          <span>{error}</span>
          <button onClick={cargar} className="rounded-full bg-white px-4 py-1.5 font-semibold">
            Reintentar
          </button>
        </div>
      )}

      {cargando && (
        <div className="rounded-3xl bg-jardin-fondo p-8 text-center text-[#6B7B70]">
          Cargando tus pedidos…
        </div>
      )}

      {!cargando && !pedidos.length && (
        <div className="rounded-3xl border border-dashed border-jardin-borde bg-white p-10 text-center">
          <div className="text-5xl">🌷</div>
          <h3 className="mt-3 text-xl font-bold text-jardin-verde">Todavía no tienes pedidos</h3>
          <p className="mt-2 text-[#5b5b50]">
            Ve a la tienda, agrega tus flores favoritas y solicita tu primer pedido.
          </p>
          <Link
            to="/tienda"
            className="mt-5 inline-flex rounded-full bg-jardin-terracota px-6 py-2.5 font-bold text-white hover:bg-jardin-terracotaOscuro"
          >
            Ir a la tienda
          </Link>
        </div>
      )}

      {pedidos.map((pedido) => (
        <article
          key={pedido.id_pedido}
          className="rounded-3xl border border-jardin-borde bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-jardin-borde pb-4">
            <div>
              <p className="text-sm font-semibold text-jardin-salvia">Pedido #{pedido.id_pedido}</p>
              <p className="mt-1 text-xs text-[#5b5b50]">{fechaCorta(pedido.fecha_creacion)}</p>
            </div>
            <span className="rounded-full bg-jardin-crema px-4 py-2 text-sm font-bold text-jardin-verde">
              {pedido.estado}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {(pedido.items || []).map((item) => (
              <div
                key={item.id_detalle}
                className="flex items-center justify-between gap-4 rounded-2xl bg-jardin-fondo p-4"
              >
                <div>
                  <p className="font-bold text-jardin-verde">{item.nombre_producto}</p>
                  <p className="text-sm text-[#5b5b50]">
                    Cantidad: {item.cantidad} · {pesos(item.precio)} c/u
                  </p>
                </div>
                <p className="font-bold text-jardin-terracota">{pesos(item.subtotal)}</p>
              </div>
            ))}
          </div>

          {pedido.observaciones && (
            <div className="mt-4 rounded-2xl border border-jardin-mostaza/30 bg-[#FFF8E9] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-jardin-terracota">
                Observaciones / cambios
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5b5b50]">{pedido.observaciones}</p>
            </div>
          )}

          <div className="mt-5 flex justify-end border-t border-jardin-borde pt-4">
            <p className="text-xl font-bold text-jardin-verde">
              Total: <span className="text-jardin-terracota">{pesos(pedido.total)}</span>
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default MisPedidos;
