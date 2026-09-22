"""
Utilidades compartidas del módulo comercial (quinto avance).

Aquí vive la lógica que usan por igual las ventas, las facturas y los
reportes: numeración consecutiva, cálculo de impuestos y armado de las
líneas de detalle con precios verificados contra la base de datos.
"""

import os
from datetime import datetime

from fastapi import HTTPException

# Porcentaje de impuesto configurable por variable de entorno.
# En Colombia el IVA general es del 19%.
try:
    IVA_PORCENTAJE = float(os.getenv("IVA_PORCENTAJE", "19"))
except ValueError:
    IVA_PORCENTAJE = 19.0


def generar_consecutivo(cursor, tabla: str, columna: str, prefijo: str) -> str:
    """
    Genera un número consecutivo del estilo VT-2026-0007 / FC-2026-0007.

    Busca cuántos registros existen ya con el prefijo del año actual y
    suma uno. Se ejecuta dentro de la misma transacción que el INSERT,
    así que no puede quedar un número a medias.
    """
    anio = datetime.now().year
    patron = f"{prefijo}-{anio}-%"
    cursor.execute(
        f"SELECT COUNT(*) AS total FROM {tabla} WHERE {columna} LIKE %s",
        (patron,),
    )
    fila = cursor.fetchone() or {"total": 0}
    return f"{prefijo}-{anio}-{int(fila['total']) + 1:04d}"


def calcular_totales(subtotal_bruto: float, descuento: float, aplica_impuestos: bool) -> dict:
    """
    Toma el subtotal de las líneas y devuelve subtotal, impuestos y total.

    El descuento se aplica ANTES de calcular el impuesto, que es como
    funciona la facturación en Colombia.
    """
    descuento = max(0.0, float(descuento or 0))
    if descuento > subtotal_bruto:
        raise HTTPException(
            status_code=400,
            detail="El descuento no puede ser mayor que el subtotal de la venta.",
        )
    base = subtotal_bruto - descuento
    impuestos = round(base * (IVA_PORCENTAJE / 100), 2) if aplica_impuestos else 0.0
    return {
        "subtotal": round(subtotal_bruto, 2),
        "descuento": round(descuento, 2),
        "impuestos": impuestos,
        "total": round(base + impuestos, 2),
    }


def construir_lineas(cursor, items) -> tuple[list[dict], float]:
    """
    Normaliza las líneas de una venta.

    Igual que en el módulo de pedidos: si la línea apunta a un producto o
    servicio real, el precio se vuelve a leer de la base de datos y se
    ignora el que mandó el navegador. Así nadie puede manipular el precio
    desde las herramientas de desarrollador.
    """
    if not items:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un ítem.")

    lineas = []
    subtotal_bruto = 0.0

    for item in items:
        tipo = item.tipo_item
        nombre = (item.nombre_item or "").strip()
        precio = float(item.precio_unitario or 0)

        if tipo == "producto" and item.id_producto is not None:
            cursor.execute(
                "SELECT id_producto, nombre, precio FROM productos WHERE id_producto = %s",
                (item.id_producto,),
            )
            registro = cursor.fetchone()
            if not registro:
                raise HTTPException(
                    status_code=400,
                    detail=f"El producto #{item.id_producto} no existe en el catálogo.",
                )
            nombre = registro["nombre"]
            precio = float(registro["precio"])

        elif tipo == "servicio" and item.id_servicio is not None:
            cursor.execute(
                "SELECT id_servicio, nombre, precio FROM servicios WHERE id_servicio = %s",
                (item.id_servicio,),
            )
            registro = cursor.fetchone()
            if not registro:
                raise HTTPException(
                    status_code=400,
                    detail=f"El servicio #{item.id_servicio} no existe.",
                )
            nombre = registro["nombre"]
            precio = float(registro["precio"])

        if not nombre:
            raise HTTPException(status_code=400, detail="Cada ítem necesita un nombre.")
        if precio < 0:
            raise HTTPException(status_code=400, detail="El precio no puede ser negativo.")

        descuento_linea = float(item.descuento or 0)
        bruto = precio * item.cantidad
        if descuento_linea > bruto:
            raise HTTPException(
                status_code=400,
                detail=f"El descuento de '{nombre}' supera el valor de la línea.",
            )
        subtotal_linea = round(bruto - descuento_linea, 2)
        subtotal_bruto += subtotal_linea

        lineas.append({
            "tipo_item": tipo,
            "id_producto": item.id_producto if tipo == "producto" else None,
            "id_servicio": item.id_servicio if tipo == "servicio" else None,
            "nombre_item": nombre,
            "cantidad": item.cantidad,
            "precio_unitario": round(precio, 2),
            "descuento": round(descuento_linea, 2),
            "subtotal": subtotal_linea,
        })

    return lineas, round(subtotal_bruto, 2)


def venta_completa(cursor, id_venta: int):
    """Devuelve la venta con los datos del cliente y su lista de ítems."""
    cursor.execute(
        """
        SELECT v.*,
               CONCAT(c.nombres, ' ', c.apellidos) AS cliente,
               c.email        AS cliente_email,
               c.numero_documento AS cliente_documento,
               c.direccion    AS cliente_direccion,
               c.telefono     AS cliente_telefono,
               CONCAT(u.nombres, ' ', u.apellidos) AS registrada_por
        FROM ventas v
        INNER JOIN usuarios c ON c.id_usuario = v.id_cliente
        LEFT  JOIN usuarios u ON u.id_usuario = v.id_usuario_registra
        WHERE v.id_venta = %s
        """,
        (id_venta,),
    )
    venta = cursor.fetchone()
    if not venta:
        return None

    cursor.execute(
        """
        SELECT id_detalle_venta, tipo_item, id_producto, id_servicio,
               nombre_item, cantidad, precio_unitario, descuento, subtotal
        FROM detalle_ventas
        WHERE id_venta = %s
        ORDER BY id_detalle_venta
        """,
        (id_venta,),
    )
    venta["items"] = cursor.fetchall()
    return venta
