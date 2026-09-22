import { useCallback, useEffect, useState } from 'react';
import { MessageSquareReply, Search, X } from 'lucide-react';

import { api, fechaCorta, toQuery } from '../api/client';

const FILTROS_VACIOS = { estado: '', tipo: '', buscar: '', fecha_inicio: '', fecha_fin: '' };

const COLOR_ESTADO = {
  Pendiente: 'bg-[#FDF0EA] text-[#C15E3D]',
  'En proceso': 'bg-[#FBF1DC] text-[#B57F24]',
  Respondida: 'bg-[#EEF4EB] text-[#3C5A45]',
  Cerrada: 'bg-[#EDE5D6] text-[#6B7B70]',
};

/** Bandeja de peticiones, quejas y reclamos para Administrador y Empleado. */
function PqrPanel() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, pendientes: 0 });
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [abierta, setAbierta] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [estadoNuevo, setEstadoNuevo] = useState('Respondida');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const datos = await api(`/api/v1/pqr${toQuery(filtros)}`);
      setSolicitudes(datos.data || []);
      setResumen(datos.resumen || { total: 0, pendientes: 0 });
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

  const abrir = (solicitud) => {
    setAbierta(solicitud);
    setRespuesta(solicitud.respuesta || '');
    setEstadoNuevo(solicitud.estado === 'Pendiente' ? 'Respondida' : solicitud.estado);
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    try {
      await api(`/api/v1/pqr/${abierta.id_pqr}`, {
        method: 'PATCH',
        body: JSON.stringify({ respuesta: respuesta.trim() || null, estado: estadoNuevo }),
      });
      setMensaje(`Solicitud ${abierta.radicado} actualizada.`);
      setAbierta(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarEstado = async (solicitud, estado) => {
    try {
      await api(`/api/v1/pqr/${solicitud.id_pqr}`, { method: 'PATCH', body: JSON.stringify({ estado }) });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {mensaje && (
        <p className="rounded-lg border border-[#B9CBB2] bg-[#EEF4EB] px-4 py-3 text-sm text-[#3C5A45]">{mensaje}</p>
      )}
      {error && (
        <p className="rounded-lg border border-[#E8B4A0] bg-[#FDF0EA] px-4 py-3 text-sm text-[#C15E3D]">{error}</p>
      )}

      <section className="rounded-xl border border-[#E4DCCD] bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <label className="text-xs text-[#6B7B70]">
            Estado
            <select value={filtros.estado}
              onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-[#E4DCCD] px-2 py-2 text-sm">
              <option value="">Todos</option>
              {['Pendiente', 'En proceso', 'Respondida', 'Cerrada'].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#6B7B70]">
            Tipo
            <select value={filtros.tipo}
              onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-[#E4DCCD] px-2 py-2 text-sm">
              <option value="">Todos</option>
              {['Petición', 'Queja', 'Reclamo', 'Sugerencia'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#6B7B70]">
            Desde
            <input type="date" value={filtros.fecha_inicio}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_inicio: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-[#E4DCCD] px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#6B7B70]">
            Hasta
            <input type="date" value={filtros.fecha_fin}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_fin: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-[#E4DCCD] px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#6B7B70]">
            Buscar
            <span className="relative mt-1 block">
              <Search size={14} className="absolute left-2 top-3 text-[#8C9A8E]" />
              <input type="text" value={filtros.buscar} placeholder="Radicado o asunto"
                onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value }))}
                className="block w-full rounded-lg border border-[#E4DCCD] py-2 pl-7 pr-2 text-sm" />
            </span>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setFiltros(FILTROS_VACIOS)}
            className="rounded-lg border border-[#E4DCCD] px-4 py-2 text-sm text-[#23392E] hover:bg-[#FAF3E7]">
            Limpiar filtros
          </button>
          <p className="text-sm text-[#6B7B70]">
            {resumen.total} solicitudes · {resumen.pendientes} sin resolver
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-[#E4DCCD] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#23392E] text-[#FAF3E7]">
            <tr>
              <th className="px-3 py-3">Radicado</th>
              <th className="px-3 py-3">Fecha</th>
              <th className="px-3 py-3">Cliente</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Asunto</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[#6B7B70]">Cargando solicitudes…</td></tr>
            )}
            {!cargando && solicitudes.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[#6B7B70]">
                No hay solicitudes con estos filtros.
              </td></tr>
            )}
            {solicitudes.map((s) => (
              <tr key={s.id_pqr} className="border-t border-[#EDE5D6] hover:bg-[#FAF3E7]">
                <td className="px-3 py-3 font-medium text-[#23392E]">{s.radicado}</td>
                <td className="px-3 py-3 text-[#6B7B70]">{fechaCorta(s.fecha_registro)}</td>
                <td className="px-3 py-3">{s.cliente}</td>
                <td className="px-3 py-3">{s.tipo}</td>
                <td className="px-3 py-3 max-w-xs truncate">{s.asunto}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${COLOR_ESTADO[s.estado]}`}>{s.estado}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    {s.estado === 'Pendiente' && (
                      <button onClick={() => cambiarEstado(s, 'En proceso')}
                        className="rounded-lg border border-[#E4DCCD] px-3 py-1.5 text-xs text-[#23392E] hover:bg-[#FAF3E7]">
                        Tomar caso
                      </button>
                    )}
                    <button onClick={() => abrir(s)} title="Responder"
                      className="rounded-lg border border-[#7C9473] p-2 text-[#5F7657] hover:bg-[#EEF4EB]">
                      <MessageSquareReply size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={guardar} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#23392E]">{abierta.radicado} · {abierta.tipo}</h3>
                <p className="text-sm text-[#6B7B70]">
                  {abierta.cliente} · {abierta.cliente_email} · {fechaCorta(abierta.fecha_registro)}
                </p>
              </div>
              <button type="button" onClick={() => setAbierta(null)} className="text-[#6B7B70] hover:text-[#23392E]">
                <X size={20} />
              </button>
            </div>

            <h4 className="font-medium text-[#23392E]">{abierta.asunto}</h4>
            <p className="mt-2 whitespace-pre-line rounded-lg bg-[#FAF3E7] p-3 text-sm text-[#3C5A45]">
              {abierta.descripcion}
            </p>

            <label className="mt-4 block text-sm text-[#23392E]">
              Respuesta al cliente
              <textarea rows={5} value={respuesta} onChange={(e) => setRespuesta(e.target.value)}
                placeholder="Escribe la respuesta que verá el cliente en su cuenta."
                className="mt-1 block w-full rounded-lg border border-[#E4DCCD] px-3 py-2 text-sm" />
            </label>

            <label className="mt-3 block text-sm text-[#23392E]">
              Estado
              <select value={estadoNuevo} onChange={(e) => setEstadoNuevo(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#E4DCCD] px-3 py-2 text-sm">
                {['Pendiente', 'En proceso', 'Respondida', 'Cerrada'].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAbierta(null)}
                className="rounded-lg border border-[#E4DCCD] px-4 py-2 text-sm text-[#23392E]">
                Cancelar
              </button>
              <button type="submit"
                className="rounded-lg bg-[#23392E] px-5 py-2 text-sm font-medium text-white hover:bg-[#1A2B22]">
                Guardar respuesta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default PqrPanel;
