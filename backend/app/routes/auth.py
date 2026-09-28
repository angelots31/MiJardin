import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from ..correo import (
    CorreoNoConfigurado,
    enviar_correo_recuperacion,
    smtp_configurado,
)
from ..database import get_db_connection
from ..schemas import RegisterUser, LoginUser, SolicitarRecuperacion, RestablecerPassword
from ..security import pwd_context, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])

# Cuánto vale el enlace de recuperación y de qué tamaño es el token.
MINUTOS_VIGENCIA_RESET = int(os.getenv("RESET_PASSWORD_MINUTOS", "60"))
_URL_FRONTEND = (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/")

# La tabla de tokens se crea sola la primera vez que se usa, así el proyecto
# funciona sin migraciones manuales.
_TABLA_RESETS_LISTA = False


def _asegurar_tabla_resets(cursor):
    global _TABLA_RESETS_LISTA
    if _TABLA_RESETS_LISTA:
        return
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS password_resets (
            id_reset INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expira_en DATETIME NOT NULL,
            usado TINYINT(1) NOT NULL DEFAULT 0,
            creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_password_resets_token (token_hash),
            INDEX idx_password_resets_usuario (id_usuario)
        )
        """
    )
    _TABLA_RESETS_LISTA = True


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

            cursor.execute("SELECT id_usuario FROM usuarios WHERE numero_documento = %s LIMIT 1",
                           (user.numero_documento,))
            if cursor.fetchone():
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={"success": False, "message": "El número de documento ya está registrado."}
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


@router.post("/refresh")
def refresh(current_user: dict = Depends(get_current_user)):
    """
    Emite un token nuevo a partir de uno todavía válido.

    El frontend lo llama de forma proactiva antes de que expire para no
    cortar la sesión de quien está trabajando.
    """
    token = create_access_token({
        "id_usuario": current_user["id_usuario"],
        "rol_id": current_user["rol_id"],
        "rol_nombre": current_user["rol_nombre"],
    })
    return {"success": True, "token": token}


@router.post("/forgot-password")
def forgot_password(data: SolicitarRecuperacion):
    """Paso 1: recibe el correo y envía el enlace de recuperación.

    Siempre responde igual exista o no la cuenta, para no revelar qué
    correos están registrados.
    """
    if not smtp_configurado():
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "message": "El servicio de correo no está configurado en el servidor. "
                           "Contacta al administrador.",
            },
        )

    respuesta_generica = {
        "success": True,
        "message": "Si el correo está registrado, te enviamos un enlace para "
                   "restablecer tu contraseña. Revisa también la carpeta de spam.",
    }
    email_normalizado = data.email.strip().lower()
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            _asegurar_tabla_resets(cursor)
            cursor.execute(
                "SELECT id_usuario, nombres, email FROM usuarios WHERE email = %s LIMIT 1",
                (email_normalizado,),
            )
            usuario = cursor.fetchone()

            if not usuario:
                return JSONResponse(status_code=200, content=respuesta_generica)

            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            expira_en = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
                minutes=MINUTOS_VIGENCIA_RESET
            )
            # Un enlace nuevo invalida los anteriores del mismo usuario.
            cursor.execute(
                "UPDATE password_resets SET usado = 1 WHERE id_usuario = %s AND usado = 0",
                (usuario["id_usuario"],),
            )
            cursor.execute(
                "INSERT INTO password_resets (id_usuario, token_hash, expira_en) VALUES (%s, %s, %s)",
                (usuario["id_usuario"], token_hash, expira_en),
            )
        connection.commit()
    except Exception:
        connection.rollback()
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "No se pudo iniciar la recuperación. Intenta más tarde."},
        )
    finally:
        connection.close()

    enlace = f"{_URL_FRONTEND}/restablecer-password?token={token}"
    try:
        enviar_correo_recuperacion(
            usuario["email"], usuario["nombres"], enlace, MINUTOS_VIGENCIA_RESET
        )
    except CorreoNoConfigurado:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"success": False, "message": "El servicio de correo no está configurado en el servidor."},
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "success": False,
                "message": "No pudimos enviar el correo de recuperación. Intenta más tarde.",
            },
        )
    return respuesta_generica


@router.post("/reset-password")
def reset_password(data: RestablecerPassword):
    """Paso 2: valida el token del enlace y guarda la contraseña nueva."""
    token_hash = hashlib.sha256(data.token.strip().encode()).hexdigest()
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            _asegurar_tabla_resets(cursor)
            cursor.execute(
                "SELECT id_reset, id_usuario, expira_en, usado FROM password_resets "
                "WHERE token_hash = %s LIMIT 1",
                (token_hash,),
            )
            registro = cursor.fetchone()
            if not registro or registro["usado"]:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"success": False, "message": "El enlace no es válido o ya fue usado. Solicita uno nuevo."},
                )
            if registro["expira_en"] < datetime.now(timezone.utc).replace(tzinfo=None):
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"success": False, "message": "El enlace expiró. Solicita uno nuevo."},
                )

            password_hash = pwd_context.hash(data.password)
            cursor.execute(
                "UPDATE usuarios SET password = %s WHERE id_usuario = %s",
                (password_hash, registro["id_usuario"]),
            )
            # Se invalidan todos los enlaces del usuario, incluido este.
            cursor.execute(
                "UPDATE password_resets SET usado = 1 WHERE id_usuario = %s",
                (registro["id_usuario"],),
            )
        connection.commit()
        return {
            "success": True,
            "message": "Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.",
        }
    except Exception:
        connection.rollback()
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "No se pudo actualizar la contraseña. Intenta más tarde."},
        )
    finally:
        connection.close()
