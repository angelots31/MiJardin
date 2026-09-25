import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import (
    auth, usuarios, clientes, productos, servicios, pedidos,
    ventas, facturas, reportes, pqr, estadisticas, chatbot,
)

load_dotenv()

app = FastAPI(
    title="API MiJardín",
    description=(
        "Backend de la floristería digital MiJardín, construido con FastAPI. "
        "Incluye autenticación JWT, catálogo, pedidos, ventas, facturación, "
        "reportes en PDF y Excel, PQR, estadísticas y chatbot con IA."
    ),
    version="5.0.0",
)

_origins = os.getenv("CORS_ORIGINS", "*")
origins = ["*"] if _origins.strip() == "*" else [o.strip() for o in _origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(clientes.router)
app.include_router(productos.router)
app.include_router(servicios.router)
app.include_router(pedidos.router)

app.include_router(ventas.router)
app.include_router(facturas.router)
app.include_router(reportes.router)
app.include_router(pqr.router)
app.include_router(estadisticas.router)
app.include_router(chatbot.router)


@app.get("/")
def read_root():
    return {
        "success": True,
        "message": "API MiJardin funcionando correctamente (FastAPI).",
        "version": app.version,
        "documentacion": "/docs",
    }


@app.get("/api/v1/salud")
def salud():
    """Endpoint de verificación usado por la plataforma de despliegue."""
    return {"success": True, "estado": "ok"}
