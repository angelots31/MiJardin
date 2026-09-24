"""Compone las evidencias por requerimiento y las inserta en la columna F.

Para cada REQ-01..REQ-25 arma una sola imagen (título + capturas en cuadrícula)
y la pega como imagen en la celda F correspondiente de la hoja
'Lista de Chequeo Q5', ajustando alto de fila y ancho de columna.
"""

from pathlib import Path

import fitz  # PyMuPDF
import openpyxl
from openpyxl.drawing.image import Image as XLImage

RAIZ = Path(__file__).resolve().parent.parent
EVID = RAIZ / "docs" / "evidencias"
COMP = EVID / "_compuestas"
COMP.mkdir(parents=True, exist_ok=True)
XLSX = RAIZ / "lista_Chequeo.xlsx"
HOJA = "Lista de Chequeo Q5"
FILA_INICIO = 15

VERDE = (0.137, 0.224, 0.180)
GRIS = (0.42, 0.42, 0.38)

# req -> (título del requerimiento, [capturas])
PLAN = {
    "REQ-01": ("Módulo de ventas · registro de venta y endpoint", ["admin_registrar_venta.png", "swagger_ventas.png"]),
    "REQ-02": ("Detalle de la venta: productos y servicios vendidos", ["admin_venta_detalle.png", "api_reporte_json.png"]),
    "REQ-03": ("Historial de ventas con filtros de búsqueda", ["admin_ventas.png", "admin_ventas_filtros.png"]),
    "REQ-04": ("Reporte diario de ventas (JSON)", ["api_reporte_json.png", "swagger_reportes.png"]),
    "REQ-05": ("Exportación del reporte diario a PDF", ["reporte_pdf.png"]),
    "REQ-06": ("Exportación del reporte diario a Excel", ["reporte_excel.png"]),
    "REQ-07": ("Generación de facturas de venta", ["admin_facturas.png", "swagger_facturas.png"]),
    "REQ-08": ("Consulta de facturas", ["api_facturas_lista.png", "swagger_factura_pdf.png"]),
    "REQ-09": ("Descarga de la factura en PDF", ["factura_pdf.png", "cliente_mis_compras.png"]),
    "REQ-10": ("Dashboard administrativo con indicadores", ["admin_dashboard.png"]),
    "REQ-11": ("Dashboard de ventas: gráficos de barras y lineal", ["admin_dashboard_graficos.png", "api_estadisticas_ventas.png"]),
    "REQ-12": ("Dashboards según rol: administrador, empleado y cliente", ["admin_dashboard.png", "empleado_dashboard.png", "cliente_dashboard.png"]),
    "REQ-13": ("Filtros de los dashboards y del historial", ["admin_ventas_filtros.png", "admin_dashboard.png"]),
    "REQ-14": ("Nuevos endpoints REST en FastAPI", ["swagger_docs_completo.png", "swagger_ventas_historial.png"]),
    "REQ-15": ("El dashboard consume FastAPI (sin datos quemados)", ["admin_dashboard.png", "api_estadisticas_dashboard.png"]),
    "REQ-16": ("Módulo PQR: radicar y responder solicitudes", ["cliente_mis_pqr.png", "admin_pqr.png"]),
    "REQ-17": ("Chatbot de atención al cliente (Flora)", ["chatbot.png"]),
    "REQ-18": ("Chatbot integrado con IA desde FastAPI", ["chatbot.png", "ia_py.png"]),
    "REQ-19": ("Gestión segura de la API Key por variables de entorno", ["env_api_key.png", "gitignore.png"]),
    "REQ-20": ("Aplicación desplegada en la nube (Railway)", ["deploy_home.png", "swagger_salud.png"]),
    "REQ-21": ("Evolución del modelo relacional SQL", ["esquema_sql.png", "esquema_bd.png"]),
    "REQ-22": ("Esquemas Pydantic del quinto avance", ["schemas_pydantic.png"]),
    "REQ-23": ("Componentes reutilizables React + Vite", ["componentes_react.png", "tienda.png"]),
    "REQ-24": ("Seguridad: JWT, roles y endpoints protegidos", ["seguridad_py.png", "api_401.png"]),
    "REQ-25": ("Pruebas de endpoints (GET, POST, PATCH)", ["swagger_docs_completo.png", "swagger_ventas_historial.png", "swagger_ventas.png", "swagger_pqr.png"]),
}

