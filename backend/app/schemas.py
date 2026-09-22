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


# =====================================================================
# QUINTO AVANCE - Esquemas de gestión comercial, PQR y chatbot
# =====================================================================

class VentaItem(BaseModel):
    tipo_item: str = 'producto'
    id_producto: Optional[int] = None
    id_servicio: Optional[int] = None
    nombre_item: Optional[str] = None
    cantidad: int = 1
    precio_unitario: Optional[float] = None
    descuento: float = 0

    @field_validator('tipo_item')
    @classmethod
    def validate_tipo_item(cls, v):
        v = (v or 'producto').strip().lower()
        if v not in ('producto', 'servicio'):
            raise ValueError("tipo_item debe ser 'producto' o 'servicio'.")
        return v

    @field_validator('cantidad')
    @classmethod
    def validate_cantidad(cls, v):
        if v < 1:
            raise ValueError('La cantidad debe ser al menos 1.')
        if v > 999:
            raise ValueError('La cantidad no puede superar 999 unidades.')
        return v

    @field_validator('descuento')
    @classmethod
    def validate_descuento(cls, v):
        if v < 0:
            raise ValueError('El descuento no puede ser negativo.')
        return v


class CrearVenta(BaseModel):
    id_cliente: int
    items: list[VentaItem]
    descuento: float = 0
    aplica_impuestos: bool = True
    metodo_pago: str = 'Efectivo'
    observaciones: Optional[str] = None

    @field_validator('metodo_pago')
    @classmethod
    def validate_metodo(cls, v):
        permitidos = ('Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Contraentrega')
        v = (v or 'Efectivo').strip()
        if v not in permitidos:
            raise ValueError(f"Método de pago inválido. Usa uno de: {', '.join(permitidos)}.")
        return v


class VentaDesdePedido(BaseModel):
    id_pedido: int
    descuento: float = 0
    aplica_impuestos: bool = True
    metodo_pago: str = 'Efectivo'
    observaciones: Optional[str] = None


class ActualizarVenta(BaseModel):
    estado: Optional[str] = None
    observaciones: Optional[str] = None

    @field_validator('estado')
    @classmethod
    def validate_estado(cls, v):
        if v is None:
            return v
        if v not in ('Pendiente', 'Pagada', 'Anulada'):
            raise ValueError("Estado inválido. Usa 'Pendiente', 'Pagada' o 'Anulada'.")
        return v


class CrearFactura(BaseModel):
    id_venta: int
    observaciones: Optional[str] = None


class ActualizarFactura(BaseModel):
    estado: str

    @field_validator('estado')
    @classmethod
    def validate_estado(cls, v):
        if v not in ('Emitida', 'Pagada', 'Anulada'):
            raise ValueError("Estado inválido. Usa 'Emitida', 'Pagada' o 'Anulada'.")
        return v


class CrearPQR(BaseModel):
    tipo: str
    asunto: str
    descripcion: str

    @field_validator('tipo')
    @classmethod
    def validate_tipo(cls, v):
        if v not in ('Petición', 'Queja', 'Reclamo', 'Sugerencia'):
            raise ValueError("Tipo inválido. Usa 'Petición', 'Queja', 'Reclamo' o 'Sugerencia'.")
        return v

    @field_validator('asunto')
    @classmethod
    def validate_asunto(cls, v):
        v = v.strip()
        if len(v) < 5 or len(v) > 150:
            raise ValueError('El asunto debe tener entre 5 y 150 caracteres.')
        return v

    @field_validator('descripcion')
    @classmethod
    def validate_descripcion(cls, v):
        v = v.strip()
        if len(v) < 10 or len(v) > 2000:
            raise ValueError('La descripción debe tener entre 10 y 2000 caracteres.')
        return v


class ResponderPQR(BaseModel):
    estado: Optional[str] = None
    respuesta: Optional[str] = None

    @field_validator('estado')
    @classmethod
    def validate_estado(cls, v):
        if v is None:
            return v
        if v not in ('Pendiente', 'En proceso', 'Respondida', 'Cerrada'):
            raise ValueError("Estado inválido. Usa 'Pendiente', 'En proceso', 'Respondida' o 'Cerrada'.")
        return v


class MensajeChat(BaseModel):
    mensaje: str
    id_conversacion: Optional[int] = None

    @field_validator('mensaje')
    @classmethod
    def validate_mensaje(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Escribe un mensaje antes de enviarlo.')
        if len(v) > 1000:
            raise ValueError('El mensaje no puede superar los 1000 caracteres.')
        return v
