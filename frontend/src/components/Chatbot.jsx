import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';

import { API_URL } from '../api/config';
import { authHeaders } from '../api/client';

const SUGERENCIAS = [
  '¿Hacen envíos a domicilio?',
  '¿Qué flores tienen disponibles?',
  '¿Cómo radico una PQR?',
  '¿Qué medios de pago aceptan?',
];

const SALUDO = {
  rol: 'assistant',
  texto: '¡Hola! Soy Flora, la asistente de MiJardín. Puedo ayudarte con el catálogo, los envíos, tus pedidos y las PQR. ¿Qué necesitas?',
};

/**
 * Chatbot de atención al cliente.
 *
 * Habla con /api/v1/chatbot/mensaje, que es quien llama al servicio de IA:
 * la clave nunca viaja al navegador. Funciona con o sin sesión iniciada;
 * si hay token, el backend asocia la conversación al usuario.
 */
function Chatbot() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([SALUDO]);
  const [texto, setTexto] = useState('');
  const [idConversacion, setIdConversacion] = useState(null);
  const [escribiendo, setEscribiendo] = useState(false);
  const [motor, setMotor] = useState(null);
  const finalRef = useRef(null);

  // Mantiene la vista abajo cuando entra un mensaje nuevo.
  useEffect(() => {
    if (abierto) finalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto, escribiendo]);

  const enviar = async (contenido) => {
    const pregunta = (contenido ?? texto).trim();
    if (!pregunta || escribiendo) return;

    setMensajes((actuales) => [...actuales, { rol: 'user', texto: pregunta }]);
    setTexto('');
    setEscribiendo(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/v1/chatbot/mensaje`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ mensaje: pregunta, id_conversacion: idConversacion }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok || !datos.success) {
        throw new Error(datos.detail || datos.message || 'No pude responder en este momento.');
      }

      setIdConversacion(datos.id_conversacion);
      setMotor(datos.motor);
      setMensajes((actuales) => [...actuales, { rol: 'assistant', texto: datos.respuesta }]);
    } catch (error) {
      setMensajes((actuales) => [...actuales, {
        rol: 'assistant',
        texto: `${error.message} Mientras tanto puedes escribirnos por WhatsApp.`,
      }]);
    } finally {
      setEscribiendo(false);
    }
  };

  return (
    <>
      {/* Botón flotante. Se ubica arriba del botón de WhatsApp. */}
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar el chat con Flora' : 'Abrir el chat con Flora'}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#23392E] text-[#FAF3E7] shadow-lg transition hover:bg-[#1A2B22] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7C9473]"
      >
        {abierto ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {abierto && (
        <section
          role="dialog"
          aria-label="Chat con Flora, asistente de MiJardín"
          className="fixed bottom-44 right-5 z-40 flex h-[26rem] w-[21rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[#E4DCCD] bg-white shadow-2xl"
        >
          <header className="flex items-center gap-2 bg-[#23392E] px-4 py-3 text-[#FAF3E7]">
            <Sparkles size={18} />
            <div className="min-w-0">
              <p className="font-medium leading-tight">Flora</p>
              <p className="truncate text-xs text-[#B9CBB2]">
                {motor === 'reglas' ? 'Respuestas guiadas' : 'Asistente con IA'} · MiJardín
              </p>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAF3E7] p-3">
            {mensajes.map((mensaje, indice) => (
              <div
                key={indice}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mensaje.rol === 'user'
                    ? 'ml-auto bg-[#23392E] text-[#FAF3E7]'
                    : 'bg-white text-[#23392E] shadow-sm'
                }`}
              >
                {mensaje.texto}
              </div>
            ))}

            {escribiendo && (
              <p className="w-fit rounded-2xl bg-white px-3 py-2 text-sm text-[#6B7B70] shadow-sm">
                Flora está escribiendo…
              </p>
            )}

            {mensajes.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGERENCIAS.map((sugerencia) => (
                  <button
                    key={sugerencia}
                    onClick={() => enviar(sugerencia)}
                    className="rounded-full border border-[#7C9473] bg-white px-3 py-1 text-xs text-[#3C5A45] hover:bg-[#EEF4EB]"
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            )}
            <div ref={finalRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-[#E4DCCD] bg-white p-2">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
              placeholder="Escribe tu pregunta…"
              maxLength={1000}
              className="flex-1 rounded-full border border-[#E4DCCD] px-3 py-2 text-sm focus:border-[#7C9473] focus:outline-none"
            />
            <button
              onClick={() => enviar()}
              disabled={escribiendo || !texto.trim()}
              aria-label="Enviar mensaje"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D9714E] text-white transition hover:bg-[#C15E3D] disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default Chatbot;
