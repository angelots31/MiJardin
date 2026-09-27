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
            cursor.execute("SELECT id_usuario FROM usuarios WHERE numero_documento = %s LIMIT 1",
                           (user.numero_documento,))
            if cursor.fetchone():
                return JSONResponse(status_code=409, content={"success": False, "message": "El número de documento ya está registrado."})
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
    # Las tablas comerciales (facturas, ventas, pedidos, pqr) apuntan al
    # cliente con ON DELETE CASCADE: si se borrara el usuario se llevaría
    # su historial de facturación. Solo se permite borrar sin historial.
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Una cuenta activa no se elimina directamente: primero debe
            # inactivarse, para no dejar sin acceso a un usuario en uso.
            cursor.execute("SELECT estado FROM usuarios WHERE id_usuario = %s", (user_id,))
            usuario = cursor.fetchone()
            if not usuario:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail="El usuario que intentas eliminar no existe.")
            if usuario["estado"] == "activo":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No puedes eliminar una cuenta activa. Márcala como inactiva y vuelve a intentarlo.",
                )
            cursor.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM facturas WHERE id_cliente = %s) AS facturas,
                    (SELECT COUNT(*) FROM ventas   WHERE id_cliente = %s) AS ventas,
                    (SELECT COUNT(*) FROM pedidos  WHERE id_cliente = %s) AS pedidos,
                    (SELECT COUNT(*) FROM pqr      WHERE id_cliente = %s) AS pqr
                """,
                (user_id, user_id, user_id, user_id),
            )
            historial = cursor.fetchone()
            motivos = []
            if historial["facturas"]:
                motivos.append(f"{historial['facturas']} factura(s)")
            if historial["ventas"]:
                motivos.append(f"{historial['ventas']} venta(s)")
            if historial["pedidos"]:
                motivos.append(f"{historial['pedidos']} pedido(s)")
            if historial["pqr"]:
                motivos.append(f"{historial['pqr']} PQR")
            if motivos:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede eliminar este usuario porque tiene historial de facturación o actividad asociada: "
                    + ", ".join(motivos)
                    + ".",
                )
            cursor.execute("DELETE FROM usuarios WHERE id_usuario=%s", (user_id,))
        connection.commit()
        return {"success": True, "message": "Usuario eliminado exitosamente."}
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo eliminar el usuario.")
    finally:
        connection.close()
