-- ============================================================
-- SISTEMA DE PARQUEO COLEGIO BELÉN
-- SCRIPT COMPLETO - BASE DE DATOS + SP + TRIGGERS + DATOS
-- ============================================================

DROP DATABASE IF EXISTS Sistema_Parqueos_COL_Belen;
CREATE DATABASE Sistema_Parqueos_COL_Belen;
USE Sistema_Parqueos_COL_Belen;


USE u878723730_parqueo;
-- ============================================================
-- 1. TABLAS CATÁLOGO
-- ============================================================

CREATE TABLE Roles (
    id_rol INT PRIMARY KEY AUTO_INCREMENT,
    nom_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NULL
);

CREATE TABLE Procesos (
    id_proceso INT PRIMARY KEY AUTO_INCREMENT,
    nom_proceso VARCHAR(70) NOT NULL,
    descripcion VARCHAR(200) NOT NULL
);

CREATE TABLE Tipo_vehiculo (
    id_tipo INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    precio_efectivo DECIMAL(10,2) NOT NULL,
    precio_linea DECIMAL(10,2) NOT NULL
);

CREATE TABLE Marcas (
    id_marca INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(60) NOT NULL,
    id_tipo INT NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_marca_tipo FOREIGN KEY (id_tipo) REFERENCES Tipo_vehiculo(id_tipo),
    CONSTRAINT unique_marca_tipo UNIQUE (nombre, id_tipo)
);

CREATE TABLE Zonas (
    id_zona INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    ubicacion VARCHAR(100) NOT NULL
);

CREATE TABLE Estado_Lugar (
    id_estado INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    color VARCHAR(7) NULL
);

CREATE TABLE Movimientos (
    id_movimiento INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NULL
);

-- ============================================================
-- 2. TABLAS PRINCIPALES
-- ============================================================

CREATE TABLE Usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    DPI CHAR(13) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    pass VARCHAR(200) NOT NULL,
    telefono VARCHAR(15) NULL,
    id_rol INT NOT NULL DEFAULT 3,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES Roles(id_rol)
);

CREATE TABLE Usuarios_Detalle (
    id_historial_usuario INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_proceso INT NOT NULL,
    ip_dispositivo VARCHAR(45) NOT NULL,
    procedimiento DATETIME NOT NULL,
    operacion JSON NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    CONSTRAINT fk_usuarios_detalle_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    CONSTRAINT fk_usuarios_detalle_proceso FOREIGN KEY (id_proceso) REFERENCES Procesos(id_proceso)
);

CREATE TABLE Vehiculos (
    placa CHAR(6) PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_tipo INT NOT NULL,
    id_marca INT NULL,
    color VARCHAR(30) NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehiculo_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    CONSTRAINT fk_vehiculo_tipo FOREIGN KEY (id_tipo) REFERENCES Tipo_vehiculo(id_tipo),
    CONSTRAINT fk_vehiculo_marca FOREIGN KEY (id_marca) REFERENCES Marcas(id_marca)
);

CREATE TABLE Lugares (
    id_lugar INT PRIMARY KEY AUTO_INCREMENT,
    id_zona INT NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    id_estado INT NOT NULL DEFAULT 1,
    id_tipo_permitido INT NULL,
    activo TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_lugar_zona FOREIGN KEY (id_zona) REFERENCES Zonas(id_zona),
    CONSTRAINT fk_lugar_estado FOREIGN KEY (id_estado) REFERENCES Estado_Lugar(id_estado),
    CONSTRAINT fk_lugar_tipo FOREIGN KEY (id_tipo_permitido) REFERENCES Tipo_vehiculo(id_tipo),
    CONSTRAINT unique_lugar_zona UNIQUE (id_zona, codigo)
);

CREATE TABLE Tickets (
    id_ticket INT PRIMARY KEY AUTO_INCREMENT,
    numero_ticket VARCHAR(20) NOT NULL UNIQUE,
    id_lugar INT NOT NULL,
    placa CHAR(6) NOT NULL,
    id_tipo INT NOT NULL,
    id_usuario INT NULL,
    nombre_externo VARCHAR(120) NULL,
    telefono_externo VARCHAR(20) NULL,
    es_externo TINYINT(1) DEFAULT 0,
    id_guardia_entrada INT NOT NULL,
    id_guardia_salida INT NULL,
    fecha_entrada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida DATETIME NULL,
    activo TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_ticket_lugar FOREIGN KEY (id_lugar) REFERENCES Lugares(id_lugar),
    CONSTRAINT fk_ticket_tipo FOREIGN KEY (id_tipo) REFERENCES Tipo_vehiculo(id_tipo),
    CONSTRAINT fk_ticket_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    CONSTRAINT fk_ticket_vehiculo FOREIGN KEY (placa) REFERENCES Vehiculos(placa),
    CONSTRAINT fk_ticket_guardia_entrada FOREIGN KEY (id_guardia_entrada) REFERENCES Usuarios(id_usuario),
    CONSTRAINT fk_ticket_guardia_salida FOREIGN KEY (id_guardia_salida) REFERENCES Usuarios(id_usuario)
);

CREATE TABLE Tickets_Detalle (
    id_ticket_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT NOT NULL,
    id_movimiento INT NOT NULL,
    id_usuario_accion INT NOT NULL,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_dispositivo VARCHAR(45) NULL,
    datos_adicionales JSON NULL,
    CONSTRAINT fk_tickets_detalle_ticket FOREIGN KEY (id_ticket) REFERENCES Tickets(id_ticket),
    CONSTRAINT fk_tickets_detalle_movimiento FOREIGN KEY (id_movimiento) REFERENCES Movimientos(id_movimiento),
    CONSTRAINT fk_tickets_detalle_usuario FOREIGN KEY (id_usuario_accion) REFERENCES Usuarios(id_usuario)
);

CREATE TABLE Pagos (
    id_pago INT PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT NOT NULL,
    id_usuario INT NULL,
    placa CHAR(6) NOT NULL,
    id_tipo INT NOT NULL,
    metodo_pago ENUM('efectivo', 'linea') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    codigo_validacion VARCHAR(20) NOT NULL UNIQUE,
    estado_pago ENUM('pendiente', 'completado', 'fallido', 'reembolsado') DEFAULT 'pendiente',
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmacion DATETIME NULL,
    fecha_autorizacion_salida DATETIME NULL,
    transaction_id VARCHAR(100) NULL,
    gateway_response JSON NULL,
    observacion TEXT NULL,
    CONSTRAINT fk_pago_ticket FOREIGN KEY (id_ticket) REFERENCES Tickets(id_ticket),
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    CONSTRAINT fk_pago_vehiculo FOREIGN KEY (placa) REFERENCES Vehiculos(placa),
    CONSTRAINT fk_pago_tipo FOREIGN KEY (id_tipo) REFERENCES Tipo_vehiculo(id_tipo)
);

