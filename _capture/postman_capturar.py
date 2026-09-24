"""Captura evidencias reales de la app de Postman.

Uso:
    python postman_capturar.py importar    # importa la colección (una vez)
    python postman_capturar.py capturar    # envía peticiones y captura pantallas

Todo ocurre dentro de un único proceso: el árbol de accesibilidad de
Chromium solo está disponible tras arrancar Postman con
--force-renderer-accessibility y mientras haya un cliente AT conectado.
"""

import io
import subprocess
import sys
import time
from pathlib import Path

from pywinauto import Desktop
from PIL import ImageGrab

EXE = r"C:\Users\angel\AppData\Local\Postman\app-12.27.7\Postman.exe"
AQUI = Path(__file__).parent
RAIZ = AQUI.parent
EVID = RAIZ / "docs" / "evidencias"
COL = RAIZ / "docs" / "MiJardin-QuintoAvance.postman_collection.json"
LOG = AQUI / "_postman_run.txt"

buf = io.StringIO()
capturas = []


def log(*a):
    linea = " ".join(str(x) for x in a)
    print(linea, flush=True)
    buf.write(linea + "\n")


def guardar_log():
    LOG.write_text(buf.getvalue(), encoding="utf-8")


# ----------------------------------------------------------------------
# Arranque y utilidades de UI
# ----------------------------------------------------------------------
def lanzar():
    subprocess.run(["taskkill", "/F", "/IM", "Postman.exe", "/T"], capture_output=True)
    time.sleep(4)
    subprocess.Popen([EXE, "--force-renderer-accessibility"])
    log("Postman lanzado")


def esperar_ventana(segundos=100):
    d = Desktop(backend="uia")
    for i in range(segundos):
        mejor = None
        for w in d.windows():
            try:
                t = w.window_text() or ""
                if not t:
                    continue
                if not (t.startswith(("POST", "GET", "PUT", "PATCH", "DELETE")) or "Postman" in t):
                    continue
                n = len(w.descendants())
                if mejor is None or n > mejor[0]:
                    mejor = (n, w)
            except Exception:
                continue
        if i % 10 == 0:
            log(f"   esperando Postman… nodos={mejor[0] if mejor else 0}")
        if mejor and mejor[0] > 80:
            return mejor[1]
        time.sleep(1)
    return None


def buscar(w, texto, tipo=None, exacto=False, desde=None):
    for k in (desde if desde is not None else w.descendants()):
        try:
            nm = (k.window_text() or "").strip()
            if tipo and k.element_info.control_type != tipo:
                continue
            if (nm == texto) if exacto else (texto in nm):
                return k
        except Exception:
            continue
    return None


def capturar(w, nombre):
    w.set_focus()
    time.sleep(0.9)
    rect = w.rectangle()
    img = ImageGrab.grab((rect.left, rect.top, rect.right, rect.bottom))
    destino = EVID / nombre
    img.save(destino)
    capturas.append(nombre)
    log(f"   [captura] {nombre}  {img.size}")


def expandir_carpeta(w, nombre):
    """Pulsa el botón Expand/Collapse que acompaña a la carpeta indicada."""
    for k in w.descendants():
        try:
            if k.element_info.control_type != "TreeItem":
                continue
            if nombre not in (k.window_text() or ""):
                continue
            padre = k.parent()
            hermanos = padre.children()
            pos = None
            for i, h in enumerate(hermanos):
                if h.handle == k.handle:
                    pos = i
                    break
            if pos is None:
                continue
            for h in hermanos[max(0, pos - 1): pos + 3]:
                nm = (h.window_text() or "").strip()
                if h.element_info.control_type == "Button" and "Collapse" in nm:
                    return "ya-abierta"
            for h in hermanos[max(0, pos - 1): pos + 3]:
                nm = (h.window_text() or "").strip()
                if h.element_info.control_type == "Button" and "Expand" in nm:
                    h.click_input()
                    time.sleep(1.4)
                    return "expandida"
        except Exception:
            continue
    return "no-encontrada"


def cerrar_carpeta(w, nombre):
    for k in w.descendants():
        try:
            if k.element_info.control_type != "TreeItem":
                continue
            if nombre not in (k.window_text() or ""):
                continue
            padre = k.parent()
            hermanos = padre.children()
            for h in hermanos:
                nm = (h.window_text() or "").strip()
                if h.element_info.control_type == "Button" and "Collapse" in nm:
                    h.click_input()
                    time.sleep(1.0)
                    return True
        except Exception:
            continue
    return False


def abrir_peticion(w, nombre):
    for k in w.descendants():
        try:
            if k.element_info.control_type != "TreeItem":
                continue
            nm = (k.window_text() or "").strip()
            if nombre in nm and "Expand" not in nm and "Collapse" not in nm:
                k.click_input()
                time.sleep(2.5)
                return nm
        except Exception:
            continue
    return None


def enviar(w):
    """Pulsa el botón Send de la petición abierta."""
    for intento in range(3):
        boton = None
        for k in w.descendants():
            try:
                nm = (k.window_text() or "").strip()
                if k.element_info.control_type == "Button" and nm == "Send":
                    boton = k
                    break
            except Exception:
                continue
        if boton:
            boton.click_input()
            return True
        time.sleep(1.5)
    return False


# ----------------------------------------------------------------------
# Fases
# ----------------------------------------------------------------------
def poner_clipboard(texto):
    import tkinter
    root = tkinter.Tk()
    root.withdraw()
    root.clipboard_clear()
    root.clipboard_append(texto)
    root.update()
    return root


