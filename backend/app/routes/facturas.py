from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, Response
from typing import Optional

from ..database import get_db_connection
from ..security import get_current_user, require_roles
from ..schemas import CrearFactura, ActualizarFactura
from ..comercial import generar_consecutivo, venta_completa
from ..documentos import factura_pdf

router = APIRouter(prefix="/api/v1/facturas", tags=["Facturas"])


def _factura_completa(cursor, id_factura: int):
    cursor.execute(
        """
        SELECT f.*,
               v.numero_venta, v.metodo_pago, v.fecha_venta,
               CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
               c.email         AS cliente_email,
               c.numero_documento AS cliente_documento,
               c.tipo_documento AS cliente_tipo_documento,
               c.telefono      AS cliente_telefono,
               c.direccion     AS cliente_direccion
        FROM facturas f
        INNER JOIN ventas   v ON v.id_venta   = f.id_venta
        INNER JOIN usuarios c ON c.id_usuario = f.id_cliente
        WHERE f.id_factura = %s
        """,
        (id_factura,),
    )
    factura = cursor.fetchone()
    if not factura:
        return None

    cursor.execute(
        """
        SELECT nombre_item, tipo_item, cantidad, precio_unitario, descuento, subtotal
        FROM detalle_facturas WHERE id_factura = %s ORDER BY id_detalle_factura
        """,
        (id_factura,),
    )
    factura["items"] = cursor.fetchall()
    return factura


@router.post("", status_code=status.HTTP_201_CREATED)
def emitir_factura(
    datos: CrearFactura,
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
):
    """
    Emite la factura de una venta.

    Copia los valores de la venta al momento de facturar: si después se
    corrige la venta, la factura ya emitida conserva sus cifras.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            venta = venta_completa(cursor, datos.id_venta)
            if not venta:
                raise HTTPException(status_code=404, detail="La venta no existe.")
            if venta["estado"] == "Anulada":
                raise HTTPException(status_code=400, detail="No se puede facturar una venta anulada.")

            cursor.execute("SELECT numero_factura FROM facturas WHERE id_venta = %s", (datos.id_venta,))
            existente = cursor.fetchone()
            if existente:
                raise HTTPException(
                    status_code=409,
                    detail=f"Esta venta ya tiene la factura {existente['numero_factura']}.",
                )

            numero = generar_consecutivo(cursor, "facturas", "numero_factura", "FC")
            cursor.execute(
                """
                INSERT INTO facturas
                    (numero_factura, id_venta, id_cliente, subtotal, descuento,
                     impuestos, total, estado, observaciones)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'Emitida', %s)
                """,
                (
                    numero, datos.id_venta, venta["id_cliente"], venta["subtotal"],
                    venta["descuento"], venta["impuestos"], venta["total"], datos.observaciones,
                ),
            )
            id_factura = cursor.lastrowid

            cursor.executemany(
                """
                INSERT INTO detalle_facturas
                    (id_factura, nombre_item, tipo_item, cantidad, precio_unitario, descuento, subtotal)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        id_factura, i["nombre_item"], i["tipo_item"], i["cantidad"],
                        i["precio_unitario"], i["descuento"], i["subtotal"],
                    )
                    for i in venta["items"]
                ],
            )
            factura = _factura_completa(cursor, id_factura)

        connection.commit()
        return {
            "success": True,
            "message": f"Factura {numero} emitida.",
            "id_factura": id_factura,
            "numero_factura": numero,
            "data": factura,
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("")
def consultar_facturas(
    current_user: dict = Depends(get_current_user),
    numero: Optional[str] = Query(None, description="Número de factura o de venta"),
    id_cliente: Optional[int] = None,
    cliente: Optional[str] = Query(None, description="Nombre del cliente"),
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    estado: Optional[str] = None,
    limite: int = Query(200, ge=1, le=1000),
):
    """Consulta de facturas por número, cliente, fecha o estado."""
    if current_user.get("rol_nombre") == "Cliente":
        id_cliente = int(current_user["id_usuario"])

    condiciones, valores = [], []
    if numero:
        condiciones.append("(f.numero_factura LIKE %s OR v.numero_venta LIKE %s)")
        valores.extend([f"%{numero}%", f"%{numero}%"])
    if id_cliente:
        condiciones.append("f.id_cliente = %s")
        valores.append(id_cliente)
    if cliente:
        condiciones.append("CONCAT(c.nombres, ' ', c.apellidos) LIKE %s")
        valores.append(f"%{cliente}%")
    if fecha_inicio:
        condiciones.append("DATE(f.fecha_emision) >= %s")
        valores.append(fecha_inicio)
    if fecha_fin:
        condiciones.append("DATE(f.fecha_emision) <= %s")
        valores.append(fecha_fin)
    if estado:
        condiciones.append("f.estado = %s")
        valores.append(estado)

    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT f.*, v.numero_venta, v.metodo_pago,
                       CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
                       c.email AS cliente_email
                FROM facturas f
                INNER JOIN ventas   v ON v.id_venta   = f.id_venta
                INNER JOIN usuarios c ON c.id_usuario = f.id_cliente
                {where}
                ORDER BY f.fecha_emision DESC
                LIMIT %s
                """,
                (*valores, limite),
            )
            facturas = cursor.fetchall()
            for factura in facturas:
                cursor.execute(
                    """
                    SELECT nombre_item, tipo_item, cantidad, precio_unitario, descuento, subtotal
                    FROM detalle_facturas WHERE id_factura = %s ORDER BY id_detalle_factura
                    """,
                    (factura["id_factura"],),
                )
                factura["items"] = cursor.fetchall()

        facturado = sum(float(f["total"]) for f in facturas if f["estado"] != "Anulada")
        return {
            "success": True,
            "data": facturas,
            "resumen": {"cantidad": len(facturas), "total": round(facturado, 2)},
        }
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/{id_factura}")
def obtener_factura(id_factura: int, current_user: dict = Depends(get_current_user)):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            factura = _factura_completa(cursor, id_factura)
            if not factura:
                raise HTTPException(status_code=404, detail="La factura no existe.")
            if current_user.get("rol_nombre") == "Cliente" and int(current_user["id_usuario"]) != int(factura["id_cliente"]):
                raise HTTPException(status_code=403, detail="No puedes consultar esta factura.")
        return {"success": True, "data": factura}
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/{id_factura}/pdf")
def descargar_factura(id_factura: int, current_user: dict = Depends(get_current_user)):
    """Descarga la factura en PDF. El cliente solo puede bajar las suyas."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            factura = _factura_completa(cursor, id_factura)
            if not factura:
                raise HTTPException(status_code=404, detail="La factura no existe.")
            if current_user.get("rol_nombre") == "Cliente" and int(current_user["id_usuario"]) != int(factura["id_cliente"]):
                raise HTTPException(status_code=403, detail="No puedes descargar esta factura.")

        pdf = factura_pdf(factura)
        nombre = f"{factura['numero_factura']}.pdf"
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
        )
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.patch("/{id_factura}")
def actualizar_factura(
    id_factura: int,
    cambios: ActualizarFactura,
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_factura FROM facturas WHERE id_factura = %s", (id_factura,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="La factura no existe.")
            cursor.execute("UPDATE facturas SET estado = %s WHERE id_factura = %s", (cambios.estado, id_factura))
            factura = _factura_completa(cursor, id_factura)
        connection.commit()
        return {"success": True, "message": f"Factura marcada como {cambios.estado}.", "data": factura}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()
