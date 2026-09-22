from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from typing import Optional

from ..database import get_db_connection
from ..security import get_current_user, require_roles
from ..schemas import CrearVenta, VentaDesdePedido, ActualizarVenta
from ..comercial import (
    IVA_PORCENTAJE,
    calcular_totales,
    construir_lineas,
    generar_consecutivo,
    venta_completa,
)

router = APIRouter(prefix="/api/v1/ventas", tags=["Ventas"])


def _insertar_lineas(cursor, id_venta: int, lineas: list[dict]):
    cursor.executemany(
        """
        INSERT INTO detalle_ventas
            (id_venta, tipo_item, id_producto, id_servicio, nombre_item,
             cantidad, precio_unitario, descuento, subtotal)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            (
                id_venta, l["tipo_item"], l["id_producto"], l["id_servicio"],
                l["nombre_item"], l["cantidad"], l["precio_unitario"],
                l["descuento"], l["subtotal"],
            )
            for l in lineas
        ],
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def registrar_venta(
    venta: CrearVenta,
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
):
    """Registra una venta manual (mostrador o telefónica)."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE id_usuario = %s AND rol_id = 2",
                (venta.id_cliente,),
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="El cliente indicado no existe o no tiene rol de Cliente.",
                )

            lineas, subtotal_bruto = construir_lineas(cursor, venta.items)
            totales = calcular_totales(subtotal_bruto, venta.descuento, venta.aplica_impuestos)
            numero = generar_consecutivo(cursor, "ventas", "numero_venta", "VT")

            cursor.execute(
                """
                INSERT INTO ventas
                    (numero_venta, id_cliente, id_usuario_registra, id_pedido,
                     subtotal, descuento, impuestos, total, metodo_pago, estado, observaciones)
                VALUES (%s, %s, %s, NULL, %s, %s, %s, %s, %s, 'Pagada', %s)
                """,
                (
                    numero, venta.id_cliente, int(current_user["id_usuario"]),
                    totales["subtotal"], totales["descuento"], totales["impuestos"],
                    totales["total"], venta.metodo_pago, venta.observaciones,
                ),
            )
            id_venta = cursor.lastrowid
            _insertar_lineas(cursor, id_venta, lineas)
            resultado = venta_completa(cursor, id_venta)

        connection.commit()
        return {
            "success": True,
            "message": f"Venta {numero} registrada correctamente.",
            "id_venta": id_venta,
            "numero_venta": numero,
            "data": resultado,
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.post("/desde-pedido", status_code=status.HTTP_201_CREATED)
def venta_desde_pedido(
    datos: VentaDesdePedido,
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
):
    """
    Convierte un pedido de la tienda en una venta formal.

    Es el puente entre el módulo de pedidos (cuarto avance) y el módulo
    comercial: toma los ítems del pedido, les calcula impuestos y crea
    la venta enlazada mediante id_pedido.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM pedidos WHERE id_pedido = %s", (datos.id_pedido,))
            pedido = cursor.fetchone()
            if not pedido:
                raise HTTPException(status_code=404, detail="El pedido no existe.")

            cursor.execute("SELECT id_venta, numero_venta FROM ventas WHERE id_pedido = %s", (datos.id_pedido,))
            existente = cursor.fetchone()
            if existente:
                raise HTTPException(
                    status_code=409,
                    detail=f"El pedido ya fue facturado en la venta {existente['numero_venta']}.",
                )

            cursor.execute(
                "SELECT id_producto, nombre_producto, cantidad, precio FROM detalle_pedido WHERE id_pedido = %s",
                (datos.id_pedido,),
            )
            detalles = cursor.fetchall()
            if not detalles:
                raise HTTPException(status_code=400, detail="El pedido no tiene productos.")

            lineas = []
            subtotal_bruto = 0.0
            for d in detalles:
                subtotal = round(float(d["precio"]) * int(d["cantidad"]), 2)
                subtotal_bruto += subtotal
                lineas.append({
                    "tipo_item": "producto",
                    "id_producto": d["id_producto"],
                    "id_servicio": None,
                    "nombre_item": d["nombre_producto"],
                    "cantidad": int(d["cantidad"]),
                    "precio_unitario": round(float(d["precio"]), 2),
                    "descuento": 0.0,
                    "subtotal": subtotal,
                })

            totales = calcular_totales(round(subtotal_bruto, 2), datos.descuento, datos.aplica_impuestos)
            numero = generar_consecutivo(cursor, "ventas", "numero_venta", "VT")

            cursor.execute(
                """
                INSERT INTO ventas
                    (numero_venta, id_cliente, id_usuario_registra, id_pedido,
                     subtotal, descuento, impuestos, total, metodo_pago, estado, observaciones)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pagada', %s)
                """,
                (
                    numero, pedido["id_cliente"], int(current_user["id_usuario"]), datos.id_pedido,
                    totales["subtotal"], totales["descuento"], totales["impuestos"],
                    totales["total"], datos.metodo_pago, datos.observaciones,
                ),
            )
            id_venta = cursor.lastrowid
            _insertar_lineas(cursor, id_venta, lineas)
            cursor.execute("UPDATE pedidos SET estado = 'Entregado' WHERE id_pedido = %s", (datos.id_pedido,))
            resultado = venta_completa(cursor, id_venta)

        connection.commit()
        return {
            "success": True,
            "message": f"Pedido #{datos.id_pedido} convertido en la venta {numero}.",
            "id_venta": id_venta,
            "numero_venta": numero,
            "data": resultado,
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
def historial_ventas(
    current_user: dict = Depends(get_current_user),
    fecha_inicio: Optional[str] = Query(None, description="AAAA-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="AAAA-MM-DD"),
    id_cliente: Optional[int] = None,
    estado: Optional[str] = None,
    id_producto: Optional[int] = None,
    id_servicio: Optional[int] = None,
    valor_min: Optional[float] = None,
    valor_max: Optional[float] = None,
    buscar: Optional[str] = Query(None, description="Número de venta o nombre del cliente"),
    limite: int = Query(200, ge=1, le=1000),
):
    """
    Historial de ventas con filtros.

    Un Cliente solo ve sus propias ventas, aunque intente filtrar por otro
    id_cliente: el filtro se sobrescribe con el id que viene en su token.
    """
    es_cliente = current_user.get("rol_nombre") == "Cliente"
    if es_cliente:
        id_cliente = int(current_user["id_usuario"])

    condiciones = []
    valores = []

    if fecha_inicio:
        condiciones.append("DATE(v.fecha_venta) >= %s")
        valores.append(fecha_inicio)
    if fecha_fin:
        condiciones.append("DATE(v.fecha_venta) <= %s")
        valores.append(fecha_fin)
    if id_cliente:
        condiciones.append("v.id_cliente = %s")
        valores.append(id_cliente)
    if estado:
        condiciones.append("v.estado = %s")
        valores.append(estado)
    if valor_min is not None:
        condiciones.append("v.total >= %s")
        valores.append(valor_min)
    if valor_max is not None:
        condiciones.append("v.total <= %s")
        valores.append(valor_max)
    if id_producto:
        condiciones.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta = v.id_venta AND d.id_producto = %s)")
        valores.append(id_producto)
    if id_servicio:
        condiciones.append("EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta = v.id_venta AND d.id_servicio = %s)")
        valores.append(id_servicio)
    if buscar:
        condiciones.append("(v.numero_venta LIKE %s OR CONCAT(c.nombres,' ',c.apellidos) LIKE %s)")
        valores.extend([f"%{buscar}%", f"%{buscar}%"])

    where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""

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
                {where}
                ORDER BY v.fecha_venta DESC
                LIMIT %s
                """,
                (*valores, limite),
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

        total_periodo = sum(float(v["total"]) for v in ventas if v["estado"] != "Anulada")
        return {
            "success": True,
            "data": ventas,
            "resumen": {
                "cantidad": len(ventas),
                "total": round(total_periodo, 2),
                "iva_porcentaje": IVA_PORCENTAJE,
            },
        }
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.get("/{id_venta}")
def obtener_venta(id_venta: int, current_user: dict = Depends(get_current_user)):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            venta = venta_completa(cursor, id_venta)
            if not venta:
                raise HTTPException(status_code=404, detail="La venta no existe.")
            if current_user.get("rol_nombre") == "Cliente" and int(current_user["id_usuario"]) != int(venta["id_cliente"]):
                raise HTTPException(status_code=403, detail="No puedes consultar esta venta.")
        return {"success": True, "data": venta}
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()


@router.patch("/{id_venta}")
def actualizar_venta(
    id_venta: int,
    cambios: ActualizarVenta,
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
):
    """Cambia el estado o las observaciones de una venta ya registrada."""
    campos, valores = [], []
    if cambios.estado is not None:
        campos.append("estado = %s")
        valores.append(cambios.estado)
    if cambios.observaciones is not None:
        campos.append("observaciones = %s")
        valores.append(cambios.observaciones or None)
    if not campos:
        raise HTTPException(status_code=400, detail="No enviaste ningún cambio.")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_venta FROM ventas WHERE id_venta = %s", (id_venta,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="La venta no existe.")

            valores.append(id_venta)
            cursor.execute(f"UPDATE ventas SET {', '.join(campos)} WHERE id_venta = %s", valores)

            # Anular una venta anula también su factura, para que los
            # reportes y los indicadores no la sigan contando.
            if cambios.estado == "Anulada":
                cursor.execute("UPDATE facturas SET estado = 'Anulada' WHERE id_venta = %s", (id_venta,))

            venta = venta_completa(cursor, id_venta)
        connection.commit()
        return {"success": True, "message": "Venta actualizada.", "data": venta}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as error:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": str(error)})
    finally:
        connection.close()
