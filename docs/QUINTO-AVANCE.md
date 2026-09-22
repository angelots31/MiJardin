# MiJardín · Documentación técnica del Quinto Avance

Proyecto: **MiJardín** — floristería digital
Ficha 3406204 · Trimestre 03 · Ambiente 502 · Competencia React
Arquitectura: **React + Vite → FastAPI → MySQL**

---

## 1. Qué se agregó y por qué

El cuarto avance dejó la aplicación con autenticación JWT, control de roles, CRUD de usuarios, productos y servicios, y un módulo de pedidos. El quinto avance **no cambia nada de eso**: lo extiende con la capa comercial que le faltaba al negocio.

El puente entre ambos es el endpoint `POST /api/v1/ventas/desde-pedido`: un pedido que el cliente hizo en la tienda se convierte en una venta formal, con impuestos y factura. Así el trabajo anterior no queda como un módulo suelto.

| Antes (cuarto avance) | Ahora (quinto avance) |
|---|---|
| El cliente hace un pedido | El pedido se convierte en venta, se le calcula IVA y se emite factura |
| El dashboard contaba filas en el navegador | Los indicadores y gráficos vienen de FastAPI |
| El cliente escribía por WhatsApp | El cliente radica PQR con número de radicado y sigue su estado |
| No había atención automática | Chatbot con IA integrado al sitio |
| Solo corría en local | Preparado para desplegarse, con variables de entorno y CORS configurables |

---

## 2. Base de datos

### Tablas nuevas

| Tabla | Para qué sirve | Relaciones |
|---|---|---|
| `ventas` | Operación comercial confirmada | `id_cliente` y `id_usuario_registra` → `usuarios`; `id_pedido` → `pedidos` |
| `detalle_ventas` | Una fila por producto o servicio vendido | `id_venta` → `ventas`; `id_producto` → `productos`; `id_servicio` → `servicios` |
| `facturas` | Factura de venta (1 por venta) | `id_venta` → `ventas`; `id_cliente` → `usuarios` |
| `detalle_facturas` | Copia congelada de las líneas al facturar | `id_factura` → `facturas` |
| `pqr` | Peticiones, quejas, reclamos y sugerencias | `id_cliente` y `id_usuario_responde` → `usuarios` |
| `conversaciones` | Cada chat con el asistente | `id_usuario` → `usuarios` (puede ser NULL) |
| `mensajes` | Cada mensaje de una conversación | `id_conversacion` → `conversaciones` |

### Decisiones de diseño que puedes sustentar

**Los detalles guardan copia del nombre y del precio.** `detalle_ventas.nombre_item` y `precio_unitario` no son redundancia por descuido: si mañana subes el precio de las rosas o borras un producto, las ventas viejas deben conservar lo que realmente se cobró ese día. Por eso `id_producto` usa `ON DELETE SET NULL` y no `CASCADE`.

**`detalle_facturas` duplica `detalle_ventas` a propósito.** Una factura es un documento legal: una vez emitida, sus cifras no pueden moverse aunque después se corrija la venta.

**`pedidos → ventas` es opcional (`id_pedido` NULL).** Permite registrar ventas de mostrador o telefónicas que nunca pasaron por la tienda en línea.

**`conversaciones.id_usuario` permite NULL.** Un visitante sin cuenta también puede usar el chatbot; si borras el usuario, la conversación sobrevive sin dueño (`ON DELETE SET NULL`).

**Los estados son `ENUM`.** MySQL rechaza cualquier valor fuera de la lista, lo que da una segunda capa de validación además de la de Pydantic.

### Cómo aplicar los cambios

```bash
# Si ya tienes la base de datos de los avances anteriores:
mysql -u root -p < database_v5.sql

# Si empiezas desde cero (database.sql ya incluye todo):
mysql -u root -p < database.sql
```

---

## 3. Backend (FastAPI)

### Archivos nuevos

