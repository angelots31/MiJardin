"""Importa la colección usando el botón 'files' del modal de Postman."""

import subprocess
import time
from pathlib import Path

from pywinauto import Desktop, Application

EXE = r"C:\Users\angel\AppData\Local\Postman\app-12.27.7\Postman.exe"
RAIZ = Path(__file__).parent.parent
COL = RAIZ / "docs" / "MiJardin-QuintoAvance.postman_collection.json"


def titulos():
    res = []
    for w in Desktop(backend="uia").windows():
        try:
            t = w.window_text()
            if t:
                res.append((w.handle, t[:60], w.element_info.control_type))
        except Exception:
            pass
    return res


def main():
    subprocess.run(["taskkill", "/F", "/IM", "Postman.exe", "/T"], capture_output=True)
    time.sleep(4)
    subprocess.Popen([EXE, "--force-renderer-accessibility"])

    w = None
    for _ in range(90):
        for x in Desktop(backend="uia").windows():
            try:
                t = x.window_text() or ""
                if t and ("Postman" in t or t.startswith(("POST", "GET"))) and len(x.descendants()) > 80:
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

    def buscar(texto, tipo=None, exacto=False, raiz=None):
        for k in (raiz or w).descendants():
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

    antes = {h for h, _, _ in titulos()}
    files_btn = buscar("files", "Button", True)
    print("botón files:", bool(files_btn))
    files_btn.click_input()
    time.sleep(6)

    nuevas = [(h, t, ct) for h, t, ct in titulos() if h not in antes]
    print("ventanas nuevas:")
    for h, t, ct in nuevas:
        print("   ", ct, "|", t)

    for h, t, ct in nuevas:
        try:
            dlg = Application(backend="uia").connect(handle=h).window(handle=h)
        except Exception as error:
            print("   no conecta:", error)
            continue
        print("   -> controles de:", t)
        for k in dlg.descendants():
            nm = (k.window_text() or "").strip()
            if nm:
                print("      ", k.element_info.control_type, "|", nm[:50], "| auto_id=", k.element_info.automation_id)
        campo = None
        for k in dlg.descendants():
            try:
                if k.element_info.control_type == "Edit":
                    campo = k
                    break
            except Exception:
                continue
        if campo:
            campo.set_edit_text(str(COL))
            time.sleep(1)
            print("   ruta:", campo.get_value())
            confirmado = False
            for k in dlg.descendants():
                nm = (k.window_text() or "").strip().lower()
                if k.element_info.control_type == "Button" and nm in ("abrir", "open", "&abrir", "guardar"):
                    k.click_input()
                    confirmado = True
                    break
            if not confirmado:
                dlg.type_keys("{ENTER}")
            time.sleep(6)
            break

    time.sleep(3)
    print("--- colecciones ---")
    for k in w.descendants():
        if k.element_info.control_type == "TreeItem":
            nm = (k.window_text() or "").strip()
            if "Expand" in nm or "Collapse" in nm:
                print("   ", nm[:70])


if __name__ == "__main__":
    main()
