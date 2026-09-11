CREATE DATABASE IF NOT EXISTS MiJardin;
USE MiJardin;

CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

INSERT INTO roles (id_rol, nombre) VALUES (1, 'Administrador'), (2, 'Cliente'), (4, 'Empleado') ON DUPLICATE KEY UPDATE nombre=nombre;

CREATE TABLE IF NOT EXISTS permisos (
    id_permiso INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150)
);

INSERT INTO permisos (id_permiso, nombre, descripcion) VALUES
    (1, 'gestionar_usuarios', 'Crear, editar, cambiar estado y eliminar usuarios'),
    (2, 'gestionar_productos', 'Crear, editar y eliminar productos del catálogo'),
    (3, 'gestionar_servicios', 'Crear, editar y eliminar servicios ofrecidos'),
    (4, 'ver_catalogo', 'Consultar productos y servicios disponibles'),
    (5, 'realizar_compras', 'Agregar productos al carrito y solicitar pedidos')
    ON DUPLICATE KEY UPDATE nombre=nombre;

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    PRIMARY KEY (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES roles(id_rol),
    FOREIGN KEY (permiso_id) REFERENCES permisos(id_permiso)
);

-- Administrador: todos los permisos
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id) VALUES (1,1),(1,2),(1,3),(1,4),(1,5);
-- Cliente: ver catálogo y comprar
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id) VALUES (2,4),(2,5);
-- Empleado: gestionar productos/servicios y ver catálogo
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id) VALUES (4,2),(4,3),(4,4);

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    foto VARCHAR(255) NULL,
    estado VARCHAR(20) DEFAULT 'activo',
    ultimo_acceso DATETIME NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id_rol)
);

CREATE TABLE IF NOT EXISTS productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    imagen VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicios (
    id_servicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    imagen VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO servicios (nombre, descripcion, precio) VALUES
    ('Reparto a domicilio', 'Recogemos tu pedido en las tiendas seleccionadas y lo llevamos hasta tu casa.', 8000),
    ('Diseño personalizado de ramos', 'Un florista arma tu ramo a partir de las flores que elijas.', 15000)
    ON DUPLICATE KEY UPDATE nombre=nombre;

-- ============================================================
-- Usuarios de prueba (password hasheado con bcrypt)
-- Contraseña de todos: Admin1234
-- ============================================================
INSERT IGNORE INTO usuarios (nombres, apellidos, tipo_documento, numero_documento, direccion, telefono, email, password, rol_id, estado)
VALUES ('Admin', 'General', 'CC', '1000000000', 'Calle Principal #1-00', '3000000000', 'admin@mijardin.com', '$2b$12$3nQ.r548Qbjvv4DGtaN58.U9Iy0HouBHIpXLucbmXGjHVLECJtNUy', 1, 'activo');

INSERT IGNORE INTO usuarios (nombres, apellidos, tipo_documento, numero_documento, direccion, telefono, email, password, rol_id, estado)
VALUES ('Empleado', 'Prueba', 'CC', '1000000001', 'Avenida #2-00', '3000000001', 'empleado@mijardin.com', '$2b$12$3nQ.r548Qbjvv4DGtaN58.U9Iy0HouBHIpXLucbmXGjHVLECJtNUy', 4, 'activo');

INSERT IGNORE INTO usuarios (nombres, apellidos, tipo_documento, numero_documento, direccion, telefono, email, password, rol_id, estado)
VALUES ('Cliente', 'Prueba', 'CC', '1000000002', 'Carrera #3-00', '3000000002', 'cliente@mijardin.com', '$2b$12$3nQ.r548Qbjvv4DGtaN58.U9Iy0HouBHIpXLucbmXGjHVLECJtNUy', 2, 'activo');


INSERT INTO permisos (id_permiso, nombre, descripcion) VALUES
    (6, 'gestionar_pedidos', 'Consultar, modificar y actualizar pedidos')
    ON DUPLICATE KEY UPDATE nombre=nombre;

INSERT IGNORE INTO rol_permisos (rol_id, permiso_id) VALUES (1,6),(4,6);

CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    estado ENUM('Pendiente','En revisión','Modificado','Confirmado','En preparación','En camino','Entregado','Cancelado') NOT NULL DEFAULT 'Pendiente',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    observaciones TEXT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    cantidad INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE SET NULL
);
