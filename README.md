# 🌷 MiJardín

**MiJardín** es una aplicación web para una floristería digital colombiana. El proyecto permite gestionar el catálogo de productos y servicios, usuarios, pedidos, ventas, facturación, PQR, reportes, estadísticas y atención mediante un chatbot.

El sistema está construido con una arquitectura separada de **Frontend + Backend + Base de datos**, y está preparado para despliegue en Railway.

---

## 🌿 Descripción del proyecto

MiJardín busca digitalizar el proceso comercial de una floristería, permitiendo que los clientes consulten el catálogo, armen pedidos y consulten sus compras, mientras que los usuarios administrativos pueden gestionar la operación desde paneles internos.

### Funcionalidades principales

- 🔐 Registro e inicio de sesión.
- 👤 Gestión de usuarios y roles.
- 🌹 Catálogo de productos y servicios.
- 🛒 Carrito y creación de pedidos.
- 📦 Consulta y gestión de pedidos.
- 💰 Registro y gestión de ventas.
- 🧾 Generación y consulta de facturas.
- 📄 Generación de reportes en PDF y Excel.
- 📊 Dashboard con estadísticas.
- 💬 Sistema de PQR (peticiones, quejas, reclamos y sugerencias).
- 🤖 Chatbot de atención al cliente.
- 🔒 Autenticación mediante JWT.
- 📱 Interfaz responsive.
- 📲 Botón de contacto por WhatsApp.
- 🌐 Despliegue mediante Railway.

---

## 🏗️ Arquitectura

```text
┌─────────────────────────────┐
│          Cliente            │
│       Navegador Web         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         Frontend            │
│        React + Vite         │
│   React Router + Tailwind   │
└──────────────┬──────────────┘
               │ HTTP / API
               ▼
┌─────────────────────────────┐
│          Backend            │
│          FastAPI            │
│      Python + PyMySQL       │
│       JWT + Pydantic        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           MySQL             │
│        Base de datos        │
└─────────────────────────────┘
```

---

## 🛠️ Tecnologías utilizadas

### Frontend

- **React 19**
- **Vite**
- **React Router**
- **Tailwind CSS**
- **Framer Motion**
- **Lucide React**
- **Recharts**
- JavaScript / JSX

### Backend

- **Python**
- **FastAPI**
- **Uvicorn**
- **PyMySQL**
- **Pydantic**
- **PyJWT**
- **Passlib / bcrypt**
- **python-dotenv**
- **HTTPX**
- **ReportLab**
- **OpenPyXL**

### Base de datos

- **MySQL**

### Despliegue

- **Railway**
- Frontend y Backend desplegados como servicios independientes.

---

## 🌐 Aplicación desplegada

### Frontend

**MiJardín - Frontend**

https://front-jardin.up.railway.app

### Backend

**MiJardín - Backend / API**

https://back-jardin.up.railway.app

### Documentación de la API

FastAPI genera automáticamente la documentación interactiva:

https://back-jardin.up.railway.app/docs

### Endpoint de salud

https://back-jardin.up.railway.app/api/v1/salud

---

## 📁 Estructura del proyecto

```text
MiJardin/
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── usuarios.py
│   │   │   ├── productos.py
│   │   │   ├── servicios.py
│   │   │   ├── pedidos.py
│   │   │   ├── ventas.py
│   │   │   ├── facturas.py
│   │   │   ├── reportes.py
│   │   │   ├── pqr.py
│   │   │   ├── estadisticas.py
│   │   │   └── chatbot.py
│   │   │
│   │   ├── comercial.py
│   │   ├── database.py
│   │   ├── documentos.py
│   │   ├── ia.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── security.py
│   │
│   ├── requirements.txt
│   ├── Procfile
│   ├── railway.json
│   └── runtime.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── railway.json
│
├── docs/
│   ├── MiJardin-QuintoAvance.postman_collection.json
│   └── QUINTO-AVANCE.md
│
└── README.md
```

---

## 👥 Roles del sistema

### 👤 Cliente

El cliente puede:

- Registrarse e iniciar sesión.
- Consultar productos y servicios.
- Agregar productos al carrito.
- Realizar pedidos.
- Consultar sus pedidos y compras.
- Consultar facturas.
- Registrar y consultar PQR.
- Utilizar el chatbot.
- Contactar mediante WhatsApp.

### 👨‍💼 Empleado

Puede acceder a funciones administrativas relacionadas con:

- Pedidos.
- Ventas.
- Productos y servicios.
- Facturación.
- Atención de PQR.
- Información comercial.

### 👑 Administrador

Cuenta con funciones administrativas como:

- Gestión de usuarios.
- Gestión de productos.
- Gestión de servicios.
- Gestión de pedidos.
- Gestión de ventas.
- Facturación.
- Reportes.
- Estadísticas.
- Gestión general del sistema.

---

## 🔌 API Backend

El backend está organizado mediante routers de FastAPI.

| Módulo | Ruta base | Función |
|---|---|---|
| Autenticación | `/api/v1/auth` | Registro, login y autenticación |
| Usuarios | `/api/v1/usuarios` | Gestión de usuarios |
| Productos | `/api/v1/productos` | Catálogo de productos |
| Servicios | `/api/v1/servicios` | Catálogo de servicios |
| Pedidos | `/api/v1/pedidos` | Gestión de pedidos |
| Ventas | `/api/v1/ventas` | Gestión comercial |
| Facturas | `/api/v1/facturas` | Facturación |
| Reportes | `/api/v1/reportes` | Reportes |
| PQR | `/api/v1/pqr` | Peticiones, quejas y reclamos |
| Estadísticas | `/api/v1/estadisticas` | Indicadores y estadísticas |
| Chatbot | `/api/v1/chatbot` | Atención mediante chatbot |

> Las rutas y métodos disponibles pueden consultarse directamente en la documentación Swagger de FastAPI.

---

# 💻 Instalación y ejecución local

## Requisitos

Antes de ejecutar el proyecto se recomienda tener instalado:

- Node.js
- npm
- Python 3.x
- MySQL
- Git

---

## 1. Clonar el proyecto

```bash
git clone <URL_DEL_REPOSITORIO>
cd MiJardin
```

---

# 🐍 Configuración del Backend

Entrar a la carpeta:

```bash
cd backend
```

Crear un entorno virtual:

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

Instalar las dependencias:

```bash
pip install -r requirements.txt
```

---

## 🔐 Variables de entorno del Backend

Crear un archivo:

```text
backend/.env
```

Ejemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_PASSWORD
DB_NAME=MiJardin

JWT_SECRET=TU_CLAVE_SECRETA
JWT_EXPIRES_IN=8h

IVA_PORCENTAJE=19
CORS_ORIGINS=http://localhost:5173

IA_API_KEY=TU_API_KEY
IA_BASE_URL=https://api.openai.com/v1
IA_MODELO=TU_MODELO
IA_TIMEOUT=30
```

> ⚠️ **Importante:** nunca publiques el archivo `.env`, contraseñas, claves API o secretos JWT en GitHub.

Ejecutar el backend:

```bash
uvicorn app.main:app --reload
```

El backend estará disponible en:

```text
http://localhost:8000
```

La documentación estará disponible en:

```text
http://localhost:8000/docs
```

---

# ⚛️ Configuración del Frontend

Abrir otra terminal y entrar a:

```bash
cd frontend
```

Instalar las dependencias:

```bash
npm install
```

Crear o configurar:

```text
frontend/.env
```

Para desarrollo:

```env
VITE_API_URL=http://localhost:8000
```

Ejecutar:

```bash
npm run dev
```

El frontend estará disponible normalmente en:

```text
http://localhost:5173
```

---

# 📦 Scripts del Frontend

### Iniciar entorno de desarrollo

```bash
npm run dev
```

### Crear versión de producción

```bash
npm run build
```

### Previsualizar la compilación

```bash
npm run preview
```

### Ejecutar ESLint

```bash
npm run lint
```

---

# 🤖 Chatbot

MiJardín incluye un chatbot llamado **Flora**, orientado a la atención de los clientes.

El chatbot puede ayudar con:

- Información del catálogo.
- Envíos.
- Métodos de pago.
- Pedidos.
- Facturación.
- PQR.
- Ramos personalizados.
- Preguntas frecuentes.

El sistema permite integrar un proveedor de inteligencia artificial mediante variables de entorno.

Además, cuenta con respuestas de respaldo para preguntas frecuentes.

---

# 🛒 Flujo de pedidos

El flujo principal de compra es:

```text
Cliente
   ↓