NOMBRES = {
    "admin_registrar_venta.png": "Formulario «Registrar venta» (producto + servicio, cliente, IVA)",
    "swagger_ventas.png": "Swagger: POST /api/v1/ventas",
    "admin_venta_detalle.png": "Detalle de la venta con sus ítems y totales",
    "api_reporte_json.png": "Respuesta real del endpoint de reporte diario",
    "admin_ventas.png": "Historial de ventas registradas",
    "admin_ventas_filtros.png": "Filtros: fecha, cliente, producto, servicio, estado y valor",
    "swagger_reportes.png": "Swagger: GET /api/v1/reportes/ventas",
    "reporte_pdf.png": "Reporte diario de ventas exportado a PDF",
    "reporte_excel.png": "Reporte diario exportado a Excel (.xlsx)",
    "admin_facturas.png": "Panel de facturas emitidas",
    "swagger_facturas.png": "Swagger: GET /api/v1/facturas",
    "api_facturas_lista.png": "Consulta de facturas (JSON) con sus ítems",
    "swagger_factura_pdf.png": "Swagger: GET /api/v1/facturas/{id}/pdf",
    "factura_pdf.png": "Factura de venta generada en PDF",
    "cliente_mis_compras.png": "El cliente consulta sus compras y facturas",
    "admin_dashboard.png": "Dashboard del administrador (indicadores en cards)",
    "admin_dashboard_graficos.png": "Gráfico de barras y gráfico lineal de ventas",
    "api_estadisticas_ventas.png": "Serie de ventas servida por FastAPI",
    "empleado_dashboard.png": "Dashboard del empleado",
    "cliente_dashboard.png": "Dashboard del cliente",
    "swagger_docs_completo.png": "Documentación FastAPI con todos los módulos",
    "swagger_ventas_historial.png": "Swagger: GET /api/v1/ventas (historial)",
    "api_estadisticas_dashboard.png": "Indicadores devueltos por /estadisticas/dashboard",
    "cliente_mis_pqr.png": "Cliente: radica y sigue sus PQR",
    "admin_pqr.png": "Bandeja de PQR del equipo (responder y cambiar estado)",
    "chatbot.png": "Conversación real con el chatbot Flora",
    "ia_py.png": "backend/app/ia.py: cliente de IA + respaldo por reglas",
    "env_api_key.png": "backend/.env con la API Key (valor enmascarado)",
    "gitignore.png": ".gitignore: los .env no se suben al repositorio",
    "deploy_home.png": "Frontend desplegado en Railway",
    "swagger_salud.png": "Swagger: GET /api/v1/salud (healthcheck)",
    "esquema_bd.png": "SHOW CREATE TABLE de las tablas nuevas (MySQL)",
    "esquema_sql.png": "MiJardin_bd.sql: CREATE TABLE de las tablas nuevas",
    "schemas_pydantic.png": "backend/app/schemas.py: validación Pydantic",
    "componentes_react.png": "Componentes React reutilizables y DashboardResumen",
    "tienda.png": "Catálogo / tienda en producción",
    "seguridad_py.png": "backend/app/security.py: JWT y control de roles",
    "api_401.png": "Petición sin token rechazada con 401",
    "swagger_pqr.png": "Swagger: PATCH /api/v1/pqr/{id}",
}


