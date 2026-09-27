"""Pruebas de los cálculos compartidos de ventas y facturas.

Blindan tres cosas que un error dejaría mal facturadas:
- que el IVA se calcule sobre la base después del descuento;
- que el precio lo ponga el catálogo del servidor y no el navegador;
- que la numeración consecutiva no se repita.
"""

from datetime import datetime

import pytest
from fastapi import HTTPException

from app.comercial import (
    IVA_PORCENTAJE,
    calcular_totales,
    construir_lineas,
    generar_consecutivo,
)
from app.schemas import VentaItem
from tests.helpers import FakeCursor


def cursor_con_catalogo():
    return FakeCursor(
        productos={1: {"id_producto": 1, "nombre": "Rosas rojas", "precio": 18000}},
        servicios={7: {"id_servicio": 7, "nombre": "Domicilio", "precio": 5000}},
    )


# ----------------------------------------------------------------------
# calcular_totales: descuento -> base -> IVA -> total
# ----------------------------------------------------------------------

def test_iva_se_calcula_sobre_el_subtotal():
    totales = calcular_totales(100000, 0, True)
    assert totales["subtotal"] == 100000
    assert totales["descuento"] == 0
    assert totales["impuestos"] == round(100000 * IVA_PORCENTAJE / 100, 2)
    assert totales["total"] == round(100000 + totales["impuestos"], 2)


def test_el_descuento_se_aplica_antes_del_iva():
    totales = calcular_totales(100000, 10000, True)
    base = 90000
    assert totales["descuento"] == 10000
    assert totales["impuestos"] == round(base * IVA_PORCENTAJE / 100, 2)
    assert totales["total"] == round(base + totales["impuestos"], 2)


def test_sin_impuestos_el_total_es_la_base():
    totales = calcular_totales(50000, 5000, False)
    assert totales["impuestos"] == 0
    assert totales["total"] == 45000


def test_descuento_mayor_al_subtotal_es_error():
    with pytest.raises(HTTPException) as error:
        calcular_totales(1000, 5000, True)
    assert error.value.status_code == 400


def test_descuento_negativo_se_ignora():
    totales = calcular_totales(1000, -50, True)
    assert totales["descuento"] == 0


# ----------------------------------------------------------------------
# construir_lineas: el servidor manda sobre nombre y precio
# ----------------------------------------------------------------------

def test_construir_lineas_usa_el_precio_del_catalogo_no_el_del_cliente():
    lineas, subtotal = construir_lineas(cursor_con_catalogo(), [
        VentaItem(tipo_item="producto", id_producto=1, cantidad=2, precio_unitario=1),
    ])
    assert lineas[0]["nombre_item"] == "Rosas rojas"
    assert lineas[0]["precio_unitario"] == 18000
    assert lineas[0]["subtotal"] == 36000
    assert subtotal == 36000


def test_construir_lineas_de_servicio():
    lineas, subtotal = construir_lineas(cursor_con_catalogo(), [
        VentaItem(tipo_item="servicio", id_servicio=7, cantidad=1, precio_unitario=999),
    ])
    assert lineas[0]["id_servicio"] == 7
    assert lineas[0]["id_producto"] is None
    assert lineas[0]["precio_unitario"] == 5000
    assert subtotal == 5000


def test_construir_lineas_resta_el_descuento_de_la_linea():
    lineas, subtotal = construir_lineas(cursor_con_catalogo(), [
        VentaItem(tipo_item="producto", id_producto=1, cantidad=2, descuento=1000),
    ])
    assert lineas[0]["subtotal"] == 35000
    assert subtotal == 35000


def test_construir_lineas_rechaza_producto_inexistente():
    with pytest.raises(HTTPException) as error:
        construir_lineas(cursor_con_catalogo(), [
            VentaItem(tipo_item="producto", id_producto=99, cantidad=1),
        ])
    assert error.value.status_code == 400


def test_construir_lineas_rechaza_descuento_mayor_a_la_linea():
    with pytest.raises(HTTPException):
        construir_lineas(cursor_con_catalogo(), [
            VentaItem(tipo_item="producto", id_producto=1, cantidad=1, descuento=999999),
        ])


def test_construir_lineas_exige_al_menos_un_item():
    with pytest.raises(HTTPException):
        construir_lineas(cursor_con_catalogo(), [])


# ----------------------------------------------------------------------
# generar_consecutivo: no reutiliza números
# ----------------------------------------------------------------------

def test_consecutivo_continua_desde_el_mayor_existente():
    numero = generar_consecutivo(FakeCursor(ultimo=7), "ventas", "numero_venta", "VT")
    anio = datetime.now().year
    assert numero == f"VT-{anio}-0008"


def test_consecutivo_arranca_en_uno_si_no_hay_registros():
    numero = generar_consecutivo(FakeCursor(ultimo=None), "facturas", "numero_factura", "FC")
    anio = datetime.now().year
    assert numero == f"FC-{anio}-0001"
