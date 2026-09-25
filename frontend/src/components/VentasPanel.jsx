import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Download, FileSpreadsheet, Plus, Receipt, Search, Trash2, X } from 'lucide-react';

import { api, descargarArchivo, fechaCorta, hoyISO, pesos, toQuery } from '../api/client';

const FILTROS_VACIOS = {
  fecha_inicio: '', fecha_fin: '', buscar: '', estado: '',
  id_cliente: '', id_producto: '', id_servicio: '', valor_min: '', valor_max: '',
};

const LINEA_VACIA = { tipo_item: 'producto', referencia: '', cantidad: 1, descuento: 0 };

/**
 * Módulo de ventas para Administrador y Empleado.
 *
 * Cubre el registro de ventas (manual o a partir de un pedido de la
 * tienda), el historial con filtros y la exportación del reporte diario
 * en PDF y Excel.
 */
function VentasPanel({ onVentaRegistrada }) {
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState({ cantidad: 0, total: 0 });
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [fechaReporte, setFechaReporte] = useState(hoyISO());
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [registrando, setRegistrando] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [formulario, setFormulario] = useState({
    id_cliente: '', metodo_pago: 'Efectivo', descuento: 0,
    aplica_impuestos: true, observaciones: '', lineas: [{ ...LINEA_VACIA }],
  });

  const cargarVentas = useCallback(async () => {
    try {
      const datos = await api(`/api/v1/ventas${toQuery(filtros)}`);
      setVentas(datos.data || []);
      setResumen(datos.resumen || { cantidad: 0, total: 0 });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  /** Catálogos auxiliares: se piden una sola vez, en paralelo. */
  const cargarCatalogos = useCallback(async () => {
    try {
      const [usuarios, prods, servs, peds] = await Promise.all([
        api('/api/v1/clientes').catch(() => ({ data: [] })),
        api('/api/v1/productos'),
        api('/api/v1/servicios'),
        api('/api/v1/pedidos').catch(() => ({ data: [] })),
      ]);
      setClientes(usuarios.data || []);
      setProductos(prods.data || []);
      setServicios(servs.data || []);
      setPedidos(peds.data || []);
    } catch { /* si algún catálogo falla, el resto del panel sigue sirviendo */ }
  }, []);

  useEffect(() => { cargarVentas(); }, [cargarVentas]);
  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  useEffect(() => {
    if (!mensaje) return undefined;
    const t = setTimeout(() => setMensaje(''), 5000);
    return () => clearTimeout(t);
  }, [mensaje]);

  /** Vista previa del total. El valor definitivo lo calcula el backend. */
  const totalEstimado = useMemo(() => {
    const bruto = formulario.lineas.reduce((suma, linea) => {
      const lista = linea.tipo_item === 'producto' ? productos : servicios;
      const clave = linea.tipo_item === 'producto' ? 'id_producto' : 'id_servicio';
      const item = lista.find((x) => String(x[clave]) === String(linea.referencia));
      if (!item) return suma;
      return suma + Number(item.precio) * Number(linea.cantidad || 0) - Number(linea.descuento || 0);
    }, 0);
    const base = Math.max(0, bruto - Number(formulario.descuento || 0));
    const iva = formulario.aplica_impuestos ? base * 0.19 : 0;
    return { bruto, base, iva, total: base + iva };
  }, [formulario, productos, servicios]);

  const actualizarLinea = (indice, cambios) => {
    setFormulario((f) => ({
      ...f,
      lineas: f.lineas.map((linea, i) => (i === indice ? { ...linea, ...cambios } : linea)),
    }));
  };

  const registrarVenta = async (evento) => {
    evento.preventDefault();
    setError('');

    if (!formulario.id_cliente) {
      setError('Selecciona el cliente de la venta.');
      return;
    }
    const items = formulario.lineas
      .filter((linea) => linea.referencia)
      .map((linea) => ({
        tipo_item: linea.tipo_item,
        id_producto: linea.tipo_item === 'producto' ? Number(linea.referencia) : null,
        id_servicio: linea.tipo_item === 'servicio' ? Number(linea.referencia) : null,
        cantidad: Number(linea.cantidad) || 1,
        descuento: Number(linea.descuento) || 0,
      }));
    if (!items.length) {
      setError('Agrega al menos un producto o servicio.');
      return;
    }

    try {
      const respuesta = await api('/api/v1/ventas', {
        method: 'POST',
        body: JSON.stringify({
          id_cliente: Number(formulario.id_cliente),
          items,
          descuento: Number(formulario.descuento) || 0,
          aplica_impuestos: formulario.aplica_impuestos,
          metodo_pago: formulario.metodo_pago,
          observaciones: formulario.observaciones || null,
        }),
      });
      setMensaje(respuesta.message);
      setRegistrando(false);
      setFormulario({
        id_cliente: '', metodo_pago: 'Efectivo', descuento: 0,
        aplica_impuestos: true, observaciones: '', lineas: [{ ...LINEA_VACIA }],
      });
      cargarVentas();
      onVentaRegistrada?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const convertirPedido = async (idPedido) => {
    if (!idPedido) return;
    try {
      const respuesta = await api('/api/v1/ventas/desde-pedido', {
        method: 'POST',
        body: JSON.stringify({ id_pedido: Number(idPedido), aplica_impuestos: true, metodo_pago: 'Contraentrega' }),
      });
      setMensaje(respuesta.message);
      cargarVentas();
      cargarCatalogos();
      onVentaRegistrada?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const anularVenta = async (venta) => {
    if (!window.confirm(`¿Anular la venta ${venta.numero_venta}? También se anula su factura.`)) return;
    try {
      await api(`/api/v1/ventas/${venta.id_venta}`, {
        method: 'PATCH', body: JSON.stringify({ estado: 'Anulada' }),
      });
      setMensaje(`Venta ${venta.numero_venta} anulada.`);
      cargarVentas();
    } catch (err) {
      setError(err.message);
    }
  };

  const facturar = async (venta) => {
    try {
      const respuesta = await api('/api/v1/facturas', {
        method: 'POST', body: JSON.stringify({ id_venta: venta.id_venta }),
      });
      setMensaje(respuesta.message);
      cargarVentas();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportar = async (formato) => {
    try {
      const query = toQuery({
        fecha: filtros.fecha_inicio || filtros.fecha_fin ? '' : fechaReporte,
        fecha_inicio: filtros.fecha_inicio,
        fecha_fin: filtros.fecha_fin,
        estado: filtros.estado,
        id_cliente: filtros.id_cliente,
      });
      const extension = formato === 'pdf' ? 'pdf' : 'xlsx';
      await descargarArchivo(
        `/api/v1/reportes/ventas/${formato}${query}`,
        `reporte-ventas-${filtros.fecha_inicio || fechaReporte}.${extension}`,
      );
      setMensaje(`Reporte en ${formato.toUpperCase()} descargado.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const pedidosSinFacturar = pedidos.filter((p) => p.estado !== 'Entregado' && p.estado !== 'Cancelado');

  return (
    <div className="space-y-4">
      {mensaje && (
        <p className="rounded-lg border border-[#B9CBB2] bg-jardin-successBg px-4 py-3 text-sm text-jardin-success">{mensaje}</p>
      )}
      {error && (
        <p className="rounded-lg border border-jardin-errorBorder bg-jardin-errorBg px-4 py-3 text-sm text-jardin-terracotaOscuro">{error}</p>
      )}

      {/* Acciones principales */}
      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-jardin-borde bg-white p-4">
        <button
          onClick={() => setRegistrando(true)}
          className="flex items-center gap-2 rounded-lg bg-jardin-verde px-4 py-2 text-sm font-medium text-white hover:bg-jardin-verdeOscuro"
        >
          <Plus size={16} /> Registrar venta
        </button>

        <label className="text-sm text-jardin-verde">
          Facturar un pedido de la tienda
          <select
            defaultValue=""
            onChange={(e) => { convertirPedido(e.target.value); e.target.value = ''; }}
            className="mt-1 block w-60 rounded-lg border border-jardin-borde px-3 py-2 text-sm"
          >
            <option value="">Selecciona un pedido…</option>
            {pedidosSinFacturar.map((p) => (
              <option key={p.id_pedido} value={p.id_pedido}>
                Pedido #{p.id_pedido} · {p.nombres} {p.apellidos} · {pesos(p.total)}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="text-sm text-jardin-verde">
            Reporte del día
            <input
              type="date" value={fechaReporte}
              onChange={(e) => setFechaReporte(e.target.value)}
              className="mt-1 block rounded-lg border border-jardin-borde px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={() => exportar('pdf')}
            className="flex items-center gap-2 rounded-lg border border-[#D9714E] px-4 py-2 text-sm font-medium text-jardin-terracotaOscuro hover:bg-jardin-errorBg"
          >
            <Download size={16} /> PDF
          </button>
          <button
            onClick={() => exportar('excel')}
            className="flex items-center gap-2 rounded-lg border border-[#7C9473] px-4 py-2 text-sm font-medium text-[#5F7657] hover:bg-jardin-successBg"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
        </div>
      </section>

      {/* Filtros del historial */}
      <section className="rounded-xl border border-jardin-borde bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
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
            Cliente
            <select value={filtros.id_cliente}
              onChange={(e) => setFiltros((f) => ({ ...f, id_cliente: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm">
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id_usuario} value={c.id_usuario}>{c.nombres} {c.apellidos}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#6B7B70]">
            Producto
            <select value={filtros.id_producto}
              onChange={(e) => setFiltros((f) => ({ ...f, id_producto: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm">
              <option value="">Todos</option>
              {productos.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#6B7B70]">
            Servicio
            <select value={filtros.id_servicio}
              onChange={(e) => setFiltros((f) => ({ ...f, id_servicio: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm">
              <option value="">Todos</option>
              {servicios.map((s) => (
                <option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#6B7B70]">
            Estado
            <select value={filtros.estado}
              onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm">
              <option value="">Todos</option>
              <option value="Pagada">Pagada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Anulada">Anulada</option>
            </select>
          </label>
          <label className="text-xs text-[#6B7B70]">
            Valor mínimo
            <input type="number" min="0" value={filtros.valor_min}
              onChange={(e) => setFiltros((f) => ({ ...f, valor_min: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#6B7B70]">
            Valor máximo
            <input type="number" min="0" value={filtros.valor_max}
              onChange={(e) => setFiltros((f) => ({ ...f, valor_max: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm" />
          </label>
          <label className="col-span-2 text-xs text-[#6B7B70]">
            Buscar
            <span className="relative mt-1 block">
              <Search size={14} className="absolute left-2 top-3 text-[#8C9A8E]" />
              <input type="text" value={filtros.buscar} placeholder="N.º de venta o cliente"
                onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value }))}
                className="block w-full rounded-lg border border-jardin-borde py-2 pl-7 pr-2 text-sm" />
            </span>
          </label>
          <div className="col-span-2 flex items-end">
            <button onClick={() => setFiltros(FILTROS_VACIOS)}
              className="rounded-lg border border-jardin-borde px-4 py-2 text-sm text-jardin-verde hover:bg-jardin-fondo">
              Limpiar filtros
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-[#6B7B70]">
          {resumen.cantidad} ventas encontradas · {pesos(resumen.total)} en total
        </p>
      </section>

      {/* Historial */}
      <section className="overflow-x-auto rounded-xl border border-jardin-borde bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-jardin-verde text-jardin-fondo">
            <tr>
              <th className="px-3 py-3">N.º venta</th>
              <th className="px-3 py-3">Fecha</th>
              <th className="px-3 py-3">Cliente</th>
              <th className="px-3 py-3">Ítems</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Factura</th>
              <th className="px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-[#6B7B70]">Cargando ventas…</td></tr>
            )}
            {!cargando && ventas.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-[#6B7B70]">
                Todavía no hay ventas con estos filtros. Registra una venta o factura un pedido de la tienda.
              </td></tr>
            )}
            {ventas.map((venta) => (
              <tr key={venta.id_venta} className="border-t border-[#EDE5D6] hover:bg-jardin-fondo">
                <td className="px-3 py-3 font-medium text-jardin-verde">{venta.numero_venta}</td>
                <td className="px-3 py-3 text-[#6B7B70]">{fechaCorta(venta.fecha_venta)}</td>
                <td className="px-3 py-3">{venta.cliente}</td>
                <td className="px-3 py-3 text-[#6B7B70]">
                  <button onClick={() => setDetalle(venta)} className="underline hover:text-jardin-verde">
                    {venta.items?.length || 0} ítem(s)
                  </button>
                </td>
                <td className="px-3 py-3 text-right font-medium">{pesos(venta.total)}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    venta.estado === 'Anulada' ? 'bg-jardin-errorBg text-jardin-terracotaOscuro'
                      : venta.estado === 'Pendiente' ? 'bg-jardin-pendingBg text-[#B57F24]'
                      : 'bg-jardin-successBg text-jardin-success'}`}>
                    {venta.estado}
                  </span>
                </td>
                <td className="px-3 py-3 text-[#6B7B70]">{venta.numero_factura || 'Sin facturar'}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    {!venta.numero_factura && venta.estado !== 'Anulada' && (
                      <button onClick={() => facturar(venta)} title="Emitir factura"
                        className="rounded-lg border border-[#7C9473] p-2 text-[#5F7657] hover:bg-jardin-successBg">
                        <Receipt size={15} />
                      </button>
                    )}
                    {venta.estado !== 'Anulada' && (
                      <button onClick={() => anularVenta(venta)} title="Anular venta"
                        className="rounded-lg border border-jardin-errorBorder p-2 text-jardin-terracotaOscuro hover:bg-jardin-errorBg">
                        <Ban size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Modal: detalle de una venta */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-jardin-verde">Venta {detalle.numero_venta}</h3>
                <p className="text-sm text-[#6B7B70]">{detalle.cliente} · {fechaCorta(detalle.fecha_venta)}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-[#6B7B70] hover:text-jardin-verde">
                <X size={20} />
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-jardin-borde text-[#6B7B70]">
                <tr>
                  <th className="py-2">Ítem</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2 text-right">Cant.</th>
                  <th className="py-2 text-right">Precio</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-[#F2EADC]">
                    <td className="py-2">{item.nombre_item}</td>
                    <td className="py-2 capitalize text-[#6B7B70]">{item.tipo_item}</td>
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
            {detalle.observaciones && (
              <p className="mt-4 rounded-lg bg-jardin-fondo p-3 text-sm text-jardin-success">{detalle.observaciones}</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: registrar venta */}
      {registrando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={registrarVenta}
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold text-jardin-verde">Registrar venta</h3>
              <button type="button" onClick={() => setRegistrando(false)} className="text-[#6B7B70] hover:text-jardin-verde">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm text-jardin-verde sm:col-span-2">
                Cliente *
                <select required value={formulario.id_cliente}
                  onChange={(e) => setFormulario((f) => ({ ...f, id_cliente: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-jardin-borde px-3 py-2 text-sm">
                  <option value="">Selecciona un cliente…</option>
                  {clientes.map((c) => (
                    <option key={c.id_usuario} value={c.id_usuario}>
                      {c.nombres} {c.apellidos} · {c.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-jardin-verde">
                Método de pago
                <select value={formulario.metodo_pago}
                  onChange={(e) => setFormulario((f) => ({ ...f, metodo_pago: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-jardin-borde px-3 py-2 text-sm">
                  {['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Contraentrega'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>

            <h4 className="mt-5 text-sm font-semibold text-jardin-verde">Productos y servicios</h4>
            <div className="mt-2 space-y-2">
              {formulario.lineas.map((linea, indice) => (
                <div key={indice} className="grid grid-cols-12 items-end gap-2 rounded-lg bg-jardin-fondo p-2">
                  <label className="col-span-3 text-xs text-[#6B7B70]">
                    Tipo
                    <select value={linea.tipo_item}
                      onChange={(e) => actualizarLinea(indice, { tipo_item: e.target.value, referencia: '' })}
                      className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm">
                      <option value="producto">Producto</option>
                      <option value="servicio">Servicio</option>
                    </select>
                  </label>
                  <label className="col-span-5 text-xs text-[#6B7B70]">
                    {linea.tipo_item === 'producto' ? 'Producto' : 'Servicio'}
                    <select value={linea.referencia}
                      onChange={(e) => actualizarLinea(indice, { referencia: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm">
                      <option value="">Selecciona…</option>
                      {(linea.tipo_item === 'producto' ? productos : servicios).map((item) => (
                        <option
                          key={item.id_producto || item.id_servicio}
                          value={item.id_producto || item.id_servicio}
                        >
                          {item.nombre} · {pesos(item.precio)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 text-xs text-[#6B7B70]">
                    Cantidad
                    <input type="number" min="1" value={linea.cantidad}
                      onChange={(e) => actualizarLinea(indice, { cantidad: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm" />
                  </label>
                  <label className="col-span-1 text-xs text-[#6B7B70]">
                    Desc.
                    <input type="number" min="0" value={linea.descuento}
                      onChange={(e) => actualizarLinea(indice, { descuento: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-jardin-borde px-2 py-2 text-sm" />
                  </label>
                  <div className="col-span-1 flex justify-end">
                    <button type="button" title="Quitar línea"
                      onClick={() => setFormulario((f) => ({
                        ...f,
                        lineas: f.lineas.length > 1 ? f.lineas.filter((_, i) => i !== indice) : f.lineas,
                      }))}
                      className="rounded-lg border border-jardin-errorBorder p-2 text-jardin-terracotaOscuro hover:bg-jardin-errorBg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button"
              onClick={() => setFormulario((f) => ({ ...f, lineas: [...f.lineas, { ...LINEA_VACIA }] }))}
              className="mt-2 flex items-center gap-2 rounded-lg border border-jardin-borde px-3 py-2 text-sm text-jardin-verde hover:bg-jardin-fondo">
              <Plus size={14} /> Agregar línea
            </button>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm text-jardin-verde">
                Descuento global
                <input type="number" min="0" value={formulario.descuento}
                  onChange={(e) => setFormulario((f) => ({ ...f, descuento: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-jardin-borde px-3 py-2 text-sm" />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm text-jardin-verde">
                <input type="checkbox" checked={formulario.aplica_impuestos}
                  onChange={(e) => setFormulario((f) => ({ ...f, aplica_impuestos: e.target.checked }))} />
                Aplicar IVA (19%)
              </label>
              <label className="text-sm text-jardin-verde">
                Observaciones
                <input type="text" value={formulario.observaciones}
                  onChange={(e) => setFormulario((f) => ({ ...f, observaciones: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-jardin-borde px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="mt-4 rounded-lg bg-jardin-fondo p-3 text-sm">
              <p className="text-[#6B7B70]">
                Estimado: {pesos(totalEstimado.base)} + IVA {pesos(totalEstimado.iva)}
              </p>
              <p className="text-lg font-semibold text-jardin-terracotaOscuro">Total {pesos(totalEstimado.total)}</p>
              <p className="mt-1 text-xs text-[#8C9A8E]">
                Es una vista previa. El total definitivo lo calcula el servidor con los precios del catálogo.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setRegistrando(false)}
                className="rounded-lg border border-jardin-borde px-4 py-2 text-sm text-jardin-verde">
                Cancelar
              </button>
              <button type="submit"
                className="rounded-lg bg-jardin-verde px-5 py-2 text-sm font-medium text-white hover:bg-jardin-verdeOscuro">
                Registrar venta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default VentasPanel;
