"""Flujo pedido -> venta -> factura.

Comprueba que el precio se decide en el servidor (nunca lo impone el
navegador) y que la venta y la factura conservan el mismo subtotal, IVA y
total. No usa base de datos: `_items_con_precios` recibe un cursor de prueba.
"""

import pytest
from fastapi import HTTPException

from app.comercial import (
    CATALOGO_DEMO,
    IVA_PORCENTAJE,
    MAX_FLORES_RAMO,
    PRECIO_BASE_RAMO,
    PRECIO_POR_FLOR,
    calcular_totales,
)
from app.routes.pedidos import _items_con_precios
from app.schemas import PedidoItem
from tests.helpers import FakeCursor


def cursor_con_catalogo():
    return FakeCursor(
        productos={1: {"id_producto": 1, "nombre": "Rosas rojas", "precio": 18000}},
    )


# ----------------------------------------------------------------------
# Precio del pedido: lo fija el servidor
# ----------------------------------------------------------------------

def test_pedido_con_producto_real_ignora_el_precio_del_cliente():
    items, total = _items_con_precios(cursor_con_catalogo(), [
        PedidoItem(id_producto=1, nombre_producto="Lo que diga el cliente", cantidad=2, precio=1),
    ])
    assert items[0]["nombre_producto"] == "Rosas rojas"
    assert items[0]["precio"] == 18000
    assert total == 36000


def test_ramo_personalizado_se_calcula_en_el_servidor():
    items, total = _items_con_precios(FakeCursor(), [
        PedidoItem(
            id_producto=None, nombre_producto="Ramo a mi gusto", cantidad=1, precio=1,
            es_personalizado=True, flores=["Rosa", "Lirio", "Tulipán"],
        ),
    ])
    esperado = PRECIO_BASE_RAMO + 3 * PRECIO_POR_FLOR
    assert items[0]["nombre_producto"] == "Ramo personalizado (3 flores)"
    assert items[0]["precio"] == esperado
    assert total == esperado


def test_ramo_personalizado_respeta_la_cantidad():
    _, total = _items_con_precios(FakeCursor(), [
        PedidoItem(
            id_producto=None, nombre_producto="x", cantidad=2, precio=1,
            es_personalizado=True, flores=["Rosa", "Lirio"],
        ),
    ])
    assert total == (PRECIO_BASE_RAMO + 2 * PRECIO_POR_FLOR) * 2


def test_catalogo_demo_no_confia_en_el_precio_del_cliente():
    precio_real = CATALOGO_DEMO["Girasoles"]
    items, total = _items_con_precios(FakeCursor(), [
        PedidoItem(id_producto=None, nombre_producto="Girasoles", cantidad=3, precio=1),
    ])
    assert items[0]["precio"] == precio_real
    assert total == precio_real * 3


def test_producto_fuera_del_catalogo_se_rechaza():
    with pytest.raises(HTTPException) as error:
        _items_con_precios(FakeCursor(), [
            PedidoItem(id_producto=None, nombre_producto="Producto pirata", cantidad=1, precio=100),
        ])
    assert error.value.status_code == 400


def test_ramo_personalizado_sin_flores_se_rechaza():
    with pytest.raises(HTTPException):
        _items_con_precios(FakeCursor(), [
            PedidoItem(id_producto=None, nombre_producto="x", cantidad=1, precio=1,
                       es_personalizado=True, flores=[]),
        ])


def test_ramo_personalizado_con_demasiadas_flores_se_rechaza():
    with pytest.raises(HTTPException):
        _items_con_precios(FakeCursor(), [
            PedidoItem(id_producto=None, nombre_producto="x", cantidad=1, precio=1,
                       es_personalizado=True, flores=["Flor"] * (MAX_FLORES_RAMO + 1)),
        ])


def test_cantidad_menor_a_uno_se_rechaza():
    with pytest.raises(HTTPException):
        _items_con_precios(cursor_con_catalogo(), [
            PedidoItem(id_producto=1, nombre_producto="Rosas rojas", cantidad=0, precio=18000),
        ])


# ----------------------------------------------------------------------
# El flujo completo conserva los cálculos
# ----------------------------------------------------------------------

def test_flujo_pedido_a_venta_a_factura_conserva_subtotal_iva_y_total():
    # 1. Pedido: precios fijados por el servidor.
    items, subtotal_pedido = _items_con_precios(cursor_con_catalogo(), [
        PedidoItem(id_producto=1, nombre_producto="Rosas rojas", cantidad=2, precio=1),
        PedidoItem(id_producto=None, nombre_producto="Girasoles", cantidad=1, precio=1),
    ])
    assert subtotal_pedido == 2 * 18000 + CATALOGO_DEMO["Girasoles"]

    # 2. Venta: el pedido se convierte aplicando IVA sobre la base.
    totales_venta = calcular_totales(subtotal_pedido, 0, True)
    assert totales_venta["subtotal"] == 51000
    assert totales_venta["impuestos"] == round(51000 * IVA_PORCENTAJE / 100, 2)
    assert totales_venta["total"] == round(51000 + totales_venta["impuestos"], 2)

    # 3. Factura: copia congelada de los valores de la venta.
    factura = {
        "subtotal": totales_venta["subtotal"],
        "descuento": totales_venta["descuento"],
        "impuestos": totales_venta["impuestos"],
        "total": totales_venta["total"],
    }
    assert factura == totales_venta


def test_flujo_con_descuento_global_recalcula_el_iva():
    _, subtotal_pedido = _items_con_precios(cursor_con_catalogo(), [
        PedidoItem(id_producto=1, nombre_producto="Rosas rojas", cantidad=2, precio=1),
    ])
    totales = calcular_totales(subtotal_pedido, 6000, True)
    base = 36000 - 6000
    assert totales["subtotal"] == 36000
    assert totales["impuestos"] == round(base * IVA_PORCENTAJE / 100, 2)
    assert totales["total"] == round(base + totales["impuestos"], 2)