```
backend/app/
├── comercial.py          Utilidades compartidas: consecutivos, IVA, cálculo de líneas
├── documentos.py         Generación de PDF (reportlab) y Excel (openpyxl)
├── ia.py                 Cliente del servicio de IA + respaldo por reglas
└── routes/
    ├── ventas.py         Módulo de ventas
    ├── facturas.py       Módulo de facturación
    ├── reportes.py       Reporte diario en JSON, PDF y Excel
    ├── pqr.py            Peticiones, quejas y reclamos
    ├── estadisticas.py   Indicadores y series para los dashboards
    └── chatbot.py        Chatbot con IA
```

Se mantiene la separación pedida: **los esquemas de validación** viven en `schemas.py` (Pydantic) y **el acceso a datos** en las rutas (SQL con PyMySQL). Ningún esquema toca la base de datos y ninguna consulta valida formatos.

### Los 19 endpoints nuevos

**Ventas** (`/api/v1/ventas`)

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| POST | `/` | Admin, Empleado | Registra una venta manual |
| POST | `/desde-pedido` | Admin, Empleado | Convierte un pedido en venta |
| GET | `/` | Todos | Historial con 9 filtros |
| GET | `/{id_venta}` | Todos | Detalle de una venta |
| PATCH | `/{id_venta}` | Admin, Empleado | Cambia estado u observaciones |

Filtros del historial: `fecha_inicio`, `fecha_fin`, `id_cliente`, `estado`, `id_producto`, `id_servicio`, `valor_min`, `valor_max`, `buscar`.

**Facturas** (`/api/v1/facturas`)

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| POST | `/` | Admin, Empleado | Emite la factura de una venta |
| GET | `/` | Todos | Busca por número, cliente, fecha o estado |
| GET | `/{id_factura}` | Todos | Detalle |
| GET | `/{id_factura}/pdf` | Todos | Descarga el PDF |
| PATCH | `/{id_factura}` | Admin, Empleado | Cambia el estado |

**Reportes** (`/api/v1/reportes`)

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| GET | `/ventas` | Admin, Empleado | Reporte en JSON |
| GET | `/ventas/pdf` | Admin, Empleado | Reporte en PDF |
| GET | `/ventas/excel` | Admin, Empleado | Reporte en .xlsx |

Sin parámetros generan el reporte **de hoy**. Con `fecha` toman un día concreto y con `fecha_inicio`/`fecha_fin` un rango.

**PQR** (`/api/v1/pqr`)

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| POST | `/` | Cliente | Radica una solicitud |
| GET | `/mis-pqr` | Cliente | Sus propias solicitudes |
| GET | `/` | Admin, Empleado | Bandeja con filtros |
| GET | `/{id_pqr}` | Todos | Detalle (el cliente solo la suya) |
| PATCH | `/{id_pqr}` | Admin, Empleado | Responde o cambia el estado |

**Estadísticas** (`/api/v1/estadisticas`)

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| GET | `/dashboard` | Todos | Tarjetas de indicadores **según el rol** |
| GET | `/ventas` | Todos | Series por día, semana o mes + ranking |

**Chatbot** (`/api/v1/chatbot`)

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| GET | `/estado` | Cualquiera | Dice si la IA está configurada |
| POST | `/mensaje` | Cualquiera | Envía un mensaje y recibe respuesta |
| GET | `/conversaciones/{id}` | Cualquiera | Historial de una conversación |
| GET | `/conversaciones` | Admin, Empleado | Bandeja de conversaciones |

### El precio siempre lo decide el servidor

Esto es lo más importante del módulo de ventas y está en `comercial.py → construir_lineas()`:

```python
if tipo == "producto" and item.id_producto is not None:
    cursor.execute("SELECT nombre, precio FROM productos WHERE id_producto = %s", (item.id_producto,))
    registro = cursor.fetchone()
    nombre = registro["nombre"]          # se sobrescribe lo que mandó el navegador
    precio = float(registro["precio"])   # el precio del catálogo manda
```