Catálogo
   ↓
Producto / Servicio
   ↓
Carrito
   ↓
Pedido
   ↓
Venta
   ↓
Factura
```

---

# 🧾 Ventas y facturación

El sistema conecta los pedidos realizados por los clientes con el módulo comercial.

Flujo:

```text
Pedido
   ↓
Venta
   ↓
IVA
   ↓
Factura
   ↓
Documento PDF
```

Las ventas conservan información histórica de los productos y servicios vendidos.

---

# 📊 Reportes y estadísticas

El sistema cuenta con herramientas para consultar información comercial.

Entre las funcionalidades se encuentran:

- Indicadores de ventas.
- Estadísticas.
- Historial de ventas.
- Reportes.
- Exportación a PDF.
- Exportación a Excel.
- Dashboard administrativo.

---

# 💬 Sistema de PQR

Los clientes pueden registrar:

- Peticiones.
- Quejas.
- Reclamos.
- Sugerencias.

Cada solicitud puede contar con un número de radicado y un estado para realizar seguimiento.

---

# 🔐 Seguridad

El proyecto utiliza diferentes mecanismos de seguridad:

- Autenticación mediante **JWT**.
- Contraseñas protegidas mediante hashing.
- Variables de entorno.
- Control de acceso basado en roles.
- Rutas protegidas.
- CORS configurable.
- Protección de información sensible.

---

# 🚀 Despliegue en Railway

El proyecto está dividido en dos servicios principales:

```text
                 Railway
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   Frontend                  Backend
   React/Vite                FastAPI
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
                  MySQL
```

## Frontend

El frontend se construye mediante:

```bash
npm ci
npm run build
```

El resultado de producción se genera en:

```text
dist/
```

## Backend

El backend se ejecuta mediante:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Endpoint utilizado para verificar el estado:

```text
/api/v1/salud
```

---

# 📚 Documentación

Dentro de la carpeta `docs/` se encuentran:

```text
docs/
├── MiJardin-QuintoAvance.postman_collection.json
└── QUINTO-AVANCE.md
```

### Postman

La colección permite probar los diferentes endpoints del backend.

### Documentación FastAPI

La documentación interactiva está disponible en:

https://back-jardin.up.railway.app/docs

---

# 🎯 Objetivo del proyecto

El objetivo de **MiJardín** es ofrecer una plataforma web que permita digitalizar y centralizar la operación de una floristería.

El sistema integra:

- Gestión de clientes.
- Catálogo.
- Productos.
- Servicios.
- Pedidos.
- Ventas.
- Facturación.
- PQR.
- Reportes.
- Estadísticas.
- Chatbot.
- Administración.

De esta manera, se busca proporcionar una solución completa tanto para los clientes como para los usuarios administrativos de la floristería.

---

# 📌 Estado del proyecto

| Característica | Tecnología |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI + Python |
| Base de datos | MySQL |
| API | REST |
| Autenticación | JWT |
| Estilos | Tailwind CSS |
| Dashboard | Recharts |
| Documentos | ReportLab / OpenPyXL |
| IA | API de IA |
| Despliegue | Railway |

---

# 👨‍💻 Proyecto académico

**MiJardín** fue desarrollado como parte de un proceso formativo de desarrollo de software, integrando conocimientos de:

- Desarrollo Frontend.
- Desarrollo Backend.
- Bases de datos.
- APIs REST.
- Autenticación.
- Seguridad.
- Generación de documentos.
- Reportes.
- Despliegue en la nube.
- Inteligencia artificial.

---

## 🌷 MiJardín

**Sistema web para la gestión y comercialización de productos y servicios de floristería.**

🌹 *Flores, tecnología y una mejor experiencia para nuestros clientes.*
