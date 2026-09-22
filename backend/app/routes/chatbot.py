from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse

from ..database import get_db_connection
from ..security import get_current_user, require_roles
from ..schemas import MensajeChat
from ..ia import IA_ACTIVA, IA_MODELO, construir_contexto, generar_respuesta

router = APIRouter(prefix="/api/v1/chatbot", tags=["Chatbot"])


def _usuario_opcional(authorization: Optional[str]) -> Optional[int]:
    """
    El chatbot atiende también a visitantes sin sesión.

    Por eso no usa Depends(get_current_user): si viene un token válido lo
    aprovecha para guardar la conversación con el usuario; si no viene o
    está vencido, simplemente sigue como anónimo.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        import jwt
        from ..security import JWT_SECRET
        datos = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return int(datos.get("id_usuario"))
    except Exception:
        return None


@router.get("/estado")
def estado_chatbot():
    """Indica si el servicio de IA está configurado (sin exponer la clave)."""
    return {
        "success": True,
        "ia_activa": IA_ACTIVA,
        "modelo": IA_MODELO if IA_ACTIVA else "respuestas por reglas",
        "asistente": "Flora",
    }


@router.post("/mensaje")
async def enviar_mensaje(datos: MensajeChat, authorization: Optional[str] = Header(None)):
    """
    Envía un mensaje al chatbot y devuelve la respuesta.

    Guarda tanto la pregunta como la respuesta en las tablas
    `conversaciones` y `mensajes`, de modo que la conversación se puede
    continuar después y el equipo puede revisarla.
    """
    id_usuario = _usuario_opcional(authorization)
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Recuperar o crear la conversación
            id_conversacion = datos.id_conversacion
            if id_conversacion:
                cursor.execute(
                    "SELECT id_conversacion FROM conversaciones WHERE id_conversacion = %s",
                    (id_conversacion,),
                )
                if not cursor.fetchone():
                    id_conversacion = None

            if not id_conversacion:
                titulo = datos.mensaje[:60] + ("…" if len(datos.mensaje) > 60 else "")
                cursor.execute(
                    "INSERT INTO conversaciones (id_usuario, titulo, canal) VALUES (%s, %s, 'web')",
                    (id_usuario, titulo or "Conversación con Flora"),
                )
                id_conversacion = cursor.lastrowid

            # 2. Guardar el mensaje del usuario
            cursor.execute(
                "INSERT INTO mensajes (id_conversacion, rol, contenido) VALUES (%s, 'user', %s)",
                (id_conversacion, datos.mensaje),
            )

            # 3. Historial de la conversación, en el formato que espera la IA
            cursor.execute(
                """
                SELECT rol, contenido FROM mensajes
                WHERE id_conversacion = %s AND rol <> 'system'
                ORDER BY id_mensaje
                """,
                (id_conversacion,),
            )
            historial = [{"role": m["rol"], "content": m["contenido"]} for m in cursor.fetchall()]

            # 4. Catálogo real, para que la IA no invente precios
            cursor.execute("SELECT nombre, precio FROM productos ORDER BY id_producto DESC LIMIT 15")
            productos = cursor.fetchall()
            cursor.execute("SELECT nombre, precio FROM servicios ORDER BY id_servicio LIMIT 10")
            servicios = cursor.fetchall()
            contexto = construir_contexto(productos, servicios)

        connection.commit()

        # 5. Pedir la respuesta (fuera de la transacción: es una llamada de red)
        texto, motor = await generar_respuesta(historial, contexto)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO mensajes (id_conversacion, rol, contenido) VALUES (%s, 'assistant', %s)",
                (id_conversacion, texto),
            )
            cursor.execute(
                "UPDATE conversaciones SET ultima_actividad = NOW() WHERE id_conversacion = %s",
                (id_conversacion,),
            )
        connection.commit()

        return {
            "success": True,
            "id_conversacion": id_conversacion,
            "respuesta": texto,
            "motor": motor,
        }
    except Exception as error:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/conversaciones/{id_conversacion}")
def obtener_conversacion(id_conversacion: int):
    """Devuelve los mensajes de una conversación para recuperarla al recargar."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM conversaciones WHERE id_conversacion = %s",
                (id_conversacion,),
            )
            conversacion = cursor.fetchone()
            if not conversacion:
                raise HTTPException(status_code=404, detail="La conversación no existe.")
            cursor.execute(
                """
                SELECT id_mensaje, rol, contenido, fecha_envio FROM mensajes
                WHERE id_conversacion = %s AND rol <> 'system' ORDER BY id_mensaje
                """,
                (id_conversacion,),
            )
            conversacion["mensajes"] = cursor.fetchall()
        return {"success": True, "data": conversacion}
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/conversaciones")
def listar_conversaciones(current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    """Bandeja de conversaciones del chatbot, para revisar qué preguntan los clientes."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.*,
                       CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
                       (SELECT COUNT(*) FROM mensajes m WHERE m.id_conversacion = c.id_conversacion) AS total_mensajes
                FROM conversaciones c
                LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
                ORDER BY c.ultima_actividad DESC
                LIMIT 100
                """
            )
            return {"success": True, "data": cursor.fetchall()}
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()