CREATE TABLE Parqueos (
    id_parqueo INT PRIMARY KEY AUTO_INCREMENT,
    id_lugar INT NOT NULL,
    id_ticket INT NOT NULL,
    fecha_ocupacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_liberacion DATETIME NULL,
    CONSTRAINT fk_parqueo_lugar FOREIGN KEY (id_lugar) REFERENCES Lugares(id_lugar),
    CONSTRAINT fk_parqueo_ticket FOREIGN KEY (id_ticket) REFERENCES Tickets(id_ticket)
);

-- ============================================================
-- 3. TABLAS DE LOGS
-- ============================================================

CREATE TABLE Log_Usuarios (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    DPI CHAR(13) NOT NULL,
    email VARCHAR(120) NOT NULL,
    pass VARCHAR(200) NOT NULL,
    telefono VARCHAR(15) NULL,
    id_rol INT NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME,
    accion VARCHAR(20) NOT NULL,
    id_usuario_accion INT NOT NULL,
    ip_dispositivo VARCHAR(45) NULL,
    fecha_log DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Log_Vehiculos (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    placa CHAR(6) NOT NULL,
    id_usuario INT NOT NULL,
    id_tipo INT NOT NULL,
    id_marca INT NULL,
    color VARCHAR(30) NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_registro DATETIME,
    accion VARCHAR(20) NOT NULL,
    id_usuario_accion INT NOT NULL,
    ip_dispositivo VARCHAR(45) NULL,
    fecha_log DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Log_Tickets (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT NOT NULL,
    numero_ticket VARCHAR(20) NOT NULL,
    id_lugar INT NOT NULL,
    placa CHAR(6) NOT NULL,
    id_tipo INT NOT NULL,
    id_usuario INT NULL,
    nombre_externo VARCHAR(120) NULL,
    telefono_externo VARCHAR(20) NULL,
    es_externo TINYINT(1) DEFAULT 0,
    id_guardia_entrada INT NOT NULL,
    id_guardia_salida INT NULL,
    fecha_entrada DATETIME,
    fecha_salida DATETIME NULL,
    activo TINYINT(1) DEFAULT 1,
    accion VARCHAR(20) NOT NULL,
    id_usuario_accion INT NOT NULL,
    ip_dispositivo VARCHAR(45) NULL,
    fecha_log DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Log_Pagos (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_pago INT NOT NULL,
    id_ticket INT NOT NULL,
    id_usuario INT NULL,
    placa CHAR(6) NOT NULL,
    id_tipo INT NOT NULL,
    metodo_pago ENUM('efectivo', 'linea') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    codigo_validacion VARCHAR(20) NOT NULL,
    estado_pago ENUM('pendiente', 'completado', 'fallido', 'reembolsado') DEFAULT 'pendiente',
    fecha_pago DATETIME,
    fecha_confirmacion DATETIME NULL,
    fecha_autorizacion_salida DATETIME NULL,
    transaction_id VARCHAR(100) NULL,
    gateway_response JSON NULL,
    observacion TEXT NULL,
    accion VARCHAR(20) NOT NULL,
    id_usuario_accion INT NOT NULL,
    ip_dispositivo VARCHAR(45) NULL,
    fecha_log DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Log_Lugares (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_lugar INT NOT NULL,
    id_zona INT NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    id_estado INT NOT NULL,
    id_tipo_permitido INT NULL,
    activo TINYINT(1) DEFAULT 1,
    accion VARCHAR(20) NOT NULL,
    id_usuario_accion INT NOT NULL,
    ip_dispositivo VARCHAR(45) NULL,
    fecha_log DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Log_Parqueos (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_parqueo INT NOT NULL,
    id_lugar INT NOT NULL,
    id_ticket INT NOT NULL,
    fecha_ocupacion DATETIME,
    fecha_liberacion DATETIME NULL,
    accion VARCHAR(20) NOT NULL,
    id_usuario_accion INT NOT NULL,
    ip_dispositivo VARCHAR(45) NULL,
    fecha_log DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. ÍNDICES
-- ============================================================

CREATE INDEX idx_log_usuarios_id ON Log_Usuarios(id_usuario);
CREATE INDEX idx_log_vehiculos_placa ON Log_Vehiculos(placa);
CREATE INDEX idx_log_tickets_id ON Log_Tickets(id_ticket);
CREATE INDEX idx_log_pagos_id ON Log_Pagos(id_pago);
CREATE INDEX idx_log_lugares_id ON Log_Lugares(id_lugar);
CREATE INDEX idx_log_parqueos_id ON Log_Parqueos(id_parqueo);
CREATE INDEX idx_tickets_detalle_ticket ON Tickets_Detalle(id_ticket);
CREATE INDEX idx_tickets_detalle_fecha ON Tickets_Detalle(fecha_hora);
CREATE INDEX idx_tickets_placa ON Tickets(placa);
CREATE INDEX idx_pagos_placa ON Pagos(placa);

-- ============================================================
-- 5. DATOS INICIALES
-- ============================================================

INSERT INTO Roles (nom_rol, descripcion) VALUES
('administrador', 'Acceso total al sistema'),
('cobrador', 'Gestiona los distintos de pagos en efectivo'),
('guardia', 'Gestiona entradas y salidas'),
('usuario', 'Usuario regular del parqueo');

INSERT INTO Procesos (nom_proceso, descripcion) VALUES
('creacion_usuario', 'Creación de nuevo usuario'),
('actualizacion_usuario', 'Actualización de datos de usuario'),
('eliminacion_usuario', 'Eliminación de usuario'),
('registro_vehiculo', 'Registro de nuevo vehículo'),
('actualizacion_vehiculo', 'Actualización de vehículo'),
('eliminacion_vehiculo', 'Eliminación de vehículo'),
('creacion_ticket', 'Creación de ticket'),
('actualizacion_ticket', 'Actualización de ticket'),
('creacion_pago', 'Registro de pago'),
('actualizacion_pago', 'Actualización de pago');

INSERT INTO Movimientos (nombre, descripcion) VALUES
('entrada', 'Registro de ingreso del vehículo'),
('salida', 'Registro de salida del vehículo'),
('reasignacion', 'Reasignación de lugar'),
('cancelacion', 'Cancelación del ticket'),
('autorizacion_salida', 'Validación de pago para autorizar la salida');

INSERT INTO Tipo_vehiculo (nombre, precio_efectivo, precio_linea) VALUES
('moto', 15.00, 22.00),
('carro', 20.00, 27.00),
('camioneta', 25.00, 32.00);

INSERT INTO Marcas (nombre, id_tipo) VALUES
('Toyota', 2), ('Honda', 2), ('Nissan', 2), ('Hyundai', 2), ('Kia', 2),
('Ford', 2), ('Chevrolet', 2), ('Mazda', 2), ('Mitsubishi', 2), ('Volkswagen', 2),
('Suzuki', 2), ('BMW', 2), ('Mercedes-Benz', 2), ('Audi', 2), ('Jeep', 2),
('Subaru', 2), ('Volvo', 2), ('Peugeot', 2), ('Renault', 2), ('Fiat', 2),
('Honda', 1), ('Yamaha', 1), ('Suzuki', 1), ('Kawasaki', 1), ('BMW', 1),
('KTM', 1), ('Ducati', 1), ('Harley-Davidson', 1), ('Italika', 1), ('Bajaj', 1),
('TVS', 1), ('Hero', 1),
('Toyota', 3), ('Ford', 3), ('Chevrolet', 3), ('Nissan', 3), ('Mitsubishi', 3),
('Isuzu', 3), ('RAM', 3), ('GMC', 3), ('Mazda', 3), ('Volkswagen', 3);

INSERT INTO Estado_Lugar (nombre, color) VALUES
('disponible', '#00CC00'),
('ocupado', '#FF0000'),
('mantenimiento', '#FFA500');

INSERT INTO Zonas (nombre, ubicacion) VALUES
('Parqueo Principal', 'Frente al edificio principal'),
('Parqueo del Domo', 'Al lado del domo polideportivo');

INSERT INTO Lugares (id_zona, codigo, id_estado) VALUES
(1, 'A01', 1), (1, 'A02', 1), (1, 'A03', 1), (1, 'A04', 1), (1, 'A05', 1),
(1, 'A06', 1), (1, 'A07', 1), (1, 'A08', 1), (1, 'A09', 1), (1, 'A10', 1),
(1, 'A11', 1), (1, 'A12', 1), (1, 'A13', 1), (1, 'A14', 1), (1, 'A15', 1),
(1, 'A16', 1), (1, 'A17', 1), (1, 'A18', 1), (1, 'A19', 1), (1, 'A20', 1),
(1, 'A21', 1), (1, 'A22', 1), (1, 'A23', 1), (1, 'A24', 1), (1, 'A25', 1),
(1, 'A26', 1), (1, 'A27', 1), (1, 'A28', 1), (1, 'A29', 1), (1, 'A30', 1),
(1, 'A31', 1), (1, 'A32', 1), (1, 'A33', 1), (1, 'A34', 1), (1, 'A35', 1),
(1, 'A36', 1), (1, 'A37', 1), (1, 'A38', 1), (1, 'A39', 1), (1, 'A40', 1),
(1, 'A41', 1), (1, 'A42', 1), (1, 'A43', 1), (1, 'A44', 1), (1, 'A45', 1),
(1, 'A46', 1), (1, 'A47', 1), (1, 'A48', 1), (1, 'A49', 1), (1, 'A50', 1);

INSERT INTO Lugares (id_zona, codigo, id_estado) VALUES
(2, 'B01', 1), (2, 'B02', 1), (2, 'B03', 1), (2, 'B04', 1), (2, 'B05', 1),
(2, 'B06', 1), (2, 'B07', 1), (2, 'B08', 1), (2, 'B09', 1), (2, 'B10', 1),
(2, 'B11', 1), (2, 'B12', 1), (2, 'B13', 1), (2, 'B14', 1), (2, 'B15', 1),
(2, 'B16', 1), (2, 'B17', 1), (2, 'B18', 1), (2, 'B19', 1), (2, 'B20', 1),
(2, 'B21', 1), (2, 'B22', 1), (2, 'B23', 1), (2, 'B24', 1), (2, 'B25', 1),
(2, 'B26', 1), (2, 'B27', 1), (2, 'B28', 1), (2, 'B29', 1), (2, 'B30', 1);


INSERT INTO Vehiculos (placa, id_usuario, id_tipo, id_marca, color) VALUES
('ABC123', 3, 2, 1, 'Blanco'),
('DEF456', 3, 1, 22, 'Rojo');

-- ============================================================
-- 6. FUNCIONES
-- ============================================================

DELIMITER //

DROP FUNCTION IF EXISTS fn_calcular_precio //
CREATE FUNCTION fn_calcular_precio(
    p_tipo VARCHAR(20),
    p_metodo VARCHAR(10)
) RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_precio DECIMAL(10,2);
    SELECT IF(p_metodo = 'efectivo', precio_efectivo, precio_linea) INTO v_precio
    FROM Tipo_vehiculo WHERE nombre = p_tipo;
    RETURN v_precio;
END //

DROP FUNCTION IF EXISTS fn_generar_codigo //
CREATE FUNCTION fn_generar_codigo() RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    RETURN LPAD(FLOOR(RAND() * 1000000), 6, '0');
END //

-- ============================================================
-- 7. TRIGGERS
-- ============================================================

DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_usuarios_update$$
CREATE TRIGGER trg_log_usuarios_update
BEFORE UPDATE ON Usuarios
FOR EACH ROW
BEGIN
    INSERT INTO Log_Usuarios (
        id_usuario, nombres, apellidos, DPI, email, pass, telefono,
        id_rol, activo, fecha_creacion, accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.id_usuario, OLD.nombres, OLD.apellidos, OLD.DPI, OLD.email, OLD.pass, OLD.telefono,
        OLD.id_rol, OLD.activo, OLD.fecha_creacion, 'UPDATE', OLD.id_usuario, NULL
    );
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_vehiculos_update$$
CREATE TRIGGER trg_log_vehiculos_update
BEFORE UPDATE ON Vehiculos
FOR EACH ROW
BEGIN
    INSERT INTO Log_Vehiculos (
        placa, id_usuario, id_tipo, id_marca, color,
        activo, fecha_registro, accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.placa, OLD.id_usuario, OLD.id_tipo, OLD.id_marca, OLD.color,
        OLD.activo, OLD.fecha_registro, 'UPDATE', OLD.id_usuario, NULL
    );
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_tickets_update$$
CREATE TRIGGER trg_log_tickets_update
BEFORE UPDATE ON Tickets
FOR EACH ROW
BEGIN
    INSERT INTO Log_Tickets (
        id_ticket, numero_ticket, id_lugar, placa, id_tipo,
        id_usuario, nombre_externo, telefono_externo, es_externo,
        id_guardia_entrada, id_guardia_salida, fecha_entrada,
        fecha_salida, activo, accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.id_ticket, OLD.numero_ticket, OLD.id_lugar, OLD.placa, OLD.id_tipo,
        OLD.id_usuario, OLD.nombre_externo, OLD.telefono_externo, OLD.es_externo,
        OLD.id_guardia_entrada, OLD.id_guardia_salida, OLD.fecha_entrada,
        OLD.fecha_salida, OLD.activo, 'UPDATE', IFNULL(OLD.id_usuario, OLD.id_guardia_entrada), NULL
    );
END$$
DELIMITER ;


DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_pagos_update$$
CREATE TRIGGER trg_log_pagos_update
BEFORE UPDATE ON Pagos
FOR EACH ROW
BEGIN
    INSERT INTO Log_Pagos (
        id_pago, id_ticket, id_usuario, placa, id_tipo,
        metodo_pago, monto, codigo_validacion, estado_pago,
        fecha_pago, fecha_confirmacion, fecha_autorizacion_salida,
        transaction_id, gateway_response, observacion,
        accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.id_pago, OLD.id_ticket, OLD.id_usuario, OLD.placa, OLD.id_tipo,
        OLD.metodo_pago, OLD.monto, OLD.codigo_validacion, OLD.estado_pago,
        OLD.fecha_pago, OLD.fecha_confirmacion, OLD.fecha_autorizacion_salida,
        OLD.transaction_id, OLD.gateway_response, OLD.observacion,
        'UPDATE', IFNULL(OLD.id_usuario, 1), NULL
    );
END$$
DELIMITER ;


DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_lugares_update$$
CREATE TRIGGER trg_log_lugares_update
BEFORE UPDATE ON Lugares
FOR EACH ROW
BEGIN
    INSERT INTO Log_Lugares (
        id_lugar, id_zona, codigo, id_estado, id_tipo_permitido, activo,
        accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.id_lugar, OLD.id_zona, OLD.codigo, OLD.id_estado, OLD.id_tipo_permitido, OLD.activo,
        'UPDATE', 1, NULL
    );
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_parqueos_update$$
CREATE TRIGGER trg_log_parqueos_update
BEFORE UPDATE ON Parqueos
FOR EACH ROW
BEGIN
    INSERT INTO Log_Parqueos (
        id_parqueo, id_lugar, id_ticket, fecha_ocupacion, fecha_liberacion,
        accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.id_parqueo, OLD.id_lugar, OLD.id_ticket, OLD.fecha_ocupacion, OLD.fecha_liberacion,
        'UPDATE', 1, NULL
    );
END$$
DELIMITER ;

-- ============================================================
-- 8. STORED PROCEDURES
-- ============================================================

-- 8.1 LOGIN
DROP PROCEDURE IF EXISTS `loginN` //
CREATE PROCEDURE `loginN`(
    IN p_identificador VARCHAR(100),
    IN p_contraseña VARCHAR(200),
    IN p_ip VARCHAR(45),
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE v_id_usuario INT DEFAULT NULL;
    DECLARE v_pass VARCHAR(200) DEFAULT NULL;
    DECLARE v_rol VARCHAR(70) DEFAULT NULL;
    DECLARE v_email VARCHAR(120) DEFAULT NULL;
    DECLARE v_dpi CHAR(13) DEFAULT NULL;
    DECLARE v_nombres VARCHAR(120) DEFAULT NULL;
    DECLARE v_apellidos VARCHAR(120) DEFAULT NULL;
    DECLARE v_activo TINYINT DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error en loginN. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    SELECT u.id_usuario, u.pass, r.nom_rol, u.email, u.DPI, u.nombres, u.apellidos, u.activo
    INTO v_id_usuario, v_pass, v_rol, v_email, v_dpi, v_nombres, v_apellidos, v_activo
    FROM Usuarios u
    JOIN Roles r ON r.id_rol = u.id_rol
    WHERE u.email = p_identificador OR u.DPI = p_identificador
    LIMIT 1;

    CASE
        WHEN v_id_usuario IS NULL THEN
            SET pcodigo_s = 400;
            SET pmensaje = 'Credenciales inválidas';
            SET pdata = NULL;
        WHEN v_activo = 0 THEN
            SET pcodigo_s = 401;
            SET pmensaje = 'Usuario desactivado';
            SET pdata = NULL;
        ELSE
            SET pcodigo_s = 200;
            SET pmensaje = 'Operación realizada exitosamente.';
            SET pdata = JSON_OBJECT(
                'id_usuario', v_id_usuario,
                'rol', v_rol,
                'email', v_email,
                'dpi', v_dpi,
                'nombres', v_nombres,
                'apellidos', v_apellidos,
                'pass', v_pass
            );
    END CASE;
END //

-- 8.2 CONSULTAR HISTORIAL
DROP PROCEDURE IF EXISTS `consultarHistorial` //
CREATE PROCEDURE `consultarHistorial`(
    IN p_placa VARCHAR(20),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error al consultar historial. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'id_parqueo', p.id_parqueo,
            'id_ticket', p.id_ticket,
            'placa', t.placa,
            'lugar', l.codigo,
            'zona', z.nombre,
            'fecha_ocupacion', p.fecha_ocupacion,
            'fecha_liberacion', p.fecha_liberacion,
            'estado', CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END,
            'ticket', t.numero_ticket,
            'costo', pg.monto,
            'estado_pago', pg.estado_pago,
            'metodo_pago', pg.metodo_pago
        )
    ) INTO pdata
    FROM Parqueos p
    JOIN Tickets t ON t.id_ticket = p.id_ticket
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    WHERE t.placa = UPPER(p_placa)
      AND DATE(p.fecha_ocupacion) BETWEEN p_fecha_inicio AND p_fecha_fin
    ORDER BY p.fecha_ocupacion DESC;

    IF pdata IS NULL OR pdata = 'null' THEN
        SET pcodigo_s = 404;
        SET pmensaje = 'No se encontraron registros para esta placa en el rango de fechas';
        SET pdata = '[]';
    ELSE
        SET pcodigo_s = 200;
        SET pmensaje = 'Historial consultado exitosamente';
    END IF;
END //

-- 8.3 REGISTRAR ENTRADA
DROP PROCEDURE IF EXISTS `registrarEntrada` //
CREATE PROCEDURE `registrarEntrada`(
    IN p_placa VARCHAR(20),
    IN p_tipo VARCHAR(20),
    IN p_id_guardia INT,
    IN p_es_externo TINYINT,
    IN p_nombre_externo VARCHAR(120),
    IN p_telefono_externo VARCHAR(20),
    IN p_id_usuario INT,
    IN p_ip VARCHAR(45),
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE v_id_lugar INT;
    DECLARE v_codigo VARCHAR(10);
    DECLARE v_id_ticket INT;
    DECLARE v_contador INT;
    DECLARE v_id_tipo INT;
    DECLARE v_vehiculo_existe INT;
    DECLARE v_numero_ticket VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error al registrar entrada. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    SELECT id_tipo INTO v_id_tipo FROM Tipo_vehiculo WHERE nombre = p_tipo;

    IF p_es_externo = 0 THEN
        SELECT COUNT(*) INTO v_vehiculo_existe FROM Vehiculos WHERE placa = UPPER(p_placa);
        IF v_vehiculo_existe = 0 THEN
            SET pcodigo_s = 400;
            SET pmensaje = 'Vehículo no registrado. Use opción externo o registre primero.';
            SET pdata = NULL;
            LEAVE;
        END IF;
    END IF;

    SELECT l.id_lugar, l.codigo INTO v_id_lugar, v_codigo
    FROM Lugares l
    WHERE l.id_estado = 1 AND l.activo = 1
      AND (l.id_tipo_permitido IS NULL OR l.id_tipo_permitido = v_id_tipo)
    LIMIT 1;

    IF v_id_lugar IS NULL THEN
        SET pcodigo_s = 400;
        SET pmensaje = 'No hay lugares disponibles';
        SET pdata = NULL;
    ELSE
        SELECT COUNT(*) + 1 INTO v_contador FROM Tickets WHERE DATE(fecha_entrada) = CURDATE();
        SET v_numero_ticket = CONCAT('TK-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(v_contador, 4, '0'));

        INSERT INTO Tickets (
            numero_ticket, id_lugar, placa, id_tipo, id_usuario,
            nombre_externo, telefono_externo, es_externo,
            id_guardia_entrada, fecha_entrada, activo
        ) VALUES (
            v_numero_ticket, v_id_lugar, UPPER(p_placa), v_id_tipo,
            IF(p_es_externo = 0, p_id_usuario, NULL),
            p_nombre_externo, p_telefono_externo, p_es_externo,
            p_id_guardia, NOW(), 1
        );

        SET v_id_ticket = LAST_INSERT_ID();

        UPDATE Lugares SET id_estado = 2 WHERE id_lugar = v_id_lugar;
        INSERT INTO Parqueos (id_lugar, id_ticket) VALUES (v_id_lugar, v_id_ticket);

        INSERT INTO Tickets_Detalle (
            id_ticket, id_movimiento, id_usuario_accion, ip_dispositivo, datos_adicionales
        ) VALUES (
            v_id_ticket, 1, p_id_guardia, p_ip,
            JSON_OBJECT('placa', UPPER(p_placa), 'tipo', p_tipo, 'lugar', v_codigo)
        );

        SET pcodigo_s = 201;
        SET pmensaje = 'Entrada registrada exitosamente';
        SET pdata = JSON_OBJECT(
            'id_ticket', v_id_ticket,
            'numero_ticket', v_numero_ticket,
            'placa', UPPER(p_placa),
            'lugar', v_codigo,
            'fecha_entrada', NOW()
        );
    END IF;
END //

-- 8.4 REGISTRAR SALIDA
DROP PROCEDURE IF EXISTS `registrarSalida` //
CREATE PROCEDURE `registrarSalida`(
    IN p_id_ticket INT,
    IN p_id_guardia INT,
    IN p_ip VARCHAR(45),
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE v_id_lugar INT;
    DECLARE v_pago_valido INT;
    DECLARE v_placa CHAR(6);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error al registrar salida. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    SELECT id_lugar, placa INTO v_id_lugar, v_placa
    FROM Tickets
    WHERE id_ticket = p_id_ticket AND activo = 1;

    IF v_id_lugar IS NULL THEN
        SET pcodigo_s = 404;
        SET pmensaje = 'Ticket no válido o ya cerrado';
        SET pdata = NULL;
    ELSE
        SELECT COUNT(*) INTO v_pago_valido
        FROM Pagos
        WHERE id_ticket = p_id_ticket AND estado_pago = 'completado';

        IF v_pago_valido = 0 THEN
            SET pcodigo_s = 400;
            SET pmensaje = 'El vehículo no tiene pago completado';
            SET pdata = NULL;
        ELSE
            UPDATE Tickets 
            SET fecha_salida = NOW(), activo = 0, id_guardia_salida = p_id_guardia
            WHERE id_ticket = p_id_ticket;

            UPDATE Lugares SET id_estado = 1 WHERE id_lugar = v_id_lugar;
            UPDATE Parqueos SET fecha_liberacion = NOW() WHERE id_ticket = p_id_ticket;

            INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario_accion, fecha_hora, ip_dispositivo)
            VALUES (p_id_ticket, 2, p_id_guardia, NOW(), p_ip);

            SET pcodigo_s = 200;
            SET pmensaje = 'Salida registrada exitosamente';
            SET pdata = JSON_OBJECT(
                'id_ticket', p_id_ticket,
                'placa', v_placa,
                'fecha_salida', NOW()
            );
        END IF;
    END IF;
END //

-- 8.5 AUDITORIA - LISTAR
DROP PROCEDURE IF EXISTS `sp_auditoria_listar` //
CREATE PROCEDURE `sp_auditoria_listar`(IN p_limite INT)
BEGIN
    SELECT * FROM (
        SELECT l.fecha_log AS fecha, 'usuario' AS entidad, l.id_log AS entidad_id,
               'UPDATE' AS accion, l.id_usuario_accion AS id_usuario_accion,
               u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
               l.accion AS descripcion, l.ip_dispositivo AS ip
        FROM Log_Usuarios l
        LEFT JOIN Usuarios u ON u.id_usuario = l.id_usuario_accion
        UNION ALL
        SELECT l.fecha_log, 'vehiculo', l.id_log, 'UPDATE', l.id_usuario_accion,
               u.nombres, u.apellidos, l.accion, l.ip_dispositivo
        FROM Log_Vehiculos l
        LEFT JOIN Usuarios u ON u.id_usuario = l.id_usuario_accion
        UNION ALL
        SELECT l.fecha_log, 'ticket', l.id_log, 'UPDATE', l.id_usuario_accion,
               u.nombres, u.apellidos, l.accion, l.ip_dispositivo
        FROM Log_Tickets l
        LEFT JOIN Usuarios u ON u.id_usuario = l.id_usuario_accion
        UNION ALL
        SELECT l.fecha_log, 'pago', l.id_log, 'UPDATE', l.id_usuario_accion,
               u.nombres, u.apellidos, l.accion, l.ip_dispositivo
        FROM Log_Pagos l
        LEFT JOIN Usuarios u ON u.id_usuario = l.id_usuario_accion
        UNION ALL
        SELECT l.fecha_log, 'lugar', l.id_log, 'UPDATE', l.id_usuario_accion,
               u.nombres, u.apellidos, l.accion, l.ip_dispositivo
        FROM Log_Lugares l
        LEFT JOIN Usuarios u ON u.id_usuario = l.id_usuario_accion
        UNION ALL
        SELECT l.fecha_log, 'parqueo', l.id_log, 'UPDATE', l.id_usuario_accion,
               u.nombres, u.apellidos, l.accion, l.ip_dispositivo
        FROM Log_Parqueos l
        LEFT JOIN Usuarios u ON u.id_usuario = l.id_usuario_accion
    ) AS eventos
    ORDER BY fecha DESC
    LIMIT p_limite;
END //

-- 8.6 AUDITORIA - REGISTRAR
DROP PROCEDURE IF EXISTS `sp_auditoria_registrar` //
CREATE PROCEDURE `sp_auditoria_registrar`(
    IN p_id_usuario INT,
    IN p_id_proceso INT,
    IN p_ip_dispositivo VARCHAR(45),
    IN p_operacion VARCHAR(500),
    IN p_descripcion VARCHAR(500)
)
BEGIN
    INSERT INTO Usuarios_Detalle (id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion)
    VALUES (p_id_usuario, p_id_proceso, p_ip_dispositivo, NOW(), p_operacion, p_descripcion);
END //

-- 8.7 PAGOS - CREAR EFECTIVO
DROP PROCEDURE IF EXISTS `sp_pagos_crear_efectivo` //
CREATE PROCEDURE `sp_pagos_crear_efectivo`(
    IN p_placa VARCHAR(10),
    IN p_id_tipo_vehiculo INT,
    IN p_id_guardia INT,
    OUT p_id_pago INT,
    OUT p_monto DECIMAL(10,2),
    OUT p_mensaje VARCHAR(200)
)
BEGIN
    DECLARE v_id_ticket INT DEFAULT NULL;
    DECLARE v_id_usuario INT DEFAULT NULL;
    DECLARE v_pago_existente INT DEFAULT NULL;
    DECLARE v_precio DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_codigo VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET p_id_pago = NULL;
        SET p_monto = NULL;
        SET p_mensaje = CONCAT('Error en sp_pagos_crear_efectivo. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
    END;

    SET p_id_pago = NULL;
    SET p_monto = NULL;
    START TRANSACTION;

    SELECT id_ticket, id_usuario INTO v_id_ticket, v_id_usuario
    FROM Tickets
    WHERE UPPER(placa) = UPPER(p_placa) AND activo = 1 AND fecha_salida IS NULL
    ORDER BY id_ticket DESC LIMIT 1 FOR UPDATE;

    IF v_id_ticket IS NULL THEN
        SET p_mensaje = 'No hay un ticket activo para esa placa';
        ROLLBACK;
    ELSE
        SELECT id_pago INTO v_pago_existente FROM Pagos WHERE id_ticket = v_id_ticket LIMIT 1;

        IF v_pago_existente IS NOT NULL THEN
            SET p_mensaje = 'Este ticket ya tiene un pago registrado';
            ROLLBACK;
        ELSE
            SELECT precio_efectivo INTO v_precio FROM Tipo_vehiculo WHERE id_tipo = p_id_tipo_vehiculo LIMIT 1;

            IF v_precio IS NULL THEN
                SET p_mensaje = 'No existe tarifa en efectivo para este tipo de vehículo';
                ROLLBACK;
            ELSE
                IF v_id_usuario IS NULL THEN SET v_id_usuario = p_id_guardia; END IF;
                SET v_codigo = LPAD(FLOOR(RAND() * 1000000), 6, '0');

                INSERT INTO Pagos (id_ticket, id_usuario, placa, id_tipo, metodo_pago, monto, codigo_validacion, estado_pago, fecha_pago, fecha_confirmacion)
                VALUES (v_id_ticket, v_id_usuario, UPPER(p_placa), p_id_tipo_vehiculo, 'efectivo', v_precio, v_codigo, 'completado', NOW(), NOW());

                SET p_id_pago = LAST_INSERT_ID();
                SET p_monto = v_precio;
                SET p_mensaje = CONCAT('OK - Código: ', v_codigo);
                COMMIT;
            END IF;
        END IF;
    END IF;
END //

-- 8.8 PAGOS - LISTAR
DROP PROCEDURE IF EXISTS `sp_pagos_listar` //
CREATE PROCEDURE `sp_pagos_listar`()
BEGIN
    SELECT
        pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
        pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
        pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
        pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion
    FROM Pagos pg
    JOIN Tickets t ON t.id_ticket = pg.id_ticket
    LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
    ORDER BY pg.fecha_pago DESC;
END //

-- 8.9 PAGOS - OBTENER POR ID
DROP PROCEDURE IF EXISTS `sp_pagos_obtener_por_id` //
CREATE PROCEDURE `sp_pagos_obtener_por_id`(IN p_id INT)
BEGIN
    SELECT
        pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
        pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
        pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
        pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion
    FROM Pagos pg
    JOIN Tickets t ON t.id_ticket = pg.id_ticket
    LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
    WHERE pg.id_pago = p_id;
END //

-- 8.10 PAGOS - OBTENER POR TICKET
DROP PROCEDURE IF EXISTS `sp_pagos_obtener_por_ticket` //
CREATE PROCEDURE `sp_pagos_obtener_por_ticket`(IN p_id_ticket INT)
BEGIN
    SELECT
        pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
        pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
        pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
        pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion
    FROM Pagos pg
    JOIN Tickets t ON t.id_ticket = pg.id_ticket
    LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
    WHERE pg.id_ticket = p_id_ticket;
END //

-- 8.11 PAGOS - REPORTE MENSUAL
DROP PROCEDURE IF EXISTS `sp_pagos_reporte_mensual` //
CREATE PROCEDURE `sp_pagos_reporte_mensual`()
BEGIN
    SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
           COUNT(*) AS cantidad_pagos,
           COALESCE(SUM(monto), 0) AS total_cobrado
    FROM Pagos
    WHERE estado_pago = 'completado'
    GROUP BY mes
    ORDER BY mes DESC;
END //

-- 8.12 PARQUEO - HISTORIAL POR PLACA
DROP PROCEDURE IF EXISTS `sp_parqueo_historial_por_placa` //
CREATE PROCEDURE `sp_parqueo_historial_por_placa`(
    IN p_placa VARCHAR(10),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE
)
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa,
        t.fecha_entrada, t.fecha_salida,
        p.fecha_ocupacion, p.fecha_liberacion,
        CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado,
        pg.monto AS costo, pg.estado_pago
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    WHERE t.placa = UPPER(p_placa)
      AND DATE(p.fecha_ocupacion) BETWEEN p_fecha_inicio AND p_fecha_fin
    ORDER BY p.fecha_ocupacion DESC;
END //

-- 8.13 PARQUEO - LISTAR
DROP PROCEDURE IF EXISTS `sp_parqueo_listar` //
CREATE PROCEDURE `sp_parqueo_listar`()
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa,
        t.fecha_entrada, t.fecha_salida,
        p.fecha_ocupacion, p.fecha_liberacion,
        CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado,
        pg.monto AS costo, pg.estado_pago
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    ORDER BY p.id_parqueo DESC;
END //

-- 8.14 PARQUEO - OBTENER ACTIVO POR PLACA
DROP PROCEDURE IF EXISTS `sp_parqueo_obtener_activo_por_placa` //
CREATE PROCEDURE `sp_parqueo_obtener_activo_por_placa`(IN p_placa VARCHAR(10))
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa,
        t.fecha_entrada, p.fecha_ocupacion,
        pg.monto AS costo, pg.estado_pago
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    WHERE t.placa = UPPER(p_placa) AND p.fecha_liberacion IS NULL
    ORDER BY p.id_parqueo DESC
    LIMIT 1;
END //

-- 8.15 PARQUEO - OBTENER POR ID
DROP PROCEDURE IF EXISTS `sp_parqueo_obtener_por_id` //
CREATE PROCEDURE `sp_parqueo_obtener_por_id`(IN p_id INT)
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa,
        t.fecha_entrada, t.fecha_salida,
        p.fecha_ocupacion, p.fecha_liberacion,
        CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado,
        pg.monto AS costo, pg.estado_pago
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    WHERE p.id_parqueo = p_id;
END //

-- 8.16 VEHICULOS - BUSCAR
DROP PROCEDURE IF EXISTS `sp_vehiculos_buscar` //
CREATE PROCEDURE `sp_vehiculos_buscar`(IN p_filtro VARCHAR(100))
BEGIN
    DECLARE v_termino VARCHAR(102);
    SET v_termino = CONCAT('%', p_filtro, '%');

    SELECT
        v.placa, v.id_tipo, tv.nombre AS tipo, m.nombre AS marca,
        v.color, v.activo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.DPI AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
    LEFT JOIN Marcas m ON m.id_marca = v.id_marca
    JOIN Usuarios u ON u.id_usuario = v.id_usuario
    WHERE v.placa LIKE v_termino OR m.nombre LIKE v_termino
       OR u.nombres LIKE v_termino OR u.apellidos LIKE v_termino OR u.DPI LIKE v_termino
    ORDER BY v.placa;
END //

-- 8.17 VEHICULOS - LISTAR
DROP PROCEDURE IF EXISTS `sp_vehiculos_listar` //
CREATE PROCEDURE `sp_vehiculos_listar`()
BEGIN
    SELECT
        v.placa, v.id_tipo, tv.nombre AS tipo, m.nombre AS marca,
        v.color, v.activo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.DPI AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
    LEFT JOIN Marcas m ON m.id_marca = v.id_marca
    JOIN Usuarios u ON u.id_usuario = v.id_usuario
    ORDER BY v.placa;
END //

-- 8.18 VEHICULOS - OBTENER POR PLACA
DROP PROCEDURE IF EXISTS `sp_vehiculos_obtener_por_id` //
CREATE PROCEDURE `sp_vehiculos_obtener_por_id`(IN p_placa VARCHAR(10))
BEGIN
    SELECT
        v.placa, v.id_tipo, tv.nombre AS tipo, m.nombre AS marca,
        v.color, v.activo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.DPI AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
    LEFT JOIN Marcas m ON m.id_marca = v.id_marca
    JOIN Usuarios u ON u.id_usuario = v.id_usuario
    WHERE v.placa = UPPER(p_placa)
    LIMIT 1;
END //

-- 8.19 VEHICULOS - OBTENER POR PLACA
DROP PROCEDURE IF EXISTS `sp_vehiculos_obtener_por_placa` //
CREATE PROCEDURE `sp_vehiculos_obtener_por_placa`(IN p_placa VARCHAR(10))
BEGIN
    SELECT
        v.placa, v.id_tipo, tv.nombre AS tipo, m.nombre AS marca,
        v.color, v.activo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.DPI AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
    LEFT JOIN Marcas m ON m.id_marca = v.id_marca
    JOIN Usuarios u ON u.id_usuario = v.id_usuario
    WHERE v.placa = UPPER(p_placa)
    LIMIT 1;
END //

-- 8.20 TARIFAS - LISTAR
DROP PROCEDURE IF EXISTS `sp_tarifas_listar` //
CREATE PROCEDURE `sp_tarifas_listar`()
BEGIN
    SELECT
        tv.id_tipo AS id_tarifa,
        tv.nombre AS tipo_vehiculo,
        tv.precio_efectivo,
        tv.precio_linea,
        ROUND(tv.precio_linea - tv.precio_efectivo, 2) AS diferencia
    FROM Tipo_vehiculo tv
    ORDER BY tv.nombre;
END //

-- 8.21 TARIFAS - OBTENER POR ID
DROP PROCEDURE IF EXISTS `sp_tarifas_obtener_por_id` //
CREATE PROCEDURE `sp_tarifas_obtener_por_id`(IN p_id INT)
BEGIN
    SELECT
        tv.id_tipo AS id_tarifa,
        tv.nombre AS tipo_vehiculo,
        tv.precio_efectivo,
        tv.precio_linea
    FROM Tipo_vehiculo tv
    WHERE tv.id_tipo = p_id;
END //

-- 8.22 TARIFAS - EXISTE COMBINACION
DROP PROCEDURE IF EXISTS `sp_tarifas_existe_combinacion` //
CREATE PROCEDURE `sp_tarifas_existe_combinacion`(
    IN p_id_tipo_vehiculo INT,
    IN p_id_tipo_pago INT,
    OUT p_existe TINYINT
)
BEGIN
    SELECT COUNT(*) > 0 INTO p_existe FROM Tipo_vehiculo WHERE id_tipo = p_id_tipo_vehiculo;
END //

-- 8.23 TARIFAS - CREAR
DROP PROCEDURE IF EXISTS `sp_tarifas_crear` //
CREATE PROCEDURE `sp_tarifas_crear`(
    IN p_id_tipo_vehiculo INT,
    IN p_precio_efectivo DECIMAL(10,2),
    IN p_precio_linea DECIMAL(10,2),
    OUT p_id_tarifa INT
)
BEGIN
    UPDATE Tipo_vehiculo 
    SET precio_efectivo = p_precio_efectivo,
        precio_linea = p_precio_linea
    WHERE id_tipo = p_id_tipo_vehiculo;
    SET p_id_tarifa = p_id_tipo_vehiculo;
END //

-- 8.24 TARIFAS - ACTUALIZAR
DROP PROCEDURE IF EXISTS `sp_tarifas_actualizar` //
CREATE PROCEDURE `sp_tarifas_actualizar`(
    IN p_id INT,
    IN p_precio_efectivo DECIMAL(10,2),
    IN p_precio_linea DECIMAL(10,2),
    OUT p_afectado TINYINT
)
BEGIN
    UPDATE Tipo_vehiculo 
    SET precio_efectivo = p_precio_efectivo,
        precio_linea = p_precio_linea
    WHERE id_tipo = p_id;
    SET p_afectado = ROW_COUNT() > 0;
END //

-- 8.25 USUARIOS - CRUD
DROP PROCEDURE IF EXISTS `usuariosM` //
CREATE PROCEDURE `usuariosM`(
    IN p_opcion VARCHAR(20),
    IN p_correo VARCHAR(120),
    IN p_contraseña VARCHAR(200),
    IN p_nombres VARCHAR(120),
    IN p_apellidos VARCHAR(120),
    IN p_dpi CHAR(13),
    IN p_rol INT,
    IN p_foto_perfil LONGTEXT,
    IN p_id_usuario INT,
    IN p_ip_dispositivo VARCHAR(45),
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_id_proceso INT DEFAULT NULL;
    DECLARE v_id_usuario INT DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error en usuariosM. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    CASE p_opcion

        WHEN 'crear' THEN
            IF p_correo IS NULL OR p_contraseña IS NULL OR p_nombres IS NULL
               OR p_apellidos IS NULL OR p_dpi IS NULL OR p_rol IS NULL THEN
                SET pcodigo_s = 400;
                SET pmensaje = 'Faltan campos obligatorios';
                SET pdata = NULL;
            ELSE
                SELECT COUNT(*) INTO v_count FROM Usuarios WHERE email = p_correo OR DPI = p_dpi;

                IF v_count > 0 THEN
                    SET pcodigo_s = 409;
                    SET pmensaje = 'Ya existe un usuario con ese correo o DPI';
                    SET pdata = NULL;
                ELSE
                    INSERT INTO Usuarios (id_rol, email, pass, nombres, apellidos, DPI, activo)
                    VALUES (p_rol, p_correo, p_contraseña, p_nombres, p_apellidos, p_dpi, 1);

                    SET v_id_usuario = LAST_INSERT_ID();
                    SELECT id_proceso INTO v_id_proceso FROM Procesos WHERE nom_proceso = 'creacion_usuario' LIMIT 1;

                    INSERT INTO Usuarios_Detalle (id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion)
                    VALUES (v_id_usuario, v_id_proceso, p_ip_dispositivo, NOW(),
                            JSON_OBJECT('accion', 'crear', 'email', p_correo), CONCAT('Usuario creado: ', p_nombres));

                    SET pcodigo_s = 201;
                    SET pmensaje = 'Usuario creado exitosamente';
                    SET pdata = JSON_OBJECT('id_usuario', v_id_usuario, 'email', p_correo);
                END IF;
            END IF;

        WHEN 'buscar' THEN
            IF p_id_usuario IS NOT NULL THEN
                SELECT JSON_OBJECT(
                    'id_usuario', u.id_usuario, 'email', u.email, 'nombres', u.nombres,
                    'apellidos', u.apellidos, 'dpi', u.DPI, 'rol', r.nom_rol, 'activo', u.activo
                ) INTO pdata
                FROM Usuarios u JOIN Roles r ON r.id_rol = u.id_rol
                WHERE u.id_usuario = p_id_usuario;

                IF pdata IS NULL THEN
                    SET pcodigo_s = 404; SET pmensaje = 'Usuario no encontrado'; SET pdata = NULL;
                ELSE
                    SET pcodigo_s = 200; SET pmensaje = 'Usuario encontrado';
                END IF;
            ELSE
                SET pcodigo_s = 400; SET pmensaje = 'Debe proporcionar id_usuario'; SET pdata = NULL;
            END IF;

        WHEN 'actualizar' THEN
            IF p_id_usuario IS NULL THEN
                SET pcodigo_s = 400; SET pmensaje = 'Debe proporcionar id_usuario'; SET pdata = NULL;
            ELSE
                UPDATE Usuarios SET
                    email = IFNULL(p_correo, email),
                    pass = IFNULL(p_contraseña, pass),
                    nombres = IFNULL(p_nombres, nombres),
                    apellidos = IFNULL(p_apellidos, apellidos),
                    DPI = IFNULL(p_dpi, DPI),
                    id_rol = IFNULL(p_rol, id_rol)
                WHERE id_usuario = p_id_usuario;

                SELECT id_proceso INTO v_id_proceso FROM Procesos WHERE nom_proceso = 'actualizacion_usuario' LIMIT 1;
                INSERT INTO Usuarios_Detalle (id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion)
                VALUES (p_id_usuario, v_id_proceso, p_ip_dispositivo, NOW(),
                        JSON_OBJECT('accion', 'actualizar'), CONCAT('Usuario actualizado ID: ', p_id_usuario));

                SET pcodigo_s = 200; SET pmensaje = 'Usuario actualizado exitosamente';
                SET pdata = JSON_OBJECT('id_usuario', p_id_usuario);
            END IF;

        WHEN 'desactivar' THEN
            IF p_id_usuario IS NULL THEN
                SET pcodigo_s = 400; SET pmensaje = 'Debe proporcionar id_usuario'; SET pdata = NULL;
            ELSE
                UPDATE Usuarios SET activo = 0 WHERE id_usuario = p_id_usuario;
                SELECT id_proceso INTO v_id_proceso FROM Procesos WHERE nom_proceso = 'eliminacion_usuario' LIMIT 1;
                INSERT INTO Usuarios_Detalle (id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion)
                VALUES (p_id_usuario, v_id_proceso, p_ip_dispositivo, NOW(),
                        JSON_OBJECT('accion', 'desactivar'), CONCAT('Usuario desactivado ID: ', p_id_usuario));

                SET pcodigo_s = 200; SET pmensaje = 'Usuario desactivado exitosamente';
                SET pdata = JSON_OBJECT('id_usuario', p_id_usuario, 'activo', 0);
            END IF;

        WHEN 'activar' THEN
            IF p_id_usuario IS NULL THEN
                SET pcodigo_s = 400; SET pmensaje = 'Debe proporcionar id_usuario'; SET pdata = NULL;
            ELSE
                UPDATE Usuarios SET activo = 1 WHERE id_usuario = p_id_usuario;
                SET pcodigo_s = 200; SET pmensaje = 'Usuario activado exitosamente';
                SET pdata = JSON_OBJECT('id_usuario', p_id_usuario, 'activo', 1);
            END IF;

        WHEN 'listar' THEN
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id_usuario', u.id_usuario, 'email', u.email, 'nombres', u.nombres,
                    'apellidos', u.apellidos, 'dpi', u.DPI, 'rol', r.nom_rol, 'activo', u.activo
                )
            ) INTO pdata
            FROM Usuarios u JOIN Roles r ON r.id_rol = u.id_rol
            WHERE u.activo = 1;

            SET pcodigo_s = 200; SET pmensaje = 'Usuarios listados exitosamente';

        ELSE
            SET pcodigo_s = 400;
            SET pmensaje = CONCAT('Opción no válida: ', IFNULL(p_opcion, 'NULL'));
            SET pdata = NULL;

    END CASE;
END //

DELIMITER ;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
