import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_EXPIRES_IN = os.getenv("JWT_EXPIRES_IN", "8h")
security = HTTPBearer()


def _parse_expires(value: str) -> timedelta:
    """Convierte '8h', '30m', '1d' o segundos puros en timedelta."""
    try:
        if value.endswith("h"):
            return timedelta(hours=int(value[:-1]))
        if value.endswith("m"):
            return timedelta(minutes=int(value[:-1]))
        if value.endswith("d"):
            return timedelta(days=int(value[:-1]))
        return timedelta(seconds=int(value))
    except (ValueError, AttributeError):
        return timedelta(hours=8)


def create_access_token(payload: dict) -> str:
    to_encode = payload.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + _parse_expires(JWT_EXPIRES_IN)
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión expiró, vuelve a iniciar sesión.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")


def require_roles(*roles_permitidos):
    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("rol_nombre") not in roles_permitidos:
            raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción.")
        return current_user
    return checker
