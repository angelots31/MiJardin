"""Actualiza la colección de Postman del quinto avance.

- base_url apunta al backend desplegado.
- Las credenciales son las cuentas anglo.
- Los requests que crean registros guardan el id en variables, para que las
  peticiones siguientes (detalle, factura, responder PQR) funcionen seguidas.
"""

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARCHIVO = RAIZ / "docs" / "MiJardin-QuintoAvance.postman_collection.json"

BASE = "https://back-jardin.up.railway.app"
CUENTAS = {
    "admin": ("angload@gmail.com", "anglo3131"),
    "empleado": ("angloem@gmail.com", "anglo3131"),
    "cliente": ("anglo@gmail.com", "anglo3131"),
}
# ids reales que existen hoy en la base desplegada
IDS = {"id_venta": "2", "id_factura": "2", "id_pqr": "1", "id_conversacion": "4"}


def iterar(items):
    for item in items:
        yield item
        for sub in iterar(item.get("item", [])):
            yield sub


def guion(nombre, variables):
    pasos = [f"const datos = pm.response.json();"]
    for var in variables:
        pasos.append(f"if (datos.{var}) pm.collectionVariables.set('{var}', datos.{var});")
    pasos.append("pm.test('Respuesta exitosa', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));")
    return [{"listen": "test", "script": {"type": "text/javascript", "exec": pasos}}]


def main():
    col = json.loads(ARCHIVO.read_text(encoding="utf-8"))

    # 1. Variables
    for variable in col["variable"]:
        if variable["key"] == "base_url":
            variable["value"] = BASE
        elif variable["key"] in IDS:
            variable["value"] = IDS[variable["key"]]

    # 2. Credenciales de los tres logins + encadenado de ids
    for item in iterar(col["item"]):
        nombre = item.get("name", "")
        peticion = item.get("request")
        if not peticion:
            continue

        if nombre == "Login Administrador":
            peticion["body"]["raw"] = json.dumps(
                {"email": CUENTAS["admin"][0], "password": CUENTAS["admin"][1]}, indent=2)
        elif nombre == "Login Empleado":
            peticion["body"]["raw"] = json.dumps(
                {"email": CUENTAS["empleado"][0], "password": CUENTAS["empleado"][1]}, indent=2)
        elif nombre == "Login Cliente":
            peticion["body"]["raw"] = json.dumps(
                {"email": CUENTAS["cliente"][0], "password": CUENTAS["cliente"][1]}, indent=2)
        elif nombre == "Registrar venta manual":
            item["event"] = guion(nombre, ["id_venta"])
        elif nombre == "Emitir factura":
            item["event"] = guion(nombre, ["id_factura"])
        elif nombre == "Radicar PQR (Cliente)":
            item["event"] = guion(nombre, ["id_pqr"])
        elif nombre == "Enviar mensaje (sin sesión)":
            item["event"] = guion(nombre, ["id_conversacion"])

    ARCHIVO.write_text(json.dumps(col, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Colección actualizada:", ARCHIVO.name)

    # Resumen de lo que hay dentro
    for item in col["item"]:
        hijos = item.get("item", [])
        print(f"  · {item['name']} ({len(hijos)} peticiones)")


if __name__ == "__main__":
    main()
