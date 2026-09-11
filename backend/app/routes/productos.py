from fastapi import APIRouter, Depends, status
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
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM productos WHERE id_producto=%s", (producto_id,))
        connection.commit()
        return {"success": True, "message": "Producto eliminado exitosamente."}
    finally:
        connection.close()
