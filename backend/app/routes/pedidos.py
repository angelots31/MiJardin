from fastapi import APIRouter, Depends, HTTPException, status
from ..database import get_db_connection
from ..schemas import CrearPedido, ActualizarPedido
from ..security import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/pedidos", tags=["Pedidos"])

ESTADOS_VALIDOS = {
    "Pendiente", "En revisión", "Modificado", "Confirmado",
    "En preparación", "En camino", "Entregado", "Cancelado"
}


def _pedido_completo(cursor, pedido_id: int):
    cursor.execute(
        """SELECT p.id_pedido, p.id_cliente, p.estado, p.total, p.observaciones,
                  p.fecha_creacion, p.fecha_actualizacion,
                  u.nombres, u.apellidos, u.email, u.telefono, u.direccion
           FROM pedidos p
           INNER JOIN usuarios u ON u.id_usuario = p.id_cliente
           WHERE p.id_pedido=%s""",
        (pedido_id,),
    )
    pedido = cursor.fetchone()
    if not pedido:
        return None

    cursor.execute(
        """SELECT id_detalle, id_producto, nombre_producto, cantidad, precio, subtotal
           FROM detalle_pedido
           WHERE id_pedido=%s ORDER BY id_detalle""",
        (pedido_id,),
    )
    pedido["items"] = cursor.fetchall()
    return pedido


