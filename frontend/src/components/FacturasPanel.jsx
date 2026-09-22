import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, Search, X } from 'lucide-react';

import { api, descargarArchivo, fechaCorta, pesos, toQuery } from '../api/client';

const FILTROS_VACIOS = { numero: '', cliente: '', fecha_inicio: '', fecha_fin: '', estado: '' };

/**
 * Consulta y descarga de facturas para Administrador y Empleado.
 * El mismo componente sirve al cliente en modo solo lectura (`soloLectura`),
 * porque el backend ya filtra las facturas por el id del token.
 */
function FacturasPanel({ soloLectura = false }) {
  const [facturas, setFacturas] = useState([]);
  const [resumen, setResumen] = useState({ cantidad: 0, total: 0 });
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const datos = await api(`/api/v1/facturas${toQuery(filtros)}`);
      setFacturas(datos.data || []);
      setResumen(datos.resumen || { cantidad: 0, total: 0 });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!mensaje) return undefined;
    const t = setTimeout(() => setMensaje(''), 5000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const descargar = async (factura) => {
    try {
      await descargarArchivo(`/api/v1/facturas/${factura.id_factura}/pdf`, `${factura.numero_factura}.pdf`);
      setMensaje(`Factura ${factura.numero_factura} descargada.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const marcarPagada = async (factura) => {
    try {
      await api(`/api/v1/facturas/${factura.id_factura}`, {
        method: 'PATCH', body: JSON.stringify({ estado: 'Pagada' }),
      });
      setMensaje(`Factura ${factura.numero_factura} marcada como pagada.`);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {mensaje && (
        <p className="rounded-lg border border-[#B9CBB2] bg-jardin-successBg px-4 py-3 text-sm text-jardin-success">{mensaje}</p>
      )}
      {error && (
        <p className="rounded-lg border border-[#E8B4A0] bg-jardin-errorBg px-4 py-3 text-sm text-jardin-terracotaOscuro">{error}</p>
      )}

      <section className="rounded-xl border border-jardin-borde bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <label className="text-xs text-[#6B7B70]">
            N.º de factura o venta
            <span className="relative mt-1 block">
              <Search size={14} className="absolute left-2 top-3 text-[#8C9A8E]" />
              <input type="text" value={filtros.numero} placeholder="FC-2026-0001"
                onChange={(e) => setFiltros((f) => ({ ...f, numero: e.target.value }))}
                className="block w-full rounded-lg border border-jardin-borde py-2 pl-7 pr-2 text-sm" />
            </span>
          </label>
          {!soloLectura && (
            <label className="text-xs text-[#6B7B70]">
              Cliente
              <input type="text" value={filtros.cliente} placeholder="Nombre del cliente"
                onChange={(e) => setFiltros((f) => ({ ...f, cliente: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm" />
            </label>
          )}
          <label className="text-xs text-[#6B7B70]">
            Desde
            <input type="date" value={filtros.fecha_inicio}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_inicio: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#6B7B70]">
            Hasta
            <input type="date" value={filtros.fecha_fin}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_fin: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#6B7B70]">
            Estado
            <select value={filtros.estado}
              onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm">
              <option value="">Todos</option>
              <option value="Emitida">Emitida</option>
              <option value="Pagada">Pagada</option>
              <option value="Anulada">Anulada</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setFiltros(FILTROS_VACIOS)}
            className="rounded-lg border border-jardin-borde px-4 py-2 text-sm text-jardin-verde hover:bg-jardin-fondo">
            Limpiar filtros
          </button>
          <p className="text-sm text-[#6B7B70]">
            {resumen.cantidad} facturas · {pesos(resumen.total)} facturados
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-jardin-borde bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-jardin-verde text-jardin-fondo">
            <tr>
              <th className="px-3 py-3">N.º factura</th>
              <th className="px-3 py-3">Fecha</th>
              {!soloLectura && <th className="px-3 py-3">Cliente</th>}
              <th className="px-3 py-3">Venta</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={soloLectura ? 6 : 7} className="px-3 py-8 text-center text-[#6B7B70]">Cargando facturas…</td></tr>
            )}
            {!cargando && facturas.length === 0 && (
              <tr><td colSpan={soloLectura ? 6 : 7} className="px-3 py-8 text-center text-[#6B7B70]">
                {soloLectura
                  ? 'Todavía no tienes facturas. Aparecerán aquí cuando confirmemos una compra.'
                  : 'No hay facturas con estos filtros. Emite una desde el módulo de ventas.'}
              </td></tr>
            )}
            {facturas.map((factura) => (
              <tr key={factura.id_factura} className="border-t border-[#EDE5D6] hover:bg-jardin-fondo">
                <td className="px-3 py-3">
                  <button onClick={() => setDetalle(factura)} className="font-medium text-jardin-verde underline">
                    {factura.numero_factura}
                  </button>
                </td>
                <td className="px-3 py-3 text-[#6B7B70]">{fechaCorta(factura.fecha_emision)}</td>
                {!soloLectura && <td className="px-3 py-3">{factura.cliente}</td>}
                <td className="px-3 py-3 text-[#6B7B70]">{factura.numero_venta}</td>
                <td className="px-3 py-3 text-right font-medium">{pesos(factura.total)}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    factura.estado === 'Anulada' ? 'bg-jardin-errorBg text-jardin-terracotaOscuro'
                      : factura.estado === 'Pagada' ? 'bg-jardin-successBg text-jardin-success'
                      : 'bg-jardin-pendingBg text-[#B57F24]'}`}>
                    {factura.estado}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => descargar(factura)} title="Descargar PDF"
                      className="rounded-lg border border-[#D9714E] p-2 text-jardin-terracotaOscuro hover:bg-jardin-errorBg">
                      <Download size={15} />
                    </button>
                    {!soloLectura && factura.estado === 'Emitida' && (
                      <button onClick={() => marcarPagada(factura)} title="Marcar como pagada"
                        className="rounded-lg border border-[#7C9473] p-2 text-[#5F7657] hover:bg-jardin-successBg">
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-jardin-verde">Factura {detalle.numero_factura}</h3>
                <p className="text-sm text-[#6B7B70]">
                  {detalle.cliente} · {fechaCorta(detalle.fecha_emision)} · {detalle.estado}
                </p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-[#6B7B70] hover:text-jardin-verde">
                <X size={20} />
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-jardin-borde text-[#6B7B70]">
                <tr>
                  <th className="py-2">Ítem</th>
                  <th className="py-2 text-right">Cant.</th>
                  <th className="py-2 text-right">Precio unitario</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-[#F2EADC]">
                    <td className="py-2">{item.nombre_item}</td>
                    <td className="py-2 text-right">{item.cantidad}</td>
                    <td className="py-2 text-right">{pesos(item.precio_unitario)}</td>
                    <td className="py-2 text-right">{pesos(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-[#6B7B70]">Subtotal</dt><dd>{pesos(detalle.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6B7B70]">Descuento</dt><dd>- {pesos(detalle.descuento)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6B7B70]">IVA</dt><dd>{pesos(detalle.impuestos)}</dd></div>
              <div className="flex justify-between border-t border-jardin-borde pt-2 text-base font-semibold text-jardin-terracotaOscuro">
                <dt>Total</dt><dd>{pesos(detalle.total)}</dd>
              </div>
            </dl>
            <button onClick={() => descargar(detalle)}
              className="mt-5 flex items-center gap-2 rounded-lg bg-jardin-verde px-4 py-2 text-sm font-medium text-white">
              <Download size={16} /> Descargar en PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacturasPanel;
