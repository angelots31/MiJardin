from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from ..database import get_db_connection
from ..schemas import AdminCreateUser, UpdateUser, EstadoUsuario
from ..security import pwd_context, require_roles

router = APIRouter(prefix="/api/v1/admin/users", tags=["Administración de usuarios"])


@router.post("", status_code=status.HTTP_201_CREATED)
def admin_create_user(user: AdminCreateUser, current_user: dict = Depends(require_roles("Administrador"))):
    # Las validaciones de Pydantic ya verifican rol_id, password, etc.
    email_normalizado = user.email.strip().lower()
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM usuarios WHERE email = %s LIMIT 1", (email_normalizado,))
            if cursor.fetchone():
                return JSONResponse(status_code=409, content={"success": False, "message": "El correo electrónico ya está registrado."})
            password_hash = pwd_context.hash(user.password)
            cursor.execute(
                """INSERT INTO usuarios
                (nombres, apellidos, tipo_documento, numero_documento, direccion, telefono, email, password, rol_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (user.nombres, user.apellidos, user.tipo_documento, user.numero_documento,
                 user.direccion, user.telefono, email_normalizado, password_hash, user.rol_id)
            )
        connection.commit()
        return {"success": True, "message": "Usuario creado exitosamente."}
    except Exception:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": "Error interno del servidor."})
    finally:
        connection.close()


@router.get("")
def get_users(current_user: dict = Depends(require_roles("Administrador"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, nombres, apellidos, tipo_documento, numero_documento, email, rol_id, estado FROM usuarios"
            )
            return {"success": True, "data": cursor.fetchall()}
    finally:
        connection.close()


@router.put("/{user_id}")
def update_user(user_id: int, user_data: UpdateUser, current_user: dict = Depends(require_roles("Administrador"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE usuarios SET nombres=%s, apellidos=%s, estado=%s WHERE id_usuario=%s",
                (user_data.nombres, user_data.apellidos, user_data.estado, user_id)
            )
        connection.commit()
        return {"success": True, "message": "Usuario actualizado exitosamente."}
    finally:
        connection.close()


@router.patch("/{user_id}/estado")
def cambiar_estado_usuario(user_id: int, data: EstadoUsuario, current_user: dict = Depends(require_roles("Administrador"))):
    if data.estado not in ("activo", "inactivo"):
        raise HTTPException(status_code=400, detail="Estado inválido. Usa 'activo' o 'inactivo'.")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("UPDATE usuarios SET estado=%s WHERE id_usuario=%s", (data.estado, user_id))
        connection.commit()
        return {"success": True, "message": f"Usuario marcado como {data.estado}."}
    finally:
        connection.close()


@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: dict = Depends(require_roles("Administrador"))):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM usuarios WHERE id_usuario=%s", (user_id,))
        connection.commit()
        return {"success": True, "message": "Usuario eliminado exitosamente."}
    finally:
        connection.close()