def fase_importar(w):
    log("== Importando la colección ==")
    menu = buscar(w, "Menu", tipo="Button", exacto=True)
    if not menu:
        log("  !! no se encontró el menú")
        return
    menu.click_input()
    time.sleep(1.8)
    archivo = buscar(w, "File", tipo="MenuItem", exacto=True)
    if not archivo:
        log("  !! no se encontró File")
        return
    archivo.click_input()
    time.sleep(1.8)
    imp = None
    for k in w.descendants():
        nm = (k.window_text() or "").strip()
        if k.element_info.control_type == "MenuItem" and nm.lower().startswith("import"):
            imp = k
            break
    if not imp:
        log("  !! no se encontró Import")
        return
    imp.click_input()
    time.sleep(3)

    campo = buscar(w, "Paste cURL", tipo="Edit")
    if not campo:
        log("  !! no se encontró el campo de texto del importador")
        return

    # Portapapeles vía win32 (Tk no sirve el portapapeles sin bucle de mensajes)
    import win32clipboard
    import win32con
    win32clipboard.OpenClipboard()
    win32clipboard.EmptyClipboard()
    win32clipboard.SetClipboardData(win32con.CF_UNICODETEXT, COL.read_text(encoding="utf-8"))
    win32clipboard.CloseClipboard()
    log("  portapapeles cargado con la colección")

    campo.click_input()
    time.sleep(1)
    w.type_keys("^a")
    time.sleep(0.5)
    w.type_keys("^v")
    time.sleep(5)

    try:
        valor = campo.get_value()
        log("  campo tras pegar: ", len(valor), "caracteres")
    except Exception as error:
        log("  no se pudo leer el campo:", error)

    # El modal pide "Enter … to import": se confirma con Enter dentro del campo
    campo.click_input()
    time.sleep(0.5)
    w.type_keys("{ENTER}")
    time.sleep(7)

    # Botón de confirmación, si aparece
    confirmar = None
    for k in w.descendants():
        nm = (k.window_text() or "").strip().lower()
        if k.element_info.control_type == "Button" and nm in ("import", "continue", "importar", "continuar", "import collection"):
            confirmar = k
            break
    if confirmar:
        log("  -> confirmando con", confirmar.window_text())
        confirmar.click_input()
        time.sleep(6)

    capturar(w, "postman_importacion.png")

    log("  --- colecciones presentes ---")
    for k in w.descendants():
        try:
            if k.element_info.control_type == "TreeItem":
                nm = (k.window_text() or "").strip()
                if "Expand" not in nm and "Collapse" not in nm:
                    continue
                log("    TreeItem |", nm[:70])
        except Exception:
            continue
    log("  --- árbol tras importar ---")
    for k in w.descendants():
        if k.element_info.control_type == "TreeItem":
            log("    TreeItem |", (k.window_text() or "").strip()[:70])


PLAN = [
    ("0. Autenticación", [
        ("Login Administrador", "postman_login_admin.png"),
        ("Login Empleado", "postman_login_empleado.png"),
    ]),
    ("1. Ventas", [
        ("Registrar venta manual", "postman_venta_registrar.png"),
        ("Historial de ventas con filtros", "postman_ventas_historial.png"),
        ("Detalle de una venta", "postman_venta_detalle.png"),
    ]),
    ("2. Facturas", [
        ("Emitir factura", "postman_factura_emitir.png"),
        ("Consultar facturas", "postman_facturas_lista.png"),
    ]),
    ("3. Reportes", [
        ("Reporte diario (JSON)", "postman_reporte_json.png"),
    ]),
    ("4. PQR", [
        ("Radicar PQR (Cliente)", "postman_pqr_radicar.png"),
        ("Bandeja de PQR", "postman_pqr_bandeja.png"),
        ("Responder PQR", "postman_pqr_responder.png"),
    ]),
    ("5. Estadísticas (Dashboards)", [
        ("Indicadores del Administrador", "postman_estadisticas_dashboard.png"),
        ("Serie de ventas por día", "postman_estadisticas_ventas.png"),
    ]),
    ("6. Chatbot con IA", [
        ("Enviar mensaje (sin sesión)", "postman_chatbot_mensaje.png"),
    ]),
]


def fase_capturar(w):
    log("== Enviando peticiones y capturando ==")
    for carpeta, peticiones in PLAN:
        estado = expandir_carpeta(w, carpeta)
        log(f"-- carpeta {carpeta}: {estado}")
        for nombre, archivo in peticiones:
            abierta = abrir_peticion(w, nombre)
            if not abierta:
                log(f"   !! no se encontró la petición {nombre}")
                continue
            ok = enviar(w)
            log(f"   · {nombre} -> send={ok}")
            time.sleep(7)
            capturar(w, archivo)
        cerrar_carpeta(w, carpeta)


def main():
    fase = sys.argv[1] if len(sys.argv) > 1 else "capturar"
    lanzar()
    w = esperar_ventana()
    if w is None:
        log("!! no se obtuvo la ventana de Postman")
        guardar_log()
        return
    log("Ventana:", w.window_text(), "| nodos:", len(w.descendants()))
    try:
        w.maximize()
        time.sleep(1.5)
    except Exception as error:
        log("no se pudo maximizar:", error)

    if fase == "importar":
        fase_importar(w)
    else:
        fase_capturar(w)

    log("\nCapturas:", capturas)
    guardar_log()


if __name__ == "__main__":
    main()