Si alguien edita el JavaScript desde las herramientas de desarrollador y manda `precio_unitario: 1`, el backend lo ignora y usa el precio real. Está comprobado en las pruebas: la prueba *"ignora el precio enviado por el navegador"* manda 999 y verifica que la venta quede en 45.000.

### Cómo se calcula el total

En `comercial.py → calcular_totales()`, en el orden que usa la facturación colombiana:

```
subtotal  = suma de (precio × cantidad − descuento de línea)
base      = subtotal − descuento global
impuestos = base × (IVA_PORCENTAJE / 100)
total     = base + impuestos
```

El IVA no está quemado en el código: sale de la variable de entorno `IVA_PORCENTAJE` (19 por defecto).

### Numeración consecutiva

`generar_consecutivo()` produce `VT-2026-0001`, `FC-2026-0001`, `PQR-2026-0001`. Cuenta los registros del año en curso dentro de la misma transacción del INSERT, así que no quedan huecos ni números repetidos si dos operaciones ocurren casi al tiempo.

---

## 4. Frontend (React + Vite)

### Archivos nuevos

```
frontend/src/
├── api/
│   └── client.js                    Cliente HTTP: JWT, errores, descargas, formatos
├── components/
│   ├── Chatbot.jsx                  Widget flotante del asistente
│   ├── VentasPanel.jsx              Historial, registro y exportación
│   ├── FacturasPanel.jsx            Consulta y descarga de facturas
│   ├── PqrPanel.jsx                 Bandeja de PQR del equipo
│   └── dashboard/
│       ├── StatCard.jsx             Tarjeta de indicador
│       └── DashboardResumen.jsx     Cards + gráfico de barras + gráfico lineal
└── pages/
    ├── MisCompras.jsx               Compras y facturas del cliente
    └── MisPqr.jsx                   Radicar y seguir PQR
```

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `App.jsx` | Rutas `/mis-compras` y `/mis-pqr` + el `<Chatbot />` global |
| `AdminDashboard.jsx` | Pestañas Ventas, Facturas y PQR; dashboard dinámico |
| `PanelEmpleado.jsx` | Lo mismo, sin gestión de cuentas |
| `PanelCliente.jsx` | Dashboard propio y accesos a los módulos nuevos |
| `Header.jsx` | Enlaces del cliente a compras y PQR |
| `api/config.js` | Lee `VITE_API_URL` en vez de la URL fija |
| `package.json` | Se agregó `recharts` para los gráficos |

### Componentes reutilizables

`client.js` concentra lo que antes se repetía en cada componente:

```javascript
await api('/api/v1/ventas');                     // GET con token y manejo de errores
await api('/api/v1/facturas', { method: 'POST', body: JSON.stringify({ id_venta: 3 }) });
await descargarArchivo('/api/v1/facturas/3/pdf', 'FC-2026-0003.pdf');
pesos(49980);                                    // "$ 49.980"
```

`descargarArchivo()` merece una nota: no se puede usar un `<a href>` normal porque la ruta exige el header `Authorization`. Se pide el archivo con `fetch`, se convierte en `blob` y se dispara la descarga con un enlace temporal.

`DashboardResumen` es un solo componente que sirve a los tres roles: recibe `rol` como prop y el backend le devuelve el conjunto de indicadores que corresponde.

### Los dashboards ya no inventan números

Antes, el panel del administrador hacía `users.length` en el navegador. Ahora:

```jsx
const [resumen, ventas] = await Promise.all([
  api('/api/v1/estadisticas/dashboard'),
  api(`/api/v1/estadisticas/ventas${query}`),
]);
```

Ningún indicador ni punto de los gráficos está escrito a mano en el frontend.

---

## 5. Seguridad

| Requisito | Dónde está |
|---|---|
| JWT | `security.py` (de los avances anteriores), usado por todas las rutas nuevas |
| Control de roles | `require_roles("Administrador", "Empleado")` en cada endpoint |
| Protección de endpoints | Los 19 endpoints nuevos declaran su dependencia de seguridad |
| Hashing de contraseñas | bcrypt vía passlib, sin cambios |
| Variables de entorno | `.env` en backend y frontend, con sus `.env.example` |
| Protección de claves | `IA_API_KEY` solo en `.env`; `.gitignore` bloquea los `.env` |

