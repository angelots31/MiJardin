from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import auth, usuarios, productos, servicios, pedidos

app = FastAPI(
    title="API MiJardín",
    description="Backend de la floristería digital MiJardín, construido con FastAPI.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(productos.router)
app.include_router(servicios.router)
app.include_router(pedidos.router)


@app.get("/")
def read_root():
    return {"success": True, "message": "API MiJardin funcionando correctamente (FastAPI)."}
