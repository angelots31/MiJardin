import pymysql
import os
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    """Abre una conexión nueva a MySQL usando las variables de entorno.

    Nota: este proyecto usa consultas SQL directas (pymysql) en lugar de un
    ORM tipo SQLAlchemy. Por eso no existen "modelos" de base de datos aparte:
    la validación de datos vive en app/schemas.py (Pydantic) y las consultas
    SQL viven junto a cada endpoint en app/routes/.
    """
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "MiJardin"),
        cursorclass=pymysql.cursors.DictCursor
    )