def _items_con_precios(cursor, items):
    if not items:
        raise HTTPException(status_code=400, detail="El pedido debe tener al menos un producto.")

    normalizados = []
    total = 0
    for item in items:
        if item.cantidad < 1:
            raise HTTPException(status_code=400, detail="La cantidad de cada producto debe ser mayor a 0.")

        id_producto = item.id_producto
        nombre = item.nombre_producto.strip()
        precio = float(item.precio)

        # Si corresponde a un producto real de la BD, el servidor manda sobre nombre/precio.
        if id_producto is not None:
            cursor.execute(
                "SELECT id_producto, nombre, precio FROM productos WHERE id_producto=%s",
                (id_producto,),
            )
            producto = cursor.fetchone()
            if not producto:
                raise HTTPException(status_code=400, detail=f"El producto #{id_producto} no existe.")
            nombre = producto["nombre"]
            precio = float(producto["precio"])

        if not nombre:
            raise HTTPException(status_code=400, detail="Cada producto debe tener un nombre.")
        if precio < 0:
            raise HTTPException(status_code=400, detail="El precio no puede ser negativo.")

        subtotal = round(precio * item.cantidad, 2)
        total += subtotal
        normalizados.append({
            "id_producto": id_producto,
            "nombre_producto": nombre,
            "cantidad": item.cantidad,
            "precio": precio,
            "subtotal": subtotal,
        })

    return normalizados, round(total, 2)


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_pedido(
    pedido: CrearPedido,
    current_user: dict = Depends(require_roles("Cliente")),
):
    cliente_id = int(current_user["id_usuario"])
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            items, total = _items_con_precios(cursor, pedido.items)
            cursor.execute(
                "INSERT INTO pedidos (id_cliente, estado, total, observaciones) VALUES (%s, 'Pendiente', %s, %s)",
                (cliente_id, total, pedido.observaciones or None),
            )
            pedido_id = cursor.lastrowid
            cursor.executemany(
                """INSERT INTO detalle_pedido
                   (id_pedido, id_producto, nombre_producto, cantidad, precio, subtotal)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                [
                    (pedido_id, item["id_producto"], item["nombre_producto"], item["cantidad"], item["precio"], item["subtotal"])
                    for item in items
                ],
            )
        connection.commit()
        return {"success": True, "message": "Pedido creado correctamente.", "id_pedido": pedido_id, "total": total}
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


@router.get("/mis-pedidos")
def mis_pedidos(current_user: dict = Depends(require_roles("Cliente"))):
    cliente_id = int(current_user["id_usuario"])
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """SELECT id_pedido, estado, total, observaciones, fecha_creacion, fecha_actualizacion
                   FROM pedidos WHERE id_cliente=%s ORDER BY fecha_creacion DESC""",
                (cliente_id,),
            )
            pedidos = cursor.fetchall()
            for pedido in pedidos:
                cursor.execute(
                    """SELECT id_detalle, id_producto, nombre_producto, cantidad, precio, subtotal
                       FROM detalle_pedido WHERE id_pedido=%s ORDER BY id_detalle""",
                    (pedido["id_pedido"],),
                )
                pedido["items"] = cursor.fetchall()
            return {"success": True, "data": pedidos}
    finally:
        connection.close()


@router.get("")
def todos_los_pedidos(current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """SELECT p.id_pedido, p.id_cliente, p.estado, p.total, p.observaciones,
                          p.fecha_creacion, p.fecha_actualizacion,
                          u.nombres, u.apellidos, u.email, u.telefono, u.direccion
                   FROM pedidos p INNER JOIN usuarios u ON u.id_usuario=p.id_cliente
                   ORDER BY p.fecha_creacion DESC"""
            )
            pedidos = cursor.fetchall()
            for pedido in pedidos:
                cursor.execute(
                    """SELECT id_detalle, id_producto, nombre_producto, cantidad, precio, subtotal
                       FROM detalle_pedido WHERE id_pedido=%s ORDER BY id_detalle""",
                    (pedido["id_pedido"],),
                )
                pedido["items"] = cursor.fetchall()
            return {"success": True, "data": pedidos}
    finally:
        connection.close()


@router.get("/{pedido_id}")
def obtener_pedido(pedido_id: int, current_user: dict = Depends(get_current_user)):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            pedido = _pedido_completo(cursor, pedido_id)
            if not pedido:
                raise HTTPException(status_code=404, detail="Pedido no encontrado.")
            if current_user.get("rol_nombre") == "Cliente" and int(current_user.get("id_usuario")) != int(pedido["id_cliente"]):
                raise HTTPException(status_code=403, detail="No puedes consultar este pedido.")
            if current_user.get("rol_nombre") not in {"Cliente", "Administrador", "Empleado"}:
                raise HTTPException(status_code=403, detail="No tienes permisos para consultar pedidos.")
            return {"success": True, "data": pedido}
    finally:
        connection.close()


@router.put("/{pedido_id}")
def actualizar_pedido(
    pedido_id: int,
    cambios: ActualizarPedido,
    current_user: dict = Depends(require_roles("Administrador", "Empleado")),
):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_pedido FROM pedidos WHERE id_pedido=%s", (pedido_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Pedido no encontrado.")

            if cambios.estado is not None and cambios.estado not in ESTADOS_VALIDOS:
                raise HTTPException(status_code=400, detail="Estado de pedido inválido.")

            nuevo_total = None
            items = None
            if cambios.items is not None:
                items, nuevo_total = _items_con_precios(cursor, cambios.items)
                cursor.execute("DELETE FROM detalle_pedido WHERE id_pedido=%s", (pedido_id,))
                cursor.executemany(
                    """INSERT INTO detalle_pedido
                       (id_pedido, id_producto, nombre_producto, cantidad, precio, subtotal)
                       VALUES (%s,%s,%s,%s,%s,%s)""",
                    [
                        (pedido_id, item["id_producto"], item["nombre_producto"], item["cantidad"], item["precio"], item["subtotal"])
                        for item in items
                    ],
                )

            campos = []
            valores = []
            if nuevo_total is not None:
                campos.append("total=%s")
                valores.append(nuevo_total)
            if cambios.estado is not None:
                campos.append("estado=%s")
                valores.append(cambios.estado)
            if cambios.observaciones is not None:
                campos.append("observaciones=%s")
                valores.append(cambios.observaciones or None)

            if cambios.items is not None and cambios.estado is None:
                campos.append("estado='Modificado'")

            if campos:
                valores.append(pedido_id)
                cursor.execute(f"UPDATE pedidos SET {', '.join(campos)} WHERE id_pedido=%s", valores)

        connection.commit()
        return {"success": True, "message": "Pedido actualizado correctamente."}
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
