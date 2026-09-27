from fastapi import APIRouter, Depends, HTTPException, status
from ..database import get_db_connection
from ..schemas import Producto
from ..security import require_roles

router = APIRouter(prefix="/api/v1/servicios", tags=["Servicios"])


@router.get("")
def get_servicios():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM servicios ORDER BY fecha_creacion DESC")
            return {"success": True, "data": cursor.fetchall()}
    finally:
        connection.close()


@router.post("", status_code=status.HTTP_201_CREATED)
def add_servicio(serv: Producto, current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO servicios (nombre, descripcion, precio, imagen) VALUES (%s, %s, %s, %s)",
                (serv.nombre, serv.descripcion, serv.precio, serv.imagen)
            )
        connection.commit()
        return {"success": True, "message": "Servicio agregado exitosamente"}
    finally:
        connection.close()


@router.put("/{servicio_id}")
def update_servicio(servicio_id: int, serv: Producto, current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE servicios SET nombre=%s, descripcion=%s, precio=%s, imagen=%s WHERE id_servicio=%s",
                (serv.nombre, serv.descripcion, serv.precio, serv.imagen, servicio_id)
            )
        connection.commit()
        return {"success": True, "message": "Servicio actualizado exitosamente."}
    finally:
        connection.close()


@router.delete("/{servicio_id}")
def delete_servicio(servicio_id: int, current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    # Igual que con los productos, un servicio con facturación asociada no
    # se borra: detalle_ventas lo referencia y se perdería el historial.
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS ventas FROM detalle_ventas WHERE id_servicio = %s",
                (servicio_id,),
            )
            historial = cursor.fetchone() or {"ventas": 0}
            if historial["ventas"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede eliminar este servicio porque tiene facturación asociada: "
                    + f"{historial['ventas']} venta(s).",
                )
            cursor.execute("DELETE FROM servicios WHERE id_servicio=%s", (servicio_id,))
        connection.commit()
        return {"success": True, "message": "Servicio eliminado exitosamente."}
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo eliminar el servicio.")
    finally:
        connection.close()
