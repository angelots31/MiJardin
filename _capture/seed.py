"""Crea datos demo realistas en la BD desplegada usando la API pública.

No borra nada: solo agrega productos, servicios, un pedido, ventas,
facturas, PQR y una conversación de chatbot para que las capturas de la
lista de chequeo se vean con información real.
"""

import json
import urllib.request
import urllib.error
from pathlib import Path

BASE = "https://back-jardin.up.railway.app"
HERE = Path(__file__).parent

CUENTAS = {
    "admin": ("angload@gmail.com", "anglo3131"),
    "empleado": ("angloem@gmail.com", "anglo3131"),
    "cliente": ("anglo@gmail.com", "anglo3131"),
}


def llamar(metodo, ruta, token=None, cuerpo=None, crudo=False):
    url = f"{BASE}{ruta}"
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(url, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            contenido = resp.read()
            return (contenido, resp.headers) if crudo else json.loads(contenido)
    except urllib.error.HTTPError as e:
        detalle = e.read().decode(errors="replace")
        raise SystemExit(f"ERROR {metodo} {ruta} -> {e.code}: {detalle}")


def login(correo, clave):
    r = llamar("POST", "/api/v1/auth/login", cuerpo={"email": correo, "password": clave})
    return r["token"], r["usuario"]


def main():
    tokens = {}
    for rol, (correo, clave) in CUENTAS.items():
        tokens[rol], _ = login(correo, clave)
    print("Logins OK")

    admin = tokens["admin"]
    empleado = tokens["empleado"]
    cliente = tokens["cliente"]

    # --- Productos ---
    productos = [
        ("Ramo Eterno de Rosas Rojas", "Doce rosas rojas premium con follaje natural.", 120000),
        ("Arreglo Primaveral Multicolor", "Mezcla de tulipanes, gerberas y margaritas.", 85000),
        ("Orquídea Phalaenopsis Blanca", "Orquídea en maceta de cerámica, larga duración.", 150000),
        ("Caja de Girasoles Radiantes", "Ocho girasoles frescos en caja decorada.", 95000),
    ]
    existentes = {p["nombre"] for p in llamar("GET", "/api/v1/productos")["data"]}
    for nombre, desc, precio in productos:
        if nombre in existentes:
            continue
        llamar("POST", "/api/v1/productos", token=admin,
               cuerpo={"nombre": nombre, "descripcion": desc, "precio": precio, "imagen": ""})
    print("Productos OK")

    # --- Servicios ---
    servicios = [
        ("Domicilio exprés en la ciudad", "Entrega el mismo día dentro del perímetro urbano.", 12000),
        ("Tarjeta y dedicatoria personalizada", "Mensaje escrito a mano en tarjeta artesanal.", 8000),
        ("Decoración floral para eventos", "Montaje y ambientación floral para eventos.", 350000),
    ]
    existentes_s = {s["nombre"] for s in llamar("GET", "/api/v1/servicios")["data"]}
    for nombre, desc, precio in servicios:
        if nombre in existentes_s:
            continue
        llamar("POST", "/api/v1/servicios", token=empleado,
               cuerpo={"nombre": nombre, "descripcion": desc, "precio": precio, "imagen": ""})
    print("Servicios OK")

    catalogo_p = {p["nombre"]: p["id_producto"] for p in llamar("GET", "/api/v1/productos")["data"]}
    catalogo_s = {s["nombre"]: s["id_servicio"] for s in llamar("GET", "/api/v1/servicios")["data"]}

    # --- Pedido del cliente ---
    pedido = llamar("POST", "/api/v1/pedidos", token=cliente, cuerpo={
        "items": [
            {"id_producto": catalogo_p["Ramo Eterno de Rosas Rojas"],
             "nombre_producto": "Ramo Eterno de Rosas Rojas", "cantidad": 1, "precio": 120000},
            {"id_producto": catalogo_p["Caja de Girasoles Radiantes"],
             "nombre_producto": "Caja de Girasoles Radiantes", "cantidad": 2, "precio": 95000},
        ],
        "observaciones": "Entregar en la tarde, por favor.",
    })
    id_pedido = pedido["id_pedido"]
    print("Pedido", id_pedido, "OK")

    # --- Convertir el pedido en venta (Empleado) ---
    venta_pedido = llamar("POST", "/api/v1/ventas/desde-pedido", token=empleado, cuerpo={
        "id_pedido": id_pedido, "aplica_impuestos": True,
        "metodo_pago": "Contraentrega", "observaciones": "Facturado desde la tienda en línea.",
    })
    print("Venta desde pedido", venta_pedido["numero_venta"], "OK")

    # --- Venta manual (Admin) con producto + servicio ---
    venta_manual = llamar("POST", "/api/v1/ventas", token=admin, cuerpo={
        "id_cliente": 3,
        "items": [
            {"tipo_item": "producto", "id_producto": catalogo_p["Arreglo Primaveral Multicolor"],
             "cantidad": 2, "descuento": 5000},
            {"tipo_item": "servicio", "id_servicio": catalogo_s["Domicilio exprés en la ciudad"],
             "cantidad": 1},
        ],
        "descuento": 0, "aplica_impuestos": True,
        "metodo_pago": "Nequi", "observaciones": "Venta de mostrador con domicilio.",
    })
    print("Venta manual", venta_manual["numero_venta"], "OK")

    # --- Emitir facturas ---
    fac1 = llamar("POST", "/api/v1/facturas", token=empleado,
                  cuerpo={"id_venta": venta_pedido["id_venta"]})
    fac2 = llamar("POST", "/api/v1/facturas", token=admin,
                  cuerpo={"id_venta": venta_manual["id_venta"]})
    print("Facturas", fac1["numero_factura"], fac2["numero_factura"], "OK")

    # --- PQR ---
    pqr1 = llamar("POST", "/api/v1/pqr", token=cliente, cuerpo={
        "tipo": "Reclamo",
        "asunto": "Una rosa llegó marchita en el ramo",
        "descripcion": "Recibí el pedido hoy y una de las rosas venía en mal estado. Solicito reposición.",
    })
    pqr2 = llamar("POST", "/api/v1/pqr", token=cliente, cuerpo={
        "tipo": "Sugerencia",
        "asunto": "Agregar opción de pago con tarjeta",
        "descripcion": "Sería útil poder pagar con tarjeta de crédito directamente en la tienda.",
    })
    id_pqr1 = pqr1.get("id_pqr") or pqr1.get("data", {}).get("id_pqr")
    llamar("PATCH", f"/api/v1/pqr/{id_pqr1}", token=empleado, cuerpo={
        "respuesta": "Enviamos un ramo de reposición sin costo. Disculpa la molestia.",
        "estado": "Respondida",
    })
    print("PQR OK")

    # --- Chatbot ---
    chat1 = llamar("POST", "/api/v1/chatbot/mensaje", cuerpo={"mensaje": "¿Hacen envíos a domicilio?"})
    id_conv = chat1["id_conversacion"]
    llamar("POST", "/api/v1/chatbot/mensaje", token=cliente,
           cuerpo={"mensaje": "¿Qué medios de pago aceptan?", "id_conversacion": id_conv})
    print("Chatbot OK, conversación", id_conv)

    resumen = {
        "id_pedido": id_pedido,
        "id_venta_pedido": venta_pedido["id_venta"],
        "id_venta_manual": venta_manual["id_venta"],
        "id_factura_pedido": fac1.get("id_factura"),
        "id_factura_manual": fac2.get("id_factura"),
        "id_pqr": id_pqr1,
        "id_conversacion": id_conv,
        "productos": catalogo_p,
        "servicios": catalogo_s,
    }
    (HERE / "data.json").write_text(json.dumps(resumen, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Guardado _capture/data.json")


if __name__ == "__main__":
    main()
