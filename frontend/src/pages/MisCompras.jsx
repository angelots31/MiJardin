import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, fechaCorta, pesos } from '../api/client';

/**
 * Sección "Mis compras" del panel del cliente.
 *
 * Lista las ventas (compras ya confirmadas) con sus ítems. Las facturas
 * descargables viven en otra sección del panel, así que aquí solo se
 * anuncia cuál existe. El backend ya limita las ventas al id del token.
 */
function MisCompras() {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const datos = await api('/api/v1/ventas');
      setVentas(datos.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const totalComprado = ventas
    .filter((v) => v.estado !== 'Anulada')
    .reduce((suma, v) => suma + Number(v.total || 0), 0);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-2xl border border-jardin-errorBorder bg-jardin-errorBg px-4 py-3 text-sm text-jardin-terracotaOscuro">
          {error}
        </p>
      )}

      {!cargando && ventas.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-jardin-fondo px-5 py-4 text-sm">
          <span className="text-[#6B7B70]">
            <strong className="text-jardin-verde">{ventas.length}</strong> compras registradas
          </span>
          <span className="text-[#6B7B70]">
            Total comprado:{' '}
            <strong className="text-jardin-terracotaOscuro">{pesos(totalComprado)}</strong>
          </span>
        </div>
      )}

      {cargando && (
        <p className="py-10 text-center text-[#6B7B70]">Cargando tus compras…</p>
      )}

      {!cargando && ventas.length === 0 && (
        <div className="rounded-3xl border border-dashed border-jardin-borde bg-white p-10 text-center">
          <p className="text-jardin-verde">Todavía no tienes compras registradas.</p>
          <p className="mt-1 text-sm text-[#6B7B70]">
            Cuando confirmemos un pedido de la tienda, aparecerá aquí con su factura.
          </p>
          <Link
            to="/tienda"
            className="mt-5 inline-flex rounded-full bg-jardin-terracota px-6 py-2.5 font-bold text-white hover:bg-jardin-terracotaOscuro"
          >
            Ir a la tienda
          </Link>
        </div>
      )}

      {ventas.map((venta) => (
        <article key={venta.id_venta} className="rounded-2xl border border-jardin-borde bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm text-[#6B7B70]">
                {venta.numero_venta} · {fechaCorta(venta.fecha_venta)} · {venta.metodo_pago}
              </p>
              <p className="mt-1 text-lg font-semibold text-jardin-terracotaOscuro">
                {pesos(venta.total)}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                venta.estado === 'Anulada'
                  ? 'bg-jardin-errorBg text-jardin-terracotaOscuro'
                  : 'bg-jardin-successBg text-jardin-success'
              }`}
            >
              {venta.estado}
            </span>
          </div>

          <ul className="mt-3 space-y-1 text-sm text-jardin-success">
            {(venta.items || []).map((item, i) => (
              <li key={i} className="flex justify-between border-b border-[#F2EADC] py-1">
                <span>
                  {item.nombre_item} × {item.cantidad}
                </span>
                <span>{pesos(item.subtotal)}</span>
              </li>
            ))}
          </ul>

          {venta.numero_factura && (
            <p className="mt-3 text-xs text-[#6B7B70]">
              Factura {venta.numero_factura} · descárgala en la sección “Mis facturas”.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

export default MisCompras;
