"""Relanza Postman con accesibilidad forzada y explora su UI en un solo proceso.

El árbol de accesibilidad de Chromium solo está disponible mientras hay un
cliente AT conectado tras el arranque, por eso todo se hace aquí dentro.
"""

import io
import subprocess
import sys
import time
from pathlib import Path

from pywinauto import Desktop

EXE = r"C:\Users\angel\AppData\Local\Postman\app-12.27.7\Postman.exe"
AQUI = Path(__file__).parent
LOG = AQUI / "_postman_explorar.txt"

buf = io.StringIO()


def log(*a):
    linea = " ".join(str(x) for x in a)
    print(linea)
    buf.write(linea + "\n")


def lanzar():
    subprocess.run(["taskkill", "/F", "/IM", "Postman.exe", "/T"], capture_output=True)
    time.sleep(4)
    subprocess.Popen([EXE, "--force-renderer-accessibility"])
    log("Postman lanzado")


def esperar(segundos=45):
    d = Desktop(backend="uia")
    for _ in range(segundos):
        for w in d.windows():
            try:
                t = w.window_text() or ""
                if t.startswith(("POST", "GET", "PUT", "PATCH", "DELETE")):
                    n = len(w.descendants())
                    if n > 50:
                        return w
            except Exception:
                pass
        time.sleep(1)
    return None


def volcar(w, titulo, tipos=("Button", "MenuItem", "TreeItem", "ListItem", "TabItem", "Edit", "ComboBox", "Text")):
    log(f"\n===== {titulo} (desc={len(w.descendants())}) =====")
    for k in w.descendants():
        try:
            ct = k.element_info.control_type
            nm = (k.window_text() or "").strip().replace("\n", " ")
            if ct in tipos and nm:
                log(f"  {ct:11} | {nm[:90]}")
        except Exception:
            pass


def main():
    lanzar()
    w = esperar()
    if w is None:
        log("No se pudo obtener la ventana con árbol")
        return
    log("Ventana:", w.window_text())
    volcar(w, "ESTADO INICIAL (solo botones y menús)", ("Button", "MenuItem"))

    # 1) Menú hamburguesa -> File -> Import
    menu = None
    for k in w.descendants():
        if k.element_info.control_type == "Button" and (k.window_text() or "").strip() == "Menu":
            menu = k
            break
    if menu:
        menu.click_input()
        time.sleep(2)
        volcar(w, "MENÚ HAMBURGUESA ABIERTO", ("MenuItem",))
        archivo = None
        for k in w.descendants():
            if k.element_info.control_type == "MenuItem" and (k.window_text() or "").strip() == "File":
                archivo = k
                break
        if archivo:
            archivo.click_input()
            time.sleep(2)
            volcar(w, "SUB-MENÚ FILE", ("MenuItem", "Text"))
            imp = None
            for k in w.descendants():
                nm = (k.window_text() or "").strip()
                if k.element_info.control_type == "MenuItem" and "import" in nm.lower():
                    imp = k
                    break
            if imp:
                log("  -> clic en", imp.window_text())
                imp.click_input()
                time.sleep(3)
                volcar(w, "MODAL DE IMPORTAR", ("Button", "MenuItem", "TabItem", "Edit", "ComboBox", "Text"))
            else:
                log("  -> no se encontró Import en File")
                w.type_keys("{ESC}")
        else:
            log("  -> no se encontró File")
            w.type_keys("{ESC}")
        time.sleep(1)

    # 2) Botón "Create new" / panel de nueva petición
    for k in list(w.descendants()):
        if (k.window_text() or "").strip() == "Create new":
            try:
                k.click_input()
                time.sleep(2)
                volcar(w, "MENÚ CREATE NEW", ("MenuItem", "Text"))
                w.type_keys("{ESC}")
                time.sleep(1)
            except Exception as error:
                log("  create new falló:", error)
            break

    # 3) Listar todo el árbol de la colección
    volcar(w, "ÁRBOL DE LA COLECCIÓN", ("TreeItem",))

    LOG.write_text(buf.getvalue(), encoding="utf-8")
    log("\nGuardado", LOG)


if __name__ == "__main__":
    main()
