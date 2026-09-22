from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ..database import get_db_connection
from ..security import get_current_user, require_roles
from ..schemas import CrearPQR, ResponderPQR
from ..comercial import generar_consecutivo

router = APIRouter(prefix="/api/v1/pqr", tags=["PQR"])


def _pqr_por_id(cursor, id_pqr: int):
    cursor.execute(
        """
        SELECT p.*,
               CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
               c.email AS cliente_email,
               CONCAT(u.nombres, ' ', u.apellidos) AS respondida_por
        FROM pqr p
        INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
        LEFT  JOIN usuarios u ON u.id_usuario = p.id_usuario_responde
        WHERE p.id_pqr = %s
        """,
        (id_pqr,),
    )
    return cursor.fetchone()


@router.post("", status_code=status.HTTP_201_CREATED)
def registrar_pqr(datos: CrearPQR, current_user: dict = Depends(require_roles("Cliente"))):
    """El cliente radica una petición, queja, reclamo o sugerencia."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            radicado = generar_consecutivo(cursor, "pqr", "radicado", "PQR")
            cursor.execute(
                """
                INSERT INTO pqr (radicado, id_cliente, tipo, asunto, descripcion, estado)
                VALUES (%s, %s, %s, %s, %s, 'Pendiente')
                """,
                (radicado, int(current_user["id_usuario"]), datos.tipo, datos.asunto, datos.descripcion),
            )
            id_pqr = cursor.lastrowid
            registro = _pqr_por_id(cursor, id_pqr)
        connection.commit()
        return {
            "success": True,
            "message": f"Radicamos tu solicitud con el número {radicado}.",
            "radicado": radicado,
            "data": registro,
        }
    except Exception as error:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/mis-pqr")
def mis_pqr(current_user: dict = Depends(require_roles("Cliente"))):
    """El cliente consulta el estado de sus propias solicitudes."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) AS respondida_por
                FROM pqr p
                LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario_responde
                WHERE p.id_cliente = %s
                ORDER BY p.fecha_registro DESC
                """,
                (int(current_user["id_usuario"]),),
            )
            return {"success": True, "data": cursor.fetchall()}
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("")
def listar_pqr(
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    id_cliente: Optional[int] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    buscar: Optional[str] = Query(None, description="Radicado o asunto"),
):
    """Bandeja de PQR para el equipo, con filtros."""
    condiciones, valores = [], []
    if estado:
        condiciones.append("p.estado = %s")
        valores.append(estado)
    if tipo:
        condiciones.append("p.tipo = %s")
        valores.append(tipo)
    if id_cliente:
        condiciones.append("p.id_cliente = %s")
        valores.append(id_cliente)
    if fecha_inicio:
        condiciones.append("DATE(p.fecha_registro) >= %s")
        valores.append(fecha_inicio)
    if fecha_fin:
        condiciones.append("DATE(p.fecha_registro) <= %s")
        valores.append(fecha_fin)
    if buscar:
        condiciones.append("(p.radicado LIKE %s OR p.asunto LIKE %s)")
        valores.extend([f"%{buscar}%", f"%{buscar}%"])

    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT p.*,
                       CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
                       c.email AS cliente_email,
                       CONCAT(u.nombres, ' ', u.apellidos) AS respondida_por
                FROM pqr p
                INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
                LEFT  JOIN usuarios u ON u.id_usuario = p.id_usuario_responde
                {where}
                ORDER BY FIELD(p.estado, 'Pendiente', 'En proceso', 'Respondida', 'Cerrada'),
                         p.fecha_registro DESC
                """,
                valores,
            )
            registros = cursor.fetchall()
        pendientes = sum(1 for r in registros if r["estado"] in ("Pendiente", "En proceso"))
        return {
            "success": True,
            "data": registros,
            "resumen": {"total": len(registros), "pendientes": pendientes},
        }
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/{id_pqr}")
def obtener_pqr(id_pqr: int, current_user: dict = Depends(get_current_user)):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            registro = _pqr_por_id(cursor, id_pqr)
            if not registro:
                raise HTTPException(status_code=404, detail="La solicitud no existe.")
            if current_user.get("rol_nombre") == "Cliente" and int(current_user["id_usuario"]) != int(registro["id_cliente"]):
                raise HTTPException(status_code=403, detail="No puedes consultar esta solicitud.")
        return {"success": True, "data": registro}
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.patch("/{id_pqr}")
def gestionar_pqr(
    id_pqr: int,
    cambios: ResponderPQR,
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
):
    """Responde la solicitud o cambia su estado."""
    if cambios.estado is None and cambios.respuesta is None:
        raise HTTPException(status_code=400, detail="Envía una respuesta o un nuevo estado.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_pqr FROM pqr WHERE id_pqr = %s", (id_pqr,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="La solicitud no existe.")

            campos, valores = [], []
            if cambios.respuesta is not None:
                campos.append("respuesta = %s")
                valores.append(cambios.respuesta.strip() or None)
                campos.append("id_usuario_responde = %s")
                valores.append(int(current_user["id_usuario"]))
                campos.append("fecha_respuesta = %s")
                valores.append(datetime.now())
                # Responder sin indicar estado la marca como Respondida.
                if cambios.estado is None:
                    campos.append("estado = 'Respondida'")
            if cambios.estado is not None:
                campos.append("estado = %s")
                valores.append(cambios.estado)

            valores.append(id_pqr)
            cursor.execute(f"UPDATE pqr SET {', '.join(campos)} WHERE id_pqr = %s", valores)
            registro = _pqr_por_id(cursor, id_pqr)
        connection.commit()
        return {"success": True, "message": "Solicitud actualizada.", "data": registro}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()