def _seguro(texto):
    """PyMuPDF con Helvetica solo admite Latin-1; se filtran otros caracteres."""
    reemplazos = {"–": "-", "—": "-", "·": "-", "→": "->", "…": "...", "«": '"', "»": '"', "”": '"', "“": '"'}
    for a, b in reemplazos.items():
        texto = texto.replace(a, b)
    return texto.encode("latin-1", "replace").decode("latin-1")


def comprimir(nombre):
    return NOMBRES.get(nombre, nombre)


def construir(req, titulo, imagenes, destino):
    W, M, GAP = 1400, 22, 14
    n = len(imagenes)
    ncols = 1 if n == 1 else (2 if n <= 4 else 3)
    cw = (W - M * (ncols + 1)) // ncols
    ALTO_CAPTION = 20

    filas = [imagenes[i:i + ncols] for i in range(0, n, ncols)]
    medidas, alturas_fila = [], []
    for fila in filas:
        alto_fila = 0
        for nombre in fila:
            doc = fitz.open(EVID / nombre)
            r = doc[0].rect
            alto = cw * r.height / r.width
            medidas.append((nombre, alto))
            alto_fila = max(alto_fila, alto)
            doc.close()
        alturas_fila.append(alto_fila + ALTO_CAPTION + 6)

    H = int(64 + M + sum(alturas_fila) + GAP * (len(filas) - 1) + M)
    doc = fitz.open()
    pagina = doc.new_page(width=W, height=H)
    pagina.draw_rect(fitz.Rect(0, 0, W, 64), color=None, fill=VERDE)
    pagina.insert_text((M, 27), _seguro(f"{req}  ·  {titulo}"), fontname="hebo", fontsize=15, color=(1, 1, 1))
    pagina.insert_text((M, 48), "MiJardín · Evidencia de ejecución sobre la aplicación desplegada",
                       fontname="helv", fontsize=10.5, color=(0.78, 0.83, 0.75))

    indice = 0
    y = 64 + M
    for fi, fila in enumerate(filas):
        for ci, nombre in enumerate(fila):
            alto = medidas[indice][1]
            indice += 1
            x = M + ci * (cw + M)
            pagina.insert_text((x, y + 13), _seguro(comprimir(nombre)), fontname="hebo", fontsize=10.5, color=GRIS)
            pagina.insert_image(fitz.Rect(x, y + ALTO_CAPTION, x + cw, y + ALTO_CAPTION + alto), filename=str(EVID / nombre))
        y += alturas_fila[fi] + GAP

    pix = pagina.get_pixmap(matrix=fitz.Matrix(0.85, 0.85))
    pix.save(str(destino))
    doc.close()
    return destino


def main():
    wb = openpyxl.load_workbook(XLSX)
    ws = wb[HOJA]
    ws.column_dimensions["F"].width = 92

    # Idempotencia: quita evidencias previas ancladas en la columna F
    # (conserva el logo original, que está anclado en la columna A).
    antes = len(ws._images)
    ws._images = [
        im for im in ws._images
        if not (hasattr(im.anchor, "_from") and im.anchor._from.col == 5)
    ]
    print(f"Imágenes previas retiradas: {antes - len(ws._images)}")

    for i, (req, (titulo, imagenes)) in enumerate(PLAN.items()):
        fila = FILA_INICIO + i
        comp = COMP / f"{req}.png"
        construir(req, titulo, imagenes, comp)

        img = XLImage(str(comp))
        cw, ch = img.width, img.height
        alto = 540.0
        ancho = alto * cw / ch
        if ancho > 640:
            ancho = 640.0
            alto = ancho * ch / cw
        img.width, img.height = ancho, alto

        ws[f"F{fila}"] = None
        ws.add_image(img, f"F{fila}")
        ws.row_dimensions[fila].height = min(409.0, round(alto * 0.75 + 4, 1))
        print(f"{req} fila {fila}: {len(imagenes)} captura(s) · mostrada {ancho:.0f}x{alto:.0f}")

    wb.save(XLSX)
    print("Guardado", XLSX)


if __name__ == "__main__":
    main()