Además hay autorización **a nivel de dato**, no solo de rol: un cliente autenticado que pida la factura de otro recibe un 403, porque el endpoint compara el `id_usuario` del token contra el `id_cliente` del registro.

### La API Key nunca llega al navegador

El chatbot del frontend llama a `POST /api/v1/chatbot/mensaje`. Es **FastAPI** quien llama al proveedor de IA con la clave. Si abres las herramientas de desarrollador y miras la pestaña Network, no aparece ninguna clave.

Para activar la IA:

```bash
# backend/.env
IA_API_KEY=sk-...              # tu clave, nunca en GitHub
IA_BASE_URL=https://api.openai.com/v1
IA_MODELO=gpt-4o-mini
```

`IA_BASE_URL` existe porque el cliente habla el formato estándar de *chat completions*: sirve con OpenAI, Groq, Together u OpenRouter cambiando solo esa URL.

**Si dejas `IA_API_KEY` vacía, el chatbot no se rompe**: responde con un motor de reglas sobre horarios, envíos, pagos, PQR y catálogo. El campo `motor` de la respuesta dice si contestó `"ia"` o `"reglas"`, y el widget lo muestra en su encabezado.

---

## 6. Pruebas

### Automatizadas

El backend se probó contra una base de datos MySQL real con **41 pruebas end-to-end**, todas en verde. Cubren:

- Login de los tres roles y bloqueo de endpoints sin token
- Cálculo del IVA en el servidor y rechazo de precios manipulados
- Venta manual, conversión de pedido y bloqueo de duplicados
- Historial con filtros y aislamiento de datos entre clientes
- Reporte en JSON, PDF (verificando la cabecera `%PDF`) y Excel (cabecera `PK`)
- Emisión de factura, bloqueo de factura duplicada y descarga del PDF
- Radicación y respuesta de PQR
- Dashboards distintos por rol
- Series por día, semana y mes, con filtros
- Chatbot con y sin sesión, y persistencia de la conversación
- Anulación en cascada de venta → factura

### Con Postman

En `docs/MiJardin-QuintoAvance.postman_collection.json` hay **33 peticiones en 7 carpetas**.

1. Importa el archivo en Postman.
2. Ejecuta las 3 peticiones de *0. Autenticación*: guardan solos los tokens en las variables de la colección.
3. Ya puedes ejecutar cualquier otra petición.

Para los endpoints que devuelven archivos (PDF y Excel), usa **Send and Download** en vez de Send.

---

## 7. Despliegue

### Variables de entorno

**Backend**

| Variable | Ejemplo | Nota |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | — | Datos de MySQL |
| `JWT_SECRET` | cadena larga y aleatoria | **Cambiar en producción** |
| `JWT_EXPIRES_IN` | `8h` | Duración de la sesión |
| `IVA_PORCENTAJE` | `19` | Impuesto de la facturación |
| `CORS_ORIGINS` | `https://mijardin.up.railway.app` | En producción, la URL real del frontend |
| `IA_API_KEY` | `sk-...` | Vacía = chatbot por reglas |
| `IA_BASE_URL`, `IA_MODELO` | — | Proveedor y modelo de IA |

**Frontend**

| Variable | Ejemplo |
|---|---|
| `VITE_API_URL` | `https://mijardin-api.up.railway.app` |

### Pasos en Railway

1. **Base de datos**: crea un servicio MySQL. Railway entrega host, puerto, usuario, contraseña y nombre.
2. **Importa el esquema**: conéctate con MySQL Workbench o el cliente de Railway y ejecuta `database.sql`.
3. **Backend**: nuevo servicio apuntando a la carpeta `backend/`. Railway detecta `requirements.txt` y usa el `railway.json` incluido (comando de arranque y healthcheck en `/api/v1/salud`). Carga ahí las variables de la tabla de arriba.
4. **Frontend**: nuevo servicio apuntando a `frontend/`. Define `VITE_API_URL` con la URL pública del backend **antes** de construir (Vite reemplaza el valor en tiempo de compilación).
5. **Cierra el CORS**: cambia `CORS_ORIGINS` del backend de `*` a la URL del frontend y vuelve a desplegar.
6. **Verifica**: abre `https://<tu-backend>/docs` y `https://<tu-backend>/api/v1/salud`.

