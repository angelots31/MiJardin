"""Captura las evidencias (capturas de pantalla) para la lista de chequeo Q5.

Genera los PNG en docs/evidencias/ usando:
  - Playwright + Google Chrome (channel='chrome') para el frontend y Swagger.
  - PyMuPDF para renderizar los PDF (reporte y factura) a imagen.
  - openpyxl para volcar el reporte Excel a una tabla HTML.
  - pymysql para extraer el DDL real de la base de datos local.
"""

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
OUT = RAIZ / "docs" / "evidencias"
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((Path(__file__).parent / "data.json").read_text(encoding="utf-8"))

FRONT = "https://front-jardin.up.railway.app"
BACK = "https://back-jardin.up.railway.app"
CUENTAS = {
    "admin": ("angload@gmail.com", "anglo3131", "Administrador", "Admin"),
    "empleado": ("angloem@gmail.com", "anglo3131", "Empleado", "Empleado"),
    "cliente": ("anglo@gmail.com", "anglo3131", "Cliente", "Cliente"),
}


# ----------------------------------------------------------------------
# API
# ----------------------------------------------------------------------
def api(metodo, ruta, token=None, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(f"{BACK}{ruta}", data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def api_bytes(ruta, token):
    req = urllib.request.Request(f"{BACK}{ruta}")
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def tokens():
    out = {}
    for rol, (correo, clave, _, _) in CUENTAS.items():
        out[rol] = api("POST", "/api/v1/auth/login", cuerpo={"email": correo, "password": clave})["token"]
    return out


# ----------------------------------------------------------------------
# Utilidades de captura
# ----------------------------------------------------------------------
def guardar(page, nombre, full=True):
    page.screenshot(path=str(OUT / nombre), full_page=full)
    print("  ->", nombre)


def cerrar_modal(page):
    """Cierra el modal visible pulsando su botón X (icono lucide-x)."""
    for selector in ["form button:has(svg.lucide-x)", "div.fixed.inset-0 button:has(svg.lucide-x)"]:
        try:
            loc = page.locator(selector).first
            if loc.count() and loc.is_visible():
                loc.click()
                page.wait_for_timeout(700)
                return True
        except Exception:
            continue
    return False


def render_html(page, html, nombre, ancho=1500):
    page.set_viewport_size({"width": ancho, "height": 900})
    page.set_content(html, wait_until="load")
    page.wait_for_timeout(400)
    guardar(page, nombre)


def loguear(page, rol, destino):
    correo, clave, rol_nombre, nombre = CUENTAS[rol]
    tok = api("POST", "/api/v1/auth/login", cuerpo={"email": correo, "password": clave})["token"]
    usuario = api("POST", "/api/v1/auth/login", cuerpo={"email": correo, "password": clave})["usuario"]
    page.goto(FRONT, wait_until="domcontentloaded")
    page.evaluate(
        """(d) => {
            localStorage.setItem('mijardin_logged', 'true');
            localStorage.setItem('mijardin_token', d.token);
            localStorage.setItem('mijardin_user', d.email);
            localStorage.setItem('mijardin_user_name', d.nombre);
            localStorage.setItem('mijardin_user_id', String(d.id));
            localStorage.setItem('mijardin_user_role', String(d.rol_id));
            localStorage.setItem('mijardin_user_role_nombre', d.rol);
        }""",
        {"token": tok, "email": usuario["email"], "nombre": usuario["nombres"],
         "id": usuario["id_usuario"], "rol_id": usuario["rol_id"], "rol": rol_nombre},
    )
    page.goto(destino, wait_until="domcontentloaded")
    page.wait_for_timeout(3500)


CSS_MARCO = """
 body{font-family:'Segoe UI',Arial,sans-serif;background:#FAF3E7;color:#23392E;margin:0;padding:18px}
 .barra{background:#23392E;color:#FAF3E7;padding:10px 16px;border-radius:10px;font-size:13px;
        font-family:Consolas,monospace;margin-bottom:14px;word-break:break-all}
 h1{font-size:17px;margin:0 0 12px}
 pre{background:#fff;border:1px solid #E4DCCD;border-radius:10px;padding:14px;
     font-family:Consolas,'Courier New',monospace;font-size:12.5px;line-height:1.55;
     white-space:pre-wrap;word-break:break-word;margin:0}
 table{border-collapse:collapse;background:#fff;font-size:13px;width:100%}
 th{background:#23392E;color:#FAF3E7;text-align:left;padding:8px 10px}
 td{border-top:1px solid #EDE5D6;padding:7px 10px;vertical-align:top}
 .tag{display:inline-block;background:#D9714E;color:#fff;border-radius:999px;
      padding:2px 10px;font-size:11px;font-weight:700;letter-spacing:.04em}
"""


def html(texto, titulo, endpoint="", columnas=1):
    barra = f'<div class="barra">{endpoint}</div>' if endpoint else ""
    extra = f".cols{{column-count:{columnas};column-gap:20px}}" if columnas > 1 else ""
    cuerpo = f'<div class="cols">{texto}</div>' if columnas > 1 else texto
    return f"<html><head><meta charset='utf-8'><style>{CSS_MARCO}{extra}</style></head><body>{barra}<h1>{titulo}</h1>{cuerpo}</body></html>"


def html_json(datos, titulo, endpoint):
    return html(f"<pre>{json.dumps(datos, indent=2, ensure_ascii=False)}</pre>", titulo, endpoint)


# ----------------------------------------------------------------------
# Capturas
# ----------------------------------------------------------------------
def capturas_frontend(page, toks):
    # Login (formulario real)
    page.goto(f"{FRONT}/login", wait_until="networkidle")
    page.wait_for_timeout(1200)
    guardar(page, "login.png")

    # Home público (despliegue)
    page.goto(FRONT, wait_until="networkidle")
    page.wait_for_timeout(1500)
    guardar(page, "deploy_home.png")

    # Tienda
    page.goto(f"{FRONT}/tienda", wait_until="networkidle")
    page.wait_for_timeout(2000)
    guardar(page, "tienda.png")

    # --- Administrador ---
    loguear(page, "admin", f"{FRONT}/admin")
    guardar(page, "admin_dashboard.png")
    page.locator("text=Ingresos por periodo").scroll_into_view_if_needed()
    page.wait_for_timeout(1200)
    guardar(page, "admin_dashboard_graficos.png", full=False)

    page.get_by_role("button", name="Ventas", exact=True).first.click()
    page.wait_for_timeout(3000)
    guardar(page, "admin_ventas.png")

    page.locator("section", has_text="Valor mínimo").first.screenshot(path=str(OUT / "admin_ventas_filtros.png"))
    print("  -> admin_ventas_filtros.png")

    page.get_by_role("button", name="ítem(s)").first.click()
    page.wait_for_timeout(1200)
    guardar(page, "admin_venta_detalle.png")
    cerrar_modal(page)

    page.get_by_role("button", name="Registrar venta").first.click()
    page.wait_for_timeout(1200)
    guardar(page, "admin_registrar_venta.png")
    cerrar_modal(page)

    page.get_by_role("button", name="Facturas", exact=True).first.click()
    page.wait_for_timeout(3000)
    guardar(page, "admin_facturas.png")

    page.get_by_role("button", name="PQR", exact=True).first.click()
    page.wait_for_timeout(3000)
    guardar(page, "admin_pqr.png")

    # --- Empleado ---
    loguear(page, "empleado", f"{FRONT}/empleado")
    guardar(page, "empleado_dashboard.png")

    # --- Cliente ---
    loguear(page, "cliente", f"{FRONT}/mi-cuenta")
    guardar(page, "cliente_dashboard.png")
    page.goto(f"{FRONT}/mis-compras", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    guardar(page, "cliente_mis_compras.png")
    page.goto(f"{FRONT}/mis-pqr", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    guardar(page, "cliente_mis_pqr.png")

    # --- Chatbot (conversación real) ---
    page.goto(FRONT, wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.get_by_role("button", name=re.compile("Abrir el chat")).click()
    page.wait_for_timeout(600)
    page.get_by_role("button", name="¿Hacen envíos a domicilio?").click()
    page.wait_for_timeout(3500)
    page.get_by_placeholder("Escribe tu pregunta…").fill("¿Cuánto cuesta el envío a domicilio?")
    page.get_by_role("button", name="Enviar mensaje").click()
    page.wait_for_timeout(4000)
    guardar(page, "chatbot.png", full=False)


def capturas_swagger(page):
    base = f"{BACK}/docs"

    def ir(fragmento="", espera=3800):
        # Ir a about:blank fuerza una navegación real aunque solo cambie el hash.
        page.goto("about:blank")
        page.goto(f"{base}{fragmento}", wait_until="domcontentloaded")
        page.wait_for_timeout(espera)

    ir()
    guardar(page, "swagger_docs.png", full=False)

    # Documentación completa con todos los grupos desplegados.
    ir("", 3000)
    for etiqueta in ["Autenticación", "Productos", "Servicios", "Pedidos", "Ventas",
                     "Facturas", "Reportes", "PQR", "Estadísticas", "Chatbot"]:
        try:
            page.locator(f".opblock-tag:has-text('{etiqueta}')").first.click()
            page.wait_for_timeout(250)
        except Exception:
            pass
    guardar(page, "swagger_docs_completo.png")

    operaciones = {
        "swagger_ventas.png": "#/Ventas/registrar_venta_api_v1_ventas_post",
        "swagger_ventas_historial.png": "#/Ventas/historial_ventas_api_v1_ventas_get",
        "swagger_facturas.png": "#/Facturas/consultar_facturas_api_v1_facturas_get",
        "swagger_factura_pdf.png": "#/Facturas/descargar_factura_api_v1_facturas__id_factura__pdf_get",
        "swagger_reportes.png": "#/Reportes/reporte_json_api_v1_reportes_ventas_get",
        "swagger_pqr.png": "#/PQR/gestionar_pqr_api_v1_pqr__id_pqr__patch",
        "swagger_estadisticas.png": "#/Estad%C3%ADsticas/dashboard_api_v1_estadisticas_dashboard_get",
        "swagger_chatbot.png": "#/Chatbot/enviar_mensaje_api_v1_chatbot_mensaje_post",
        "swagger_salud.png": "#/default/salud_api_v1_salud_get",
    }
    for nombre, fragmento in operaciones.items():
        ir(fragmento)
        try:
            texto = page.locator(".opblock").first.inner_text(timeout=8000)
            print(f"  [swagger] {nombre} · {texto.splitlines()[0][:60]}")
        except Exception:
            print(f"  [swagger] {nombre} · (no se pudo leer el título)")
        guardar(page, nombre, full=False)


def capturas_api(page, toks):
    admin = toks["admin"]
    cliente = toks["cliente"]

    render_html(page, html_json(api("GET", "/api/v1/reportes/ventas", token=admin),
                                "Reporte diario de ventas (JSON)",
                                f"GET {BACK}/api/v1/reportes/ventas"), "api_reporte_json.png")
    render_html(page, html_json(api("GET", "/api/v1/facturas", token=admin),
                                "Consulta de facturas (JSON)",
                                f"GET {BACK}/api/v1/facturas?estado=Emitida"), "api_facturas_lista.png")
    render_html(page, html_json(api("GET", "/api/v1/estadisticas/dashboard", token=admin),
                                "Indicadores del dashboard (según rol)",
                                f"GET {BACK}/api/v1/estadisticas/dashboard"), "api_estadisticas_dashboard.png")
    render_html(page, html_json(api("GET", "/api/v1/estadisticas/ventas?agrupar=dia", token=admin),
                                "Serie de ventas por día (gráficos)",
                                f"GET {BACK}/api/v1/estadisticas/ventas?agrupar=dia"), "api_estadisticas_ventas.png")
    render_html(page, html_json(api("GET", "/api/v1/pqr/mis-pqr", token=cliente),
                                "PQR del cliente con su estado",
                                f"GET {BACK}/api/v1/pqr/mis-pqr"), "api_pqr_cliente.png")

    # 401 sin token (seguridad)
    req = urllib.request.Request(f"{BACK}/api/v1/ventas")
    try:
        urllib.request.urlopen(req, timeout=30)
        cuerpo = {"detalle": "Sin protección"}
    except urllib.error.HTTPError as e:
        cuerpo = {"status": e.code, "detail": json.loads(e.read()).get("detail")}
    render_html(page, html_json(cuerpo, "Petición sin token rechazada (401)",
                                f"GET {BACK}/api/v1/ventas  ·  sin header Authorization"), "api_401.png")


def capturas_archivos(page, toks):
    admin = toks["admin"]
    import fitz  # PyMuPDF

    # Reporte PDF
    pdf = api_bytes("/api/v1/reportes/ventas/pdf", admin)
    (OUT / "reporte_ventas.pdf").write_bytes(pdf)
    doc = fitz.open(stream=pdf, filetype="pdf")
    doc[0].get_pixmap(matrix=fitz.Matrix(2.2, 2.2)).save(str(OUT / "reporte_pdf.png"))
    print("  -> reporte_pdf.png (", doc.page_count, "páginas )")

    # Factura PDF
    pdf_f = api_bytes(f"/api/v1/facturas/{DATA['id_factura_pedido']}/pdf", admin)
    (OUT / "factura.pdf").write_bytes(pdf_f)
    docf = fitz.open(stream=pdf_f, filetype="pdf")
    docf[0].get_pixmap(matrix=fitz.Matrix(2.2, 2.2)).save(str(OUT / "factura_pdf.png"))
    print("  -> factura_pdf.png")

    # Reporte Excel -> tabla HTML
    xlsx = api_bytes("/api/v1/reportes/ventas/excel", admin)
    (OUT / "reporte_ventas.xlsx").write_bytes(xlsx)
    import openpyxl
    wb = openpyxl.load_workbook(OUT / "reporte_ventas.xlsx")
    tabla = ""
    for ws in wb.worksheets:
        tabla += f"<p class='tag'>{ws.title}</p><table>"
        for i, fila in enumerate(ws.iter_rows(values_only=True)):
            etiqueta = "th" if i == 0 else "td"
            tabla += "<tr>" + "".join(f"<{etiqueta}>{'' if c is None else c}</{etiqueta}>" for c in fila) + "</tr>"
        tabla += "</table>"
    render_html(page, html(tabla, "Reporte diario de ventas exportado a Excel (.xlsx)",
                           f"GET {BACK}/api/v1/reportes/ventas/excel"), "reporte_excel.png")


def capturas_codigo(page):
    # .env con secretos enmascarados (REQ-19)
    env_txt = (RAIZ / "backend" / ".env").read_text(encoding="utf-8", errors="replace")
    lineas = []
    for linea in env_txt.splitlines():
        if "=" in linea and re.search(r"(PASSWORD|SECRET|KEY|TOKEN)", linea.split("=")[0], re.I):
            llave, _, valor = linea.partition("=")
            visible = valor[:6] if valor else "(vacío)"
            linea = f"{llave}={visible}{'•' * 14}"
        lineas.append(linea)
    render_html(page, html(f"<pre>{chr(10).join(lineas)}</pre>",
                           "backend/.env · la API Key solo vive en el entorno (nunca en el repositorio)",
                           "backend/.env"), "env_api_key.png", ancho=1100)

    # .gitignore (REQ-19)
    gitignore = (RAIZ / ".gitignore").read_text(encoding="utf-8", errors="replace")
    render_html(page, html(f"<pre>{gitignore}</pre>", ".gitignore · los .env quedan fuera del control de versiones",
                           ".gitignore"), "gitignore.png", ancho=1000)

    # ia.py (REQ-18)
    ia = (RAIZ / "backend" / "app" / "ia.py").read_text(encoding="utf-8", errors="replace")
    render_html(page, html(f"<pre>{ia}</pre>", "backend/app/ia.py · cliente del servicio de IA + respaldo por reglas",
                           "IA_API_KEY / IA_BASE_URL / IA_MODELO"), "ia_py.png", ancho=1250)

    # schemas.py (REQ-22) — sección del quinto avance
    sch = (RAIZ / "backend" / "app" / "schemas.py").read_text(encoding="utf-8", errors="replace")
    inicio = sch.find("# QUINTO AVANCE")
    recorte = sch[inicio:] if inicio > 0 else sch
    render_html(page, html(f"<pre>{recorte}</pre>",
                           "backend/app/schemas.py · esquemas Pydantic del quinto avance",
                           "VentaItem · CrearVenta · CrearFactura · CrearPQR · MensajeChat", columnas=2),
                "schemas_pydantic.png", ancho=1500)

    # security.py (REQ-24)
    seg = (RAIZ / "backend" / "app" / "security.py").read_text(encoding="utf-8", errors="replace")
    render_html(page, html(f"<pre>{seg}</pre>", "backend/app/security.py · JWT, hashing bcrypt y control de roles",
                           "get_current_user · require_roles"), "seguridad_py.png", ancho=1250)

    # Componentes React (REQ-23)
    comps = sorted(p.name for p in (RAIZ / "frontend" / "src" / "components").rglob("*.jsx"))
    dr = (RAIZ / "frontend" / "src" / "components" / "dashboard" / "DashboardResumen.jsx").read_text(encoding="utf-8", errors="replace")
    lista = "<ul style='font-size:13px;line-height:1.8'>" + "".join(f"<li>components/{c}</li>" for c in comps) + "</ul>"
    render_html(page, html(lista + f"<pre>{dr[:4200]}</pre>",
                           "frontend/src/components · componentes reutilizables React + Vite",
                           "VentasPanel · FacturasPanel · PqrPanel · Chatbot · dashboard/DashboardResumen"), "componentes_react.png", ancho=1250)

    # Esquema de la base de datos (REQ-21) desde la BD MySQL real
    from dotenv import load_dotenv
    import pymysql
    load_dotenv(RAIZ / "backend" / ".env")
    tablas = ["ventas", "detalle_ventas", "facturas", "detalle_facturas", "pqr", "conversaciones", "mensajes"]
    try:
        cx = pymysql.connect(host=os.getenv("DB_HOST"), port=int(os.getenv("DB_PORT", 3306)),
                             user=os.getenv("DB_USER"), password=os.getenv("DB_PASSWORD"),
                             database=os.getenv("DB_NAME"), connect_timeout=8)
        cur = cx.cursor()
        cur.execute("SELECT VERSION()")
        version = cur.fetchone()[0]
        bloques = []
        cur.execute("SHOW TABLES")
        todas = [r[0] for r in cur.fetchall()]
        encabezado = ("<p class='tag'>Base de datos MySQL " + version + " · esquema MiJardin</p>"
                      f"<p style='font-size:13px'>Tablas: {', '.join(todas)}</p>")
        for t in tablas:
            cur.execute(f"SHOW CREATE TABLE {t}")
            ddl = cur.fetchone()[1]
            bloques.append(f"<pre>{ddl}</pre>")
        cx.close()
        render_html(page, html(encabezado + "".join(bloques),
                               "Modelo relacional SQL · tablas nuevas del quinto avance",
                               "ventas · detalle_ventas · facturas · detalle_facturas · pqr · conversaciones · mensajes"),
                    "esquema_bd.png", ancho=1250)
    except Exception as error:
        print("  !! esquema_bd falló:", error)


def capturas_sql(page):
    """Evidencia del script SQL real (dump) con las tablas nuevas y sus llaves foráneas."""
    sql = (RAIZ.parent / "MiJardin_bd.sql").read_text(encoding="utf-8", errors="replace")
    seek = [
        ("CREATE TABLE `ventas`", "CREATE TABLE `detalle_ventas`"),
        ("CREATE TABLE `detalle_ventas`", "CREATE TABLE `facturas`"),
        ("CREATE TABLE `facturas`", "CREATE TABLE `detalle_facturas`"),
        ("CREATE TABLE `detalle_facturas`", "CREATE TABLE `mensajes`"),
        ("CREATE TABLE `pqr`", "CREATE TABLE `roles`"),
        ("CREATE TABLE `conversaciones`", "CREATE TABLE `detalle_facturas`"),
        ("CREATE TABLE `mensajes`", "CREATE TABLE `pedidos`"),
    ]
    bloques = []
    for inicio, fin in seek:
        i = sql.find(inicio)
        if i < 0:
            continue
        j = sql.find(fin, i)
        fragmento = sql[i:j if j > 0 else i + 1200].strip()
        # conserva solo desde el CREATE hasta el cierre del ENGINE
        cierre = fragmento.find("ENGINE=")
        if cierre > 0:
            fragmento = fragmento[:fragmento.find(";", cierre) + 1]
        bloques.append(f"<pre>{fragmento}</pre>")
    render_html(page, html("<p class='tag'>MiJardin_bd.sql · volcado MySQL 8.0</p>" + "".join(bloques),
                           "Script SQL con las tablas nuevas del quinto avance y sus claves foráneas",
                           "MiJardin_bd.sql · ventas · detalle_ventas · facturas · detalle_facturas · pqr · conversaciones · mensajes"),
                "esquema_sql.png", ancho=1250)


def main():
    toks = tokens()
    with sync_playwright() as p:
        navegador = p.chromium.launch(channel="chrome", headless=True)
        contexto = navegador.new_context(viewport={"width": 1600, "height": 1000}, device_scale_factor=1)
        page = contexto.new_page()
        page.set_default_timeout(25000)

        secciones = [
            ("frontend", "Frontend", lambda: capturas_frontend(page, toks)),
            ("swagger", "Swagger", lambda: capturas_swagger(page)),
            ("api", "API", lambda: capturas_api(page, toks)),
            ("archivos", "Archivos", lambda: capturas_archivos(page, toks)),
            ("codigo", "Código y BD", lambda: capturas_codigo(page)),
            ("sql", "Script SQL", lambda: capturas_sql(page)),
        ]
        pedidas = sys.argv[1:] or [s[0] for s in secciones]
        for clave, nombre, fn in secciones:
            if clave not in pedidas:
                continue
            print(f"== {nombre} ==")
            try:
                fn()
            except Exception as error:
                print(f"  !! {nombre} falló:", repr(error))

        navegador.close()
    print("Listo.")


if __name__ == "__main__":
    main()
