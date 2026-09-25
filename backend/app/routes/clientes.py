from fastapi import APIRouter, Depends
from ..database import get_db_connection
from ..security import require_roles

router = APIRouter(prefix="/api/v1/clientes", tags=["Clientes"])


@router.get("")
def listar_clientes(current_user: dict = Depends(require_roles("Administrador", "Empleado"))):
    # Lista mínima (solo clientes) para los selectores de ventas y facturación.
    # A diferencia de /admin/users no expone documentos, teléfonos ni estados.
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """SELECT id_usuario, nombres, apellidos, email
                FROM usuarios
                WHERE rol_id = 2
                ORDER BY nombres, apellidos"""
            )
            return {"success": True, "data": cursor.fetchall()}
    finally:
        connection.close()