El orden importa: si construyes el frontend antes de conocer la URL del backend, quedará apuntando a `localhost`.

---

## 8. Dos cosas que debes saber

**`bcrypt` rompe el login al desplegar.** `passlib` no es compatible con bcrypt 4.1 o superior; el error es `password cannot be longer than 72 bytes`. En tu máquina hoy funciona porque tienes una versión vieja instalada, pero un despliegue nuevo instala la última y el login deja de funcionar. Por eso `requirements.txt` ahora fija `bcrypt==4.0.1`. Si ves ese error, revisa esa línea.

**`npm run lint` reporta errores que ya existían.** La regla `react-hooks/set-state-in-effect` (de la versión nueva del plugin de React Hooks) marca el patrón normal de cargar datos con `useEffect`. Aparece en `Tienda.jsx`, `Login.jsx`, `Carousel.jsx` y otros archivos de los avances anteriores, no solo en los nuevos. **No rompe la compilación**: `npm run build` pasa sin problemas. Si quieres dejar el lint limpio, es un trabajo aparte de refactorizar la carga de datos en todo el proyecto.

---

## 9. Cómo correr el proyecto

```bash
# 1. Base de datos
mysql -u root -p < database.sql

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate          # en Windows
pip install -r requirements.txt
copy .env.example .env         # y edita los valores
uvicorn app.main:app --reload --port 8000

# 3. Frontend (en otra terminal)
cd frontend
npm install
copy .env.example .env
npm run dev
```

Usuarios de prueba (contraseña `Admin1234` para los tres):

| Correo | Rol |
|---|---|
| admin@mijardin.com | Administrador |
| empleado@mijardin.com | Empleado |
| cliente@mijardin.com | Cliente |

---

## 10. Guion para la sustentación

Si te preguntan por el flujo de información, este es el recorrido completo:

1. **El cliente compra.** En `/tienda` arma el carrito y confirma. React manda `POST /api/v1/pedidos` con el JWT en el header. FastAPI recalcula precios y guarda en `pedidos` y `detalle_pedido`.
2. **El empleado factura.** En su panel, pestaña Ventas, elige el pedido. React llama a `POST /api/v1/ventas/desde-pedido`. El backend copia las líneas, aplica el IVA y crea la venta con número `VT-2026-XXXX`.
3. **Se emite la factura.** `POST /api/v1/facturas` congela las cifras en `facturas` y `detalle_facturas` y asigna `FC-2026-XXXX`.
4. **El cliente descarga su factura.** Desde *Mis compras*, `GET /api/v1/facturas/{id}/pdf`. El backend verifica que la factura sea suya, genera el PDF con reportlab y lo devuelve como `application/pdf`.
5. **El administrador revisa el negocio.** El dashboard llama a `/estadisticas/dashboard` y `/estadisticas/ventas`. MySQL agrupa con `DATE_FORMAT` y `GROUP BY`, y recharts dibuja las barras y la línea.
6. **Se exporta el reporte.** `/reportes/ventas/pdf` y `/reportes/ventas/excel` toman las mismas ventas y las entregan como archivo.
7. **El cliente reclama.** `POST /api/v1/pqr` genera el radicado `PQR-2026-XXXX`. El empleado responde con `PATCH` y el cliente ve la respuesta en su cuenta.
8. **El chatbot atiende.** El widget llama a `POST /api/v1/chatbot/mensaje`. FastAPI guarda el mensaje, arma el contexto con el catálogo real, llama al proveedor de IA con la clave que solo él conoce, guarda la respuesta y la devuelve.
