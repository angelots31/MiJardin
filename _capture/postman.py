"""Utilidades para manejar la app de Postman por accesibilidad (UIA).

Postman debe estar abierto con el flag --force-renderer-accessibility para
que su interfaz (Chromium) exponga el árbol de accesibilidad.
"""

import subprocess
import re
import time

from pywinauto import Application, Desktop


def pids_postman():
    out = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Postman.exe", "/FO", "CSV"],
                         capture_output=True, text=True).stdout
    return set(re.findall(r'"Postman\.exe","(\d+)"', out))


def main_window():
    """Devuelve (Application, window) de la ventana principal de Postman."""
    d = Desktop(backend="uia")
    for w in d.windows():
        try:
            if str(w.element_info.process_id) not in pids_postman():
                continue
            if not w.window_text():
                continue
            # La ventana principal es la que contiene el documento de la app.
            for hijo in w.children():
                if hijo.element_info.control_type == "Document":
                    return Application(backend="uia").connect(handle=w.handle), w
        except Exception:
            continue
    raise RuntimeError("No se encontró la ventana principal de Postman")


def buscar(win, texto, tipo=None, exacto=False):
    """Busca un descendiente cuyo nombre coincida (parcial o exacto)."""
    for k in win.descendants():
        try:
            nm = (k.window_text() or "").strip()
            if tipo and k.element_info.control_type != tipo:
                continue
            if (nm == texto) if exacto else (texto in nm):
                return k
        except Exception:
            continue
    return None


def clic(win, elemento, pausa=1.2):
    elemento.click_input()
    time.sleep(pausa)


def capturar(win, destino, recorte=None):
    """Captura la ventana de Postman a PNG (Pillow)."""
    win.set_focus()
    time.sleep(0.8)
    img = win.capture_as_image()
    if recorte:
        img = img.crop(recorte)
    img.save(str(destino))
    return img.size
