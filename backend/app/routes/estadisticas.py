from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from ..database import get_db_connection
from ..security import get_current_user

router = APIRouter(prefix="/api/v1/estadisticas", tags=["Estadísticas"])


def _un_valor(cursor, sql: str, valores=()):
    cursor.execute(sql, valores)
    fila = cursor.fetchone() or {}
    return list(fila.values())[0] if fila else 0


@router.get("/dashboard")
def dashboard(current_user: dict = Depends(get_current_user)):
    """
    Indicadores para las tarjetas del dashboard.

    Devuelve un conjunto distinto según el rol que venga en el token:
    el cliente nunca recibe cifras globales del negocio.
    """
    rol = current_user.get("rol_nombre")
    id_usuario = int(current_user["id_usuario"])
    hoy = date.today().isoformat()

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            if rol == "Cliente":
                tarjetas = {
                    "mis_pedidos": _un_valor(cursor, "SELECT COUNT(*) AS v FROM pedidos WHERE id_cliente = %s", (id_usuario,)),
                    "mis_compras": _un_valor(cursor, "SELECT COUNT(*) AS v FROM ventas WHERE id_cliente = %s AND estado <> 'Anulada'", (id_usuario,)),
                    "total_comprado": float(_un_valor(cursor, "SELECT COALESCE(SUM(total),0) AS v FROM ventas WHERE id_cliente = %s AND estado <> 'Anulada'", (id_usuario,)) or 0),
                    "mis_facturas": _un_valor(cursor, "SELECT COUNT(*) AS v FROM facturas WHERE id_cliente = %s", (id_usuario,)),
                    "pqr_abiertas": _un_valor(cursor, "SELECT COUNT(*) AS v FROM pqr WHERE id_cliente = %s AND estado IN ('Pendiente','En proceso')", (id_usuario,)),
                }
                return {"success": True, "rol": rol, "data": tarjetas}

            # Administrador y Empleado comparten la vista operativa;
            # solo el Administrador ve el conteo de usuarios del sistema.
            tarjetas = {
                "productos": _un_valor(cursor, "SELECT COUNT(*) AS v FROM productos"),
                "servicios": _un_valor(cursor, "SELECT COUNT(*) AS v FROM servicios"),
                "pedidos_pendientes": _un_valor(cursor, "SELECT COUNT(*) AS v FROM pedidos WHERE estado IN ('Pendiente','En revisión','Modificado')"),
                "ventas_total": _un_valor(cursor, "SELECT COUNT(*) AS v FROM ventas WHERE estado <> 'Anulada'"),
                "ventas_hoy": _un_valor(cursor, "SELECT COUNT(*) AS v FROM ventas WHERE DATE(fecha_venta) = %s AND estado <> 'Anulada'", (hoy,)),
                "ingresos_hoy": float(_un_valor(cursor, "SELECT COALESCE(SUM(total),0) AS v FROM ventas WHERE DATE(fecha_venta) = %s AND estado <> 'Anulada'", (hoy,)) or 0),
                "ingresos_total": float(_un_valor(cursor, "SELECT COALESCE(SUM(total),0) AS v FROM ventas WHERE estado <> 'Anulada'") or 0),
                "facturas_emitidas": _un_valor(cursor, "SELECT COUNT(*) AS v FROM facturas WHERE estado <> 'Anulada'"),
                "facturado_total": float(_un_valor(cursor, "SELECT COALESCE(SUM(total),0) AS v FROM facturas WHERE estado <> 'Anulada'") or 0),
                "pqr_recibidas": _un_valor(cursor, "SELECT COUNT(*) AS v FROM pqr"),
                "pqr_pendientes": _un_valor(cursor, "SELECT COUNT(*) AS v FROM pqr WHERE estado IN ('Pendiente','En proceso')"),
                "conversaciones_chatbot": _un_valor(cursor, "SELECT COUNT(*) AS v FROM conversaciones"),
            }
            if rol == "Administrador":
                tarjetas["usuarios"] = _un_valor(cursor, "SELECT COUNT(*) AS v FROM usuarios")
                tarjetas["usuarios_activos"] = _un_valor(cursor, "SELECT COUNT(*) AS v FROM usuarios WHERE estado = 'activo'")
                tarjetas["clientes"] = _un_valor(cursor, "SELECT COUNT(*) AS v FROM usuarios WHERE rol_id = 2")

        return {"success": True, "rol": rol, "data": tarjetas}
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/ventas")
def serie_ventas(
    current_user: dict = Depends(get_current_user),
    agrupar: str = Query("dia", pattern="^(dia|semana|mes)$"),
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    id_producto: Optional[int] = None,
    id_servicio: Optional[int] = None,
    id_cliente: Optional[int] = None,
    estado: Optional[str] = None,
):
    """
    Series para los gráficos de barras y de línea.

    `agrupar` decide la granularidad: día, semana o mes. Sin fechas usa
    los últimos 30 días.
    """
    if not fecha_fin:
        fecha_fin = date.today().isoformat()
    if not fecha_inicio:
        fecha_inicio = (date.fromisoformat(fecha_fin) - timedelta(days=29)).isoformat()

    if current_user.get("rol_nombre") == "Cliente":
        id_cliente = int(current_user["id_usuario"])

    formatos = {
        "dia": "DATE_FORMAT(v.fecha_venta, '%%Y-%%m-%%d')",
        "semana": "DATE_FORMAT(v.fecha_venta, '%%x-S%%v')",
        "mes": "DATE_FORMAT(v.fecha_venta, '%%Y-%%m')",
    }
    etiqueta = formatos[agrupar]

    condiciones = ["DATE(v.fecha_venta) BETWEEN %s AND %s", "v.estado <> 'Anulada'"]
    valores = [fecha_inicio, fecha_fin]
    if estado:
        condiciones[1] = "v.estado = %s"
        valores.append(estado)
    if id_cliente:
        condiciones.append("v.id_cliente = %s")
        valores.append(id_cliente)
    if id_producto:
        condiciones.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta = v.id_venta AND d.id_producto = %s)")
        valores.append(id_producto)
    if id_servicio:
        condiciones.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta = v.id_venta AND d.id_servicio = %s)")
        valores.append(id_servicio)

    where = " AND ".join(condiciones)

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT {etiqueta} AS periodo,
                       COUNT(*)              AS ventas,
                       COALESCE(SUM(v.total), 0) AS ingresos
                FROM ventas v
                WHERE {where}
                GROUP BY periodo
                ORDER BY periodo
                """,
                valores,
            )
            serie = [
                {"periodo": f["periodo"], "ventas": int(f["ventas"]), "ingresos": float(f["ingresos"])}
                for f in cursor.fetchall()
            ]

            # Ranking de los ítems más vendidos del periodo
            cursor.execute(
                f"""
                SELECT d.nombre_item AS item,
                       d.tipo_item   AS tipo,
                       SUM(d.cantidad) AS unidades,
                       SUM(d.subtotal) AS ingresos
                FROM detalle_ventas d
                INNER JOIN ventas v ON v.id_venta = d.id_venta
                WHERE {where}
                GROUP BY d.nombre_item, d.tipo_item
                ORDER BY unidades DESC
                LIMIT 8
                """,
                valores,
            )
            top_items = [
                {
                    "item": f["item"],
                    "tipo": f["tipo"],
                    "unidades": int(f["unidades"]),
                    "ingresos": float(f["ingresos"]),
                }
                for f in cursor.fetchall()
            ]

            # Distribución por estado, para el dashboard administrativo
            cursor.execute(
                """
                SELECT estado, COUNT(*) AS cantidad, COALESCE(SUM(total),0) AS ingresos
                FROM ventas
                WHERE DATE(fecha_venta) BETWEEN %s AND %s
                GROUP BY estado
                """,
                (fecha_inicio, fecha_fin),
            )
            por_estado = [
                {"estado": f["estado"], "cantidad": int(f["cantidad"]), "ingresos": float(f["ingresos"])}
                for f in cursor.fetchall()
            ]

        return {
            "success": True,
            "periodo": {"inicio": fecha_inicio, "fin": fecha_fin, "agrupar": agrupar},
            "serie": serie,
            "top_items": top_items,
            "por_estado": por_estado,
            "totales": {
                "ventas": sum(p["ventas"] for p in serie),
                "ingresos": round(sum(p["ingresos"] for p in serie), 2),
            },
        }
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()
