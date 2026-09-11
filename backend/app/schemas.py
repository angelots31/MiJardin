import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

_NAME_RE = re.compile(r"^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$")
_DOC_RE = re.compile(r"^\d{6,12}$")
_PHONE_RE = re.compile(r"^\d{7,10}$")


class RegisterUser(BaseModel):
    nombres: str
    apellidos: str
    tipo_documento: str
    numero_documento: str
    direccion: str
    telefono: str
    email: EmailStr
    password: str

    @field_validator('nombres', 'apellidos')
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if len(v) < 2 or len(v) > 40:
            raise ValueError('Debe tener entre 2 y 40 caracteres.')
        if not _NAME_RE.match(v):
            raise ValueError('Solo se permiten letras, espacios, apóstrofes y guiones.')
        return v

    @field_validator('tipo_documento')
    @classmethod
    def validate_tipo_doc(cls, v):
        if v not in ('CC', 'TI', 'CE', 'Pasaporte'):
            raise ValueError('Tipo de documento inválido. Usa CC, TI, CE o Pasaporte.')
        return v

    @field_validator('numero_documento')
    @classmethod
    def validate_num_doc(cls, v):
        if not _DOC_RE.match(v):
            raise ValueError('El número de documento debe tener entre 6 y 12 dígitos.')
        return v

    @field_validator('direccion')
    @classmethod
    def validate_direccion(cls, v):
        v = v.strip()
        if len(v) < 5 or len(v) > 100:
            raise ValueError('La dirección debe tener entre 5 y 100 caracteres.')
        return v

    @field_validator('telefono')
    @classmethod
    def validate_telefono(cls, v):
        if not _PHONE_RE.match(v):
            raise ValueError('El teléfono debe tener entre 7 y 10 dígitos.')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 9:
            raise ValueError('La contraseña debe tener mínimo 9 caracteres.')
        if len(v) > 20:
            raise ValueError('La contraseña no debe superar los 20 caracteres.')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('La contraseña debe contener al menos una letra.')
        if not re.search(r'\d', v):
            raise ValueError('La contraseña debe contener al menos un número.')
        return v


class LoginUser(BaseModel):
    email: EmailStr
    password: str


class UpdateUser(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    estado: Optional[str] = None


class EstadoUsuario(BaseModel):
    estado: str  # 'activo' | 'inactivo'


class AdminCreateUser(RegisterUser):
    rol_id: int  # 1 Administrador, 2 Cliente, 4 Empleado

    @field_validator('rol_id')
    @classmethod
    def validate_rol(cls, v):
        if v not in (1, 2, 4):
            raise ValueError('Rol inválido. Usa 1 (Administrador), 2 (Cliente) o 4 (Empleado).')
        return v


class Producto(BaseModel):
    nombre: str
    descripcion: str = ""
    precio: float
    imagen: str = ""


class PedidoItem(BaseModel):
    id_producto: Optional[int] = None
    nombre_producto: str
    cantidad: int
    precio: float


class CrearPedido(BaseModel):
    items: list[PedidoItem]
    observaciones: Optional[str] = None


class ActualizarPedido(BaseModel):
    items: Optional[list[PedidoItem]] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None
