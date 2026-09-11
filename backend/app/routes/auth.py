from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from ..database import get_db_connection
from ..schemas import RegisterUser, LoginUser
from ..security import pwd_context, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: RegisterUser):
    # Las validaciones de Pydantic (nombre, teléfono, doc, password, etc.)
    # ya se ejecutaron automáticamente al recibir el request.
    email_normalizado = user.email.strip().lower()
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM usuarios WHERE email = %s LIMIT 1", (email_normalizado,))
            if cursor.fetchone():
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={"success": False, "message": "El correo electrónico ya está registrado."}
                )

            password_hash = pwd_context.hash(user.password)
            rol_cliente = 2  # Cliente

            sql = """
                INSERT INTO usuarios
                (nombres, apellidos, tipo_documento, numero_documento, direccion, telefono, email, password, rol_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                user.nombres, user.apellidos, user.tipo_documento, user.numero_documento,
                user.direccion, user.telefono, email_normalizado, password_hash, rol_cliente
            ))
        connection.commit()
        return {"success": True, "message": "Usuario registrado correctamente."}
    except Exception:
        connection.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": "Error interno del servidor."})
    finally:
        connection.close()


@router.post("/login")
def login(user: LoginUser):
    email_normalizado = user.email.strip().lower()
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.*, r.nombre AS rol_nombre
                FROM usuarios u
                INNER JOIN roles r ON u.rol_id = r.id_rol
                WHERE u.email = %s LIMIT 1
                """,
                (email_normalizado,)
            )
            db_user = cursor.fetchone()

            if not db_user or not pwd_context.verify(user.password, db_user['password']):
                return JSONResponse(status_code=401, content={"success": False, "message": "Credenciales inválidas."})

            if db_user['estado'] == 'inactivo':
                return JSONResponse(status_code=403, content={"success": False, "message": "Tu cuenta está inactiva. Contacta al administrador."})

            cursor.execute("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = %s", (db_user['id_usuario'],))
        connection.commit()

        token = create_access_token({
            "id_usuario": db_user['id_usuario'],
            "rol_id": db_user['rol_id'],
            "rol_nombre": db_user['rol_nombre'],
        })

        return {
            "success": True,
            "message": "Login exitoso",
            "token": token,
            "usuario": {
                "id_usuario": db_user['id_usuario'],
                "nombres": db_user['nombres'],
                "email": db_user['email'],
                "rol_id": db_user['rol_id'],
                "rol_nombre": db_user['rol_nombre'],
            }
        }
    finally:
        connection.close()


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    """Permite al frontend validar el token guardado y recuperar el rol actual."""
    return {"success": True, "usuario": current_user}
