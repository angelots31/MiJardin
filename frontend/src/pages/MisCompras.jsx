import { useEffect, useState } from 'react';

import { api, fechaCorta, pesos } from '../api/client';
import DashboardResumen from '../components/dashboard/DashboardResumen';
import FacturasPanel from '../components/FacturasPanel';

/**
 * Dashboard del cliente.
 *
 * Muestra sus propios indicadores, el historial de compras y las facturas
 * que puede descargar. El backend ya limita cada consulta al id del token,
 * así que aquí no hay que filtrar nada a mano.
 */
function MisCompras() {
  const [vista, setVista] = useState('resumen');
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
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
    cargar();
  }, []);

  const pestañas = [
    { id: 'resumen', etiqueta: 'Resumen' },
    { id: 'compras', etiqueta: 'Mis compras' },
    { id: 'facturas', etiqueta: 'Mis facturas' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-jardin-verde">Mis compras</h1>
      <p className="mt-1 text-[#6B7B70]">
        Aquí encuentras el resumen de tus compras en MiJardín y tus facturas.
      </p>

      <nav className="my-6 flex flex-wrap gap-2 border-b border-[#E4DCCD]">
        {pestañas.map((p) => (
          <button key={p.id} onClick={() => setVista(p.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              vista === p.id
                ? 'border-[#D9714E] font-medium text-jardin-verde'
                : 'border-transparent text-[#6B7B70] hover:text-jardin-verde'}`}>
            {p.etiqueta}
          </button>
        ))}
      </nav>

      {vista === 'resumen' && <DashboardResumen rol="Cliente" />}

      {vista === 'compras' && (
        <section>
          {error && (
            <p className="mb-4 rounded-lg border border-jardin-errorBorder bg-jardin-errorBg px-4 py-3 text-sm text-jardin-terracotaOscuro">{error}</p>
          )}
          {cargando && <p className="py-10 text-center text-[#6B7B70]">Cargando tus compras…</p>}
          {!cargando && ventas.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#E4DCCD] bg-white p-10 text-center">
              <p className="text-jardin-verde">Todavía no tienes compras registradas.</p>
              <p className="mt-1 text-sm text-[#6B7B70]">
                Cuando confirmemos un pedido de la tienda, aparecerá aquí con su factura.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {ventas.map((venta) => (
              <article key={venta.id_venta} className="rounded-xl border border-[#E4DCCD] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-[#6B7B70]">
                      {venta.numero_venta} · {fechaCorta(venta.fecha_venta)} · {venta.metodo_pago}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-jardin-terracotaOscuro">{pesos(venta.total)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${
                    venta.estado === 'Anulada' ? 'bg-jardin-errorBg text-jardin-terracotaOscuro' : 'bg-jardin-successBg text-jardin-success'}`}>
                    {venta.estado}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-jardin-success">
                  {(venta.items || []).map((item, i) => (
                    <li key={i} className="flex justify-between border-b border-[#F2EADC] py-1">
                      <span>{item.nombre_item} × {item.cantidad}</span>
                      <span>{pesos(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                {venta.numero_factura && (
                  <p className="mt-3 text-xs text-[#6B7B70]">
                    Factura {venta.numero_factura} · descárgala en la pestaña “Mis facturas”.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {vista === 'facturas' && <FacturasPanel soloLectura />}
    </main>
  );
}

export default MisCompras;
