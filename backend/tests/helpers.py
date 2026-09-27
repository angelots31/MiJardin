"""Dobles de prueba para no necesitar una base de datos real.

Las funciones de cálculo reciben un cursor de PyMySQL y le ejecutan consultas.
`FakeCursor` responde a las pocas que aparecen en el flujo de precios, de modo
que se pueden probar los cálculos sin levantar MySQL.
"""


class FakeCursor:
    """Cursor de mentira que responde según el texto de la consulta."""

    def __init__(self, productos=None, servicios=None, ultimo=None):
        self.productos = productos or {}
        self.servicios = servicios or {}
        self.ultimo = ultimo
        self.consultas = []
        self._fila = None

    def execute(self, sql, params=()):
        self.consultas.append((sql, params))
        consulta = " ".join(sql.split()).lower()

        if "from productos where id_producto" in consulta:
            self._fila = self.productos.get(params[0])
        elif "from servicios where id_servicio" in consulta:
            self._fila = self.servicios.get(params[0])
        elif "max(cast(substring_index" in consulta:
            self._fila = {"ultimo": self.ultimo}
        else:
            self._fila = None

    def fetchone(self):
        return self._fila

    def fetchall(self):
        return []
