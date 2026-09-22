from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, Response

from ..database import get_db_connection
from ..security import require_roles
from ..documentos import reporte_ventas_excel, reporte_ventas_pdf

router = APIRouter(prefix="/api/v1/reportes", tags=["Reportes"])


def _consultar_ventas(fecha_inicio: str, fecha_fin: str, estado: Optional[str], id_cliente: Optional[int]):
    """Trae las ventas del periodo junto con su detalle y calcula el resumen."""
    condiciones = ["DATE(v.fecha_venta) BETWEEN %s AND %s"]
    valores = [fecha_inicio, fecha_fin]
    if estado:
        condiciones.append("v.estado = %s")
        valores.append(estado)
    if id_cliente:
        condiciones.append("v.id_cliente = %s")
        valores.append(id_cliente)

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT v.*,
                       CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
                       c.email AS cliente_email,
                       f.numero_factura
                FROM ventas v
                INNER JOIN usuarios c ON c.id_usuario = v.id_cliente
                LEFT  JOIN facturas f ON f.id_venta   = v.id_venta
                WHERE {' AND '.join(condiciones)}
                ORDER BY v.fecha_venta ASC
                """,
                valores,
            )
            ventas = cursor.fetchall()
            for venta in ventas:
                cursor.execute(
                    """
                    SELECT nombre_item, tipo_item, cantidad, precio_unitario, descuento, subtotal
                    FROM detalle_ventas WHERE id_venta = %s ORDER BY id_detalle_venta
                    """,
                    (venta["id_venta"],),
                )
                venta["items"] = cursor.fetchall()
    finally:
        connection.close()

    validas = [v for v in ventas if v["estado"] != "Anulada"]
    total = sum(float(v["total"]) for v in validas)
    unidades = sum(int(i["cantidad"]) for v in validas for i in v["items"])
    resumen = {
        "cantidad": len(ventas),
        "total": round(total, 2),
        "promedio": round(total / len(validas), 2) if validas else 0.0,
        "unidades": unidades,
    }
    return ventas, resumen


def _rango(fecha: Optional[str], fecha_inicio: Optional[str], fecha_fin: Optional[str]):
    """
    Resuelve el periodo del reporte.

    Sin parámetros usa el día de hoy (reporte diario). Con `fecha` usa ese
    día. Con `fecha_inicio`/`fecha_fin` genera el reporte de un rango.
    """
    if fecha_inicio or fecha_fin:
        inicio = fecha_inicio or fecha_fin
        fin = fecha_fin or fecha_inicio
        etiqueta = inicio if inicio == fin else f"{inicio} a {fin}"
        return inicio, fin, etiqueta
    dia = fecha or date.today().isoformat()
    return dia, dia, dia


@router.get("/ventas")
def reporte_json(
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
    fecha: Optional[str] = Query(None, description="AAAA-MM-DD · por defecto hoy"),
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    estado: Optional[str] = None,
    id_cliente: Optional[int] = None,
):
    """Reporte de ventas en JSON, para mostrarlo en pantalla antes de exportar."""
    inicio, fin, etiqueta = _rango(fecha, fecha_inicio, fecha_fin)
    try:
        ventas, resumen = _consultar_ventas(inicio, fin, estado, id_cliente)
        return {"success": True, "periodo": etiqueta, "data": ventas, "resumen": resumen}
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})


@router.get("/ventas/pdf")
def reporte_pdf(
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
    fecha: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    estado: Optional[str] = None,
    id_cliente: Optional[int] = None,
):
    """Descarga el reporte de ventas en PDF."""
    inicio, fin, etiqueta = _rango(fecha, fecha_inicio, fecha_fin)
    try:
        ventas, resumen = _consultar_ventas(inicio, fin, estado, id_cliente)
        pdf = reporte_ventas_pdf(ventas, resumen, etiqueta, current_user.get("rol_nombre", ""))
        nombre = f"reporte-ventas-{inicio}.pdf" if inicio == fin else f"reporte-ventas-{inicio}_a_{fin}.pdf"
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
        )
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})


@router.get("/ventas/excel")
def reporte_excel(
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
    fecha: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    estado: Optional[str] = None,
    id_cliente: Optional[int] = None,
):
    """Descarga el mismo reporte en Excel (.xlsx) con filtros ya activados."""
    inicio, fin, etiqueta = _rango(fecha, fecha_inicio, fecha_fin)
    try:
        ventas, resumen = _consultar_ventas(inicio, fin, estado, id_cliente)
        xlsx = reporte_ventas_excel(ventas, resumen, etiqueta)
        nombre = f"reporte-ventas-{inicio}.xlsx" if inicio == fin else f"reporte-ventas-{inicio}_a_{fin}.xlsx"
        return Response(
            content=xlsx,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
        )
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
