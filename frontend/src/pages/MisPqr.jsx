import { useEffect, useState } from 'react';
import { Plus, Send, X } from 'lucide-react';

import { api, fechaCorta } from '../api/client';

const COLOR_ESTADO = {
  Pendiente: 'bg-jardin-errorBg text-jardin-terracotaOscuro',
  'En proceso': 'bg-jardin-pendingBg text-[#B57F24]',
  Respondida: 'bg-jardin-successBg text-jardin-success',
  Cerrada: 'bg-jardin-crema text-[#6B7B70]',
};

const FORMULARIO_VACIO = { tipo: 'Petición', asunto: '', descripcion: '' };

/**
 * Sección de PQR del cliente: radica una solicitud y consulta su estado.
 *
 * El panel (PanelCliente) es quien dibuja el título y el sidebar, así que
 * aquí solo vive la acción "Nueva solicitud" y el historial.
 */
function MisPqr() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [abriendo, setAbriendo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const datos = await api('/api/v1/pqr/mis-pqr');
      setSolicitudes(datos.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!mensaje) return undefined;
    const t = setTimeout(() => setMensaje(''), 6000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const radicar = async (evento) => {
    evento.preventDefault();
    setError('');
    if (formulario.asunto.trim().length < 5) {
      setError('El asunto debe tener al menos 5 caracteres.');
      return;
    }
    if (formulario.descripcion.trim().length < 10) {
      setError('Cuéntanos un poco más: la descripción necesita al menos 10 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      const respuesta = await api('/api/v1/pqr', {
        method: 'POST',
        body: JSON.stringify({
          tipo: formulario.tipo,
          asunto: formulario.asunto.trim(),
          descripcion: formulario.descripcion.trim(),
        }),
      });
      setMensaje(respuesta.message || 'Radicamos tu solicitud correctamente.');
      setFormulario(FORMULARIO_VACIO);
      setAbriendo(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-jardin-fondo px-5 py-4">
        <p className="text-sm text-[#6B7B70]">
          Radica una petición, queja, reclamo o sugerencia y sigue su estado aquí mismo.
        </p>
        <button
          onClick={() => { setError(''); setAbriendo(true); }}
          className="flex items-center gap-2 rounded-full bg-jardin-terracota px-5 py-2.5 text-sm font-bold text-white hover:bg-jardin-terracotaOscuro"
        >
          <Plus size={16} /> Nueva solicitud
        </button>
      </div>

      {mensaje && (
        <p className="rounded-2xl border border-[#B9CBB2] bg-jardin-successBg px-4 py-3 text-sm text-jardin-success">
          {mensaje}
        </p>
      )}
      {error && !abriendo && (
        <p className="rounded-2xl border border-jardin-errorBorder bg-jardin-errorBg px-4 py-3 text-sm text-jardin-terracotaOscuro">
          {error}
        </p>
      )}

      {cargando && <p className="py-10 text-center text-[#6B7B70]">Cargando tus solicitudes…</p>}

      {!cargando && solicitudes.length === 0 && (
        <div className="rounded-3xl border border-dashed border-jardin-borde bg-white p-10 text-center">
          <p className="text-jardin-verde">Aún no has radicado ninguna solicitud.</p>
          <p className="mt-1 text-sm text-[#6B7B70]">
            Si algo no salió como esperabas con tu pedido, cuéntanos y te respondemos.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {solicitudes.map((s) => (
          <article key={s.id_pqr} className="rounded-2xl border border-jardin-borde bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm text-[#6B7B70]">
                  {s.radicado} · {s.tipo} · {fechaCorta(s.fecha_registro)}
                </p>
                <h3 className="mt-1 font-semibold text-jardin-verde">{s.asunto}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${COLOR_ESTADO[s.estado] || ''}`}>
                {s.estado}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-jardin-success">{s.descripcion}</p>
            {s.respuesta && (
              <div className="mt-3 rounded-xl bg-jardin-fondo p-3">
                <p className="text-xs text-[#6B7B70]">
                  Respuesta de MiJardín{s.respondida_por ? ` · ${s.respondida_por}` : ''}
                  {s.fecha_respuesta ? ` · ${fechaCorta(s.fecha_respuesta)}` : ''}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-jardin-verde">{s.respuesta}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      {abriendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={radicar} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-jardin-verde">Nueva solicitud</h3>
                <p className="text-sm text-[#6B7B70]">Te responderemos en tu panel.</p>
              </div>
              <button
                type="button"
                onClick={() => setAbriendo(false)}
                className="text-[#6B7B70] hover:text-jardin-verde"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <p className="mb-3 rounded-xl border border-jardin-errorBorder bg-jardin-errorBg px-3 py-2 text-sm text-jardin-terracotaOscuro">
                {error}
              </p>
            )}

            <label className="block text-sm text-jardin-verde">
              Tipo de solicitud
              <select
                value={formulario.tipo}
                onChange={(e) => setFormulario((f) => ({ ...f, tipo: e.target.value }))}
                className="mt-1 block w-full rounded-xl border border-jardin-borde px-3 py-2 text-sm"
              >
                {['Petición', 'Queja', 'Reclamo', 'Sugerencia'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-sm text-jardin-verde">
              Asunto
              <input
                type="text"
                value={formulario.asunto}
                maxLength={150}
                placeholder="Resume tu solicitud en una frase"
                onChange={(e) => setFormulario((f) => ({ ...f, asunto: e.target.value }))}
                className="mt-1 block w-full rounded-xl border border-jardin-borde px-3 py-2 text-sm"
              />
            </label>

            <label className="mt-3 block text-sm text-jardin-verde">
              Descripción
              <textarea
                rows={5}
                value={formulario.descripcion}
                maxLength={2000}
                placeholder="Cuéntanos qué pasó, con el número de pedido si lo tienes."
                onChange={(e) => setFormulario((f) => ({ ...f, descripcion: e.target.value }))}
                className="mt-1 block w-full rounded-xl border border-jardin-borde px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAbriendo(false)}
                className="rounded-full border border-jardin-borde px-4 py-2 text-sm font-semibold text-jardin-verde"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex items-center gap-2 rounded-full bg-jardin-verde px-5 py-2 text-sm font-bold text-white hover:bg-jardin-verdeOscuro disabled:opacity-60"
              >
                <Send size={15} /> {enviando ? 'Radicando…' : 'Radicar solicitud'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default MisPqr;
