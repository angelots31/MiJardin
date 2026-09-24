"""Diagnóstico del importador de Postman.

1) Prueba a pegar una colección mínima (para saber si el pegado funciona).
2) Lista las ventanas antes y después de pulsar el botón "files".
"""

import json
import subprocess
import time
from pathlib import Path

from pywinauto import Desktop

EXE = r"C:\Users\angel\AppData\Local\Postman\app-12.27.7\Postman.exe"

MINIMA = {
    "info": {
        "name": "ZZ Prueba Import",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "item": [{
        "name": "Ping salud",
        "request": {
            "method": "GET",
            "header": [],
            "url": {"raw": "https://back-jardin.up.railway.app/api/v1/salud",
                    "host": ["https://back-jardin.up.railway.app"],
                    "path": ["api", "v1", "salud"]},
        },
    }],
}


def ventanas():
    salida = []
    ids = set()
    out = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Postman.exe", "/FO", "CSV"],
                         capture_output=True, text=True).stdout
    import re
    ids = set(re.findall(r'"Postman\.exe","(\d+)"', out))
    for w in Desktop(backend="uia").windows():
        try:
            t = w.window_text()
            if t:
                salida.append((str(w.element_info.process_id), t[:50]))
        except Exception:
            pass
    return salida


def main():
    subprocess.run(["taskkill", "/F", "/IM", "Postman.exe", "/T"], capture_output=True)
    time.sleep(4)
    subprocess.Popen([EXE, "--force-renderer-accessibility"])

    w = None
    for _ in range(90):
        for x in Desktop(backend="uia").windows():
            try:
                t = x.window_text() or ""
                if t and ("Postman" in t or t.startswith(("POST", "GET"))):
                    if len(x.descendants()) > 80:
                        w = x
                        break
            except Exception:
                pass
        if w:
            break
        time.sleep(1)
    print("ventana:", w.window_text() if w else None)
    if not w:
        return
    w.maximize()
    time.sleep(1.5)

    def buscar(texto, tipo=None, exacto=False):
        for k in w.descendants():
            try:
                nm = (k.window_text() or "").strip()
                if tipo and k.element_info.control_type != tipo:
                    continue
                if (nm == texto) if exacto else (texto in nm):
                    return k
            except Exception:
                continue

    buscar("Menu", "Button", True).click_input()
    time.sleep(1.8)
    buscar("File", "MenuItem", True).click_input()
    time.sleep(1.8)
    for k in w.descendants():
        if k.element_info.control_type == "MenuItem" and (k.window_text() or "").lower().startswith("import"):
            k.click_input()
            break
    time.sleep(3)

    campo = buscar("Paste cURL", "Edit")
    print("campo encontrado:", bool(campo))

    import win32clipboard
    import win32con
    texto = json.dumps(MINIMA, indent=2)
    win32clipboard.OpenClipboard()
    win32clipboard.EmptyClipboard()
    win32clipboard.SetClipboardData(win32con.CF_UNICODETEXT, texto)
    win32clipboard.CloseClipboard()
    print("portapapeles:", len(texto), "caracteres")

    campo.click_input()
    time.sleep(0.8)
    w.type_keys("^a")
    time.sleep(0.4)
    w.type_keys("^v")
    time.sleep(4)
    try:
        print("valor del campo:", len(campo.get_value()), "caracteres")
    except Exception as e:
        print("no se pudo leer:", e)

    w.type_keys("{ENTER}")
    time.sleep(6)

    print("--- treeitems ---")
    for k in w.descendants():
        if k.element_info.control_type == "TreeItem":
            nm = (k.window_text() or "").strip()
            if "Expand" in nm or "Collapse" in nm:
                print("   ", nm[:70])

    # Botón files
    antes = {t for _, t in ventanas()}
    files_btn = buscar("files", "Button", True)
    print("botón files:", bool(files_btn))
    if files_btn:
        files_btn.click_input()
        time.sleep(5)
        despues = {t for _, t in ventanas()}
        print("ventanas nuevas:", despues - antes)
    from PIL import ImageGrab
    w.set_focus()
    time.sleep(1)
    r = w.rectangle()
    ImageGrab.grab((r.left, r.top, r.right, r.bottom)).save(str(Path(__file__).parent / "_diag_import.png"))


if __name__ == "__main__":
    main()
