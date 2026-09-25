from fastapi import APIRouter, Depends, HTTPException, status
from ..database import get_db_connection
from ..schemas import Producto
from ..security import require_roles

router = APIRouter(prefix="/api/v1/productos", tags=["Productos"])


@router.get("")
def get_productos():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM productos ORDER BY fecha_creacion DESC")
            return {"success": True, "data": cursor.fetchall()}
    finally:
        connection.close()


@router.post("", status_code=status.HTTP_201_CREATED)
def add_producto(prod: Producto, current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO productos (nombre, descripcion, precio, imagen) VALUES (%s, %s, %s, %s)",
                (prod.nombre, prod.descripcion, prod.precio, prod.imagen)
            )
        connection.commit()
        return {"success": True, "message": "Producto agregado exitosamente"}
    finally:
        connection.close()


@router.put("/{producto_id}")
def update_producto(producto_id: int, prod: Producto, current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE productos SET nombre=%s, descripcion=%s, precio=%s, imagen=%s WHERE id_producto=%s",
                (prod.nombre, prod.descripcion, prod.precio, prod.imagen, producto_id)
            )
        connection.commit()
        return {"success": True, "message": "Producto actualizado exitosamente."}
    finally:
        connection.close()


@router.delete("/{producto_id}")
def delete_producto(producto_id: int, current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    # detalle_ventas y detalle_pedido referencian el producto: borrarlo
    # perdería el historial de ventas/facturación en el que aparece.
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM detalle_ventas WHERE id_producto = %s) AS ventas,
                    (SELECT COUNT(*) FROM detalle_pedido WHERE id_producto = %s) AS pedidos
                """,
                (producto_id, producto_id),
            )
            historial = cursor.fetchone()
            motivos = []
            if historial["ventas"]:
                motivos.append(f"{historial['ventas']} venta(s)")
            if historial["pedidos"]:
                motivos.append(f"{historial['pedidos']} pedido(s)")
            if motivos:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede eliminar este producto porque tiene facturación asociada: "
                    + ", ".join(motivos)
                    + ".",
                )
            cursor.execute("DELETE FROM productos WHERE id_producto=%s", (producto_id,))
        connection.commit()
        return {"success": True, "message": "Producto eliminado exitosamente."}
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo eliminar el producto.")
    finally:
        connection.close()
