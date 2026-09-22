"""
Integración del chatbot con un servicio de Inteligencia Artificial.

La clave NUNCA se escribe aquí: se lee de la variable de entorno IA_API_KEY.
El cliente habla el formato de "chat completions", que es compatible con
OpenAI, Groq, Together, OpenRouter y varios proveedores más, así que para
cambiar de proveedor basta con cambiar IA_BASE_URL y IA_MODELO en el .env.

Si no hay clave configurada, el chatbot sigue funcionando con respuestas
por reglas. Así el sitio nunca se queda mudo mientras desarrollas.
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

IA_API_KEY = os.getenv("IA_API_KEY", "").strip()
IA_BASE_URL = os.getenv("IA_BASE_URL", "https://api.openai.com/v1").rstrip("/")
IA_MODELO = os.getenv("IA_MODELO", "gpt-4o-mini")
IA_TIMEOUT = float(os.getenv("IA_TIMEOUT", "30"))

IA_ACTIVA = bool(IA_API_KEY)

PERSONALIDAD = """Eres Flora, la asistente virtual de MiJardín, una floristería
digital colombiana con sede en Medellín, Antioquia.

Tu trabajo es:
- Resolver preguntas frecuentes sobre la tienda, los envíos y los pagos.
- Orientar sobre los productos y servicios del catálogo.
- Acompañar el proceso de compra paso a paso.
- Recibir peticiones, quejas y reclamos y explicar cómo radicarlos.

Reglas:
- Responde en español, en máximo 4 frases, con un tono cálido y cercano.
- Habla solo de MiJardín y de flores. Si te preguntan otra cosa, redirige
  con amabilidad.
- Los precios están en pesos colombianos.
- No inventes productos, precios ni políticas: si no tienes el dato, dilo
  y sugiere escribir por WhatsApp o radicar una PQR.
- Para radicar una PQR, indica que debe iniciar sesión e ir a
  "Mis solicitudes (PQR)" desde su cuenta.
"""

# Respuestas por reglas: se usan cuando no hay API Key configurada.
REGLAS = [
    (("horario", "atienden", "abierto", "atencion"),
     "Atendemos de lunes a sábado, de 8:00 a.m. a 7:00 p.m., y los domingos "
     "de 9:00 a.m. a 2:00 p.m. La tienda en línea recibe pedidos las 24 horas."),
    (("envio", "envío", "domicilio", "entrega", "reparto"),
     "Hacemos entregas en todo el Valle de Aburrá el mismo día si el pedido "
     "entra antes de las 3:00 p.m. Para otras ciudades el despacho tarda de 1 a 3 días hábiles."),
    (("pago", "pagar", "tarjeta", "nequi", "efectivo", "transferencia"),
     "Puedes pagar con tarjeta, transferencia, Nequi o contraentrega. "
     "Al confirmar el pedido te emitimos la factura de venta en PDF."),
    (("pqr", "queja", "reclamo", "peticion", "petición", "sugerencia", "reclamar"),
     "Lamento el inconveniente. Para radicar una PQR inicia sesión y entra a "
     "\"Mis solicitudes (PQR)\": allí registras el caso y te damos un número de radicado "
     "para seguir su estado."),
    (("factura", "facturacion", "facturación"),
     "Cada compra genera una factura de venta que puedes descargar en PDF desde "
     "\"Mis compras\" en tu cuenta."),
    (("pedido", "comprar", "carrito", "ordenar"),
     "Para comprar entra a la Tienda, agrega las flores al carrito y confirma el pedido. "
     "Si quieres algo distinto, puedes armar un ramo personalizado eligiendo las flores una a una."),
    (("ramo", "personalizado", "arreglo", "bouquet"),
     "Puedes armar tu propio ramo en la sección Tienda: eliges las flores, la envoltura "
     "y agregas una nota. El precio se calcula según la cantidad de flores."),
    (("rosa", "girasol", "tulipan", "tulipán", "orquidea", "orquídea", "flor"),
     "Tenemos rosas, girasoles, tulipanes, orquídeas y varias flores de temporada. "
     "Mira el catálogo completo en la sección Tienda para ver precios y disponibilidad."),
    (("hola", "buenas", "buenos dias", "buenas tardes", "saludos"),
     "¡Hola! Soy Flora, la asistente de MiJardín. ¿Buscas flores para una ocasión especial "
     "o necesitas ayuda con un pedido?"),
    (("gracias", "muchas gracias"),
     "Con mucho gusto. Si necesitas algo más sobre tus flores, aquí estoy."),
]

RESPUESTA_GENERICA = (
    "Puedo ayudarte con el catálogo, los envíos, los pagos, tus pedidos y el registro "
    "de PQR. ¿Sobre cuál de esos temas quieres saber?"
)


def respuesta_por_reglas(mensaje: str) -> str:
    texto = mensaje.lower()
    for claves, respuesta in REGLAS:
        if any(clave in texto for clave in claves):
            return respuesta
    return RESPUESTA_GENERICA


def construir_contexto(productos: list[dict], servicios: list[dict]) -> str:
    """Arma un resumen del catálogo real para que la IA no invente precios."""
    lineas = []
    if productos:
        lineas.append("Productos disponibles hoy:")
        for p in productos[:15]:
            lineas.append(f"- {p['nombre']}: ${float(p['precio']):,.0f} COP".replace(",", "."))
    if servicios:
        lineas.append("Servicios disponibles:")
        for s in servicios[:10]:
            lineas.append(f"- {s['nombre']}: ${float(s['precio']):,.0f} COP".replace(",", "."))
    return "\n".join(lineas) if lineas else "El catálogo está vacío por ahora."


async def generar_respuesta(historial: list[dict], contexto: str) -> tuple[str, str]:
    """
    Pide la respuesta al proveedor de IA.

    Devuelve (texto, motor), donde motor indica si respondió la IA o el
    respaldo por reglas. El frontend usa ese dato para mostrar un aviso.
    """
    ultimo = next((m["content"] for m in reversed(historial) if m["role"] == "user"), "")

    if not IA_ACTIVA:
        return respuesta_por_reglas(ultimo), "reglas"

    mensajes = [{"role": "system", "content": f"{PERSONALIDAD}\n\n{contexto}"}]
    mensajes.extend(historial[-10:])  # solo las últimas vueltas, para no gastar tokens de más

    try:
        async with httpx.AsyncClient(timeout=IA_TIMEOUT) as client:
            respuesta = await client.post(
                f"{IA_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {IA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": IA_MODELO,
                    "messages": mensajes,
                    "max_tokens": 350,
                    "temperature": 0.6,
                },
            )
        if respuesta.status_code != 200:
            return respuesta_por_reglas(ultimo), "reglas"

        datos = respuesta.json()
        texto = datos["choices"][0]["message"]["content"].strip()
        return (texto or respuesta_por_reglas(ultimo)), "ia"
    except Exception:
        # Si el proveedor falla o no hay internet, el chat sigue respondiendo.
        return respuesta_por_reglas(ultimo), "reglas"
