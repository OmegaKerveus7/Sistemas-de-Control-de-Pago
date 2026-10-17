
CREATE TABLE Procesos (
    id_proceso INT PRIMARY KEY AUTO_INCREMENT,
    nom_proceso VARCHAR(70) NOT NULL,
    descripcion VARCHAR(120) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Roles (
    id_rol INT PRIMARY KEY AUTO_INCREMENT,
    nom_rol VARCHAR(70) NOT NULL,
    descripcion VARCHAR(120) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Movimientos (
    id_movimiento INT PRIMARY KEY AUTO_INCREMENT,
    tipo_movimiento VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NULL,
    activo TINYINT(1) DEFAULT 1
);

CREATE TABLE Tipos_pagos (
    id_tipo_pago INT PRIMARY KEY AUTO_INCREMENT,
    nom_tipo_pago VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NULL,
    comision_porcentaje DECIMAL(5,2) NULL,
    comision_fija DECIMAL(10,2) NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Estados_Lugares (
    id_estado_lugar INT PRIMARY KEY AUTO_INCREMENT,
    nom_estado VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NULL,
    color_hex VARCHAR(7) NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Marca_vehiculos (
    id_marca INT PRIMARY KEY AUTO_INCREMENT,
    nom_marca VARCHAR(70) NOT NULL,
    activo TINYINT(1) DEFAULT 1
);

CREATE TABLE Tipo_vehiculos (
    id_modelo INT PRIMARY KEY AUTO_INCREMENT,
    nom_tipo_vehiculo VARCHAR(70) NOT NULL UNIQUE,
    activo TINYINT(1) DEFAULT 1
);

CREATE TABLE Horarios (
    id_horario INT PRIMARY KEY AUTO_INCREMENT,
    nom_horario VARCHAR(50) NOT NULL UNIQUE,
    hora TIME NOT NULL UNIQUE,
    activo TINYINT(1) DEFAULT 1
);

CREATE TABLE Zonas (
    id_zona INT PRIMARY KEY AUTO_INCREMENT,
    nom_zona VARCHAR(50) NOT NULL UNIQUE,
    ubicacion VARCHAR(80) NOT NULL UNIQUE,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Usuarios (
    id_usuarios INT PRIMARY KEY AUTO_INCREMENT,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    DPI CHAR(13) NOT NULL,
    id_rol INT NOT NULL,
    email VARCHAR(120) NOT NULL,
    pass VARCHAR(200) NOT NULL,
    fecha_nacimiento DATE NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    foto_perfil LONGTEXT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES Roles(id_rol)
);

CREATE TABLE Vehiculos (
    id_vehiculo INT PRIMARY KEY AUTO_INCREMENT,
    id_marca INT NOT NULL,
    id_tipo_vehiculo INT NOT NULL,
    modelo VARCHAR(60) NOT NULL,
    año YEAR NULL,
    color VARCHAR(50) NULL,
    placa CHAR(6) NOT NULL,
    referencia JSON NOT NULL,
    id_usuario INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_vehiculo_marca FOREIGN KEY (id_marca) REFERENCES Marca_vehiculos(id_marca),
    CONSTRAINT fk_vehiculo_tipo FOREIGN KEY (id_tipo_vehiculo) REFERENCES Tipo_vehiculos(id_modelo),
    CONSTRAINT fk_vehiculo_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuarios)
);

CREATE TABLE Lugares (
    id_lugar INT PRIMARY KEY AUTO_INCREMENT,
    id_zona INT NOT NULL,
    lugar CHAR(4) NOT NULL,
    id_estado_lugar INT NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME NULL,
    CONSTRAINT fk_lugar_zona FOREIGN KEY (id_zona) REFERENCES Zonas(id_zona),
    CONSTRAINT fk_lugar_estado FOREIGN KEY (id_estado_lugar) REFERENCES Estados_Lugares(id_estado_lugar),
    CONSTRAINT unique_lugar_zona UNIQUE (id_zona, lugar)
);

CREATE TABLE Tickets (
    id_ticket INT PRIMARY KEY AUTO_INCREMENT,
    id_lugar INT NOT NULL,
    id_usuario INT NULL,
    id_vehiculo INT NULL,
    numero_ticket VARCHAR(20) NOT NULL,
    numero_marbete VARCHAR(10) NOT NULL,
    placa_automovil CHAR(6) NOT NULL,
    id_guardia INT NOT NULL,
    fecha_entrada DATETIME NOT NULL,
    fecha_salida DATETIME NULL,
    id_movimiento INT NULL,
    qr_data VARCHAR(255) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    es_externo TINYINT(1) DEFAULT 0,
    nombre_externo VARCHAR(120) NULL,
    telefono_externo VARCHAR(20) NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuarios),
    CONSTRAINT fk_ticket_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES Vehiculos(id_vehiculo),
    CONSTRAINT fk_ticket_lugar FOREIGN KEY (id_lugar) REFERENCES Lugares(id_lugar),
    CONSTRAINT fk_ticket_guardia FOREIGN KEY (id_guardia) REFERENCES Usuarios(id_usuarios),
    CONSTRAINT fk_ticket_movimiento FOREIGN KEY (id_movimiento) REFERENCES Movimientos(id_movimiento)
);

CREATE TABLE Tarifas (
    id_tarifa INT PRIMARY KEY AUTO_INCREMENT,
    id_tipo_vehiculo INT NOT NULL,
    id_tipo_pago INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    costo_transaccion DECIMAL(10,2) NULL,
    ganancia DECIMAL(10,2) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME NULL,
    CONSTRAINT fk_tarifa_tipo_vehiculo FOREIGN KEY (id_tipo_vehiculo) REFERENCES Tipo_vehiculos(id_modelo),
    CONSTRAINT fk_tarifa_tipo_pago FOREIGN KEY (id_tipo_pago) REFERENCES Tipos_pagos(id_tipo_pago),
    CONSTRAINT unique_tarifa UNIQUE (id_tipo_vehiculo, id_tipo_pago)
);

CREATE TABLE Pagos (
    id_pago INT PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT NOT NULL,
    id_tarifa INT NOT NULL,
    id_usuario INT NOT NULL,
    id_tipo_pago INT NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    comision DECIMAL(10,2) NULL,
    monto_neto DECIMAL(10,2) NULL,
    codigo_pago VARCHAR(20) NOT NULL UNIQUE,
    estado_pago ENUM('completado', 'fallido', 'pendiente', 'reembolso') NOT NULL DEFAULT 'pendiente',
    referencia_pago VARCHAR(100) NULL,
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmacion DATETIME NULL,
    id_horario INT NULL,
    id_guardia INT NULL,
    transaction_id VARCHAR(100) NULL,
    transaction_date DATETIME NULL,
    authorization_code VARCHAR(50) NULL,
    card_type VARCHAR(30) NULL,
    card_last_digits VARCHAR(4) NULL,
    payment_gateway VARCHAR(50) NULL,
    gateway_response JSON NULL,
    sat_invoice_data JSON NULL,
    invoice_number VARCHAR(50) NULL,
    cai_number VARCHAR(50) NULL,
    fiscal_receipt_number VARCHAR(50) NULL,
    datos_adicionales JSON NULL,
    observacion TEXT NULL,
    CONSTRAINT fk_pago_ticket FOREIGN KEY (id_ticket) REFERENCES Tickets(id_ticket),
    CONSTRAINT fk_pago_tarifa FOREIGN KEY (id_tarifa) REFERENCES Tarifas(id_tarifa),
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuarios),
    CONSTRAINT fk_pago_tipo_pago FOREIGN KEY (id_tipo_pago) REFERENCES Tipos_pagos(id_tipo_pago),
    CONSTRAINT fk_pago_horario FOREIGN KEY (id_horario) REFERENCES Horarios(id_horario),
    CONSTRAINT fk_pago_guardia FOREIGN KEY (id_guardia) REFERENCES Usuarios(id_usuarios)
);

CREATE TABLE Parqueos (
    id_parqueo INT PRIMARY KEY AUTO_INCREMENT,
    id_lugar INT NOT NULL,
    id_ticket INT NOT NULL,
    id_usuario INT NULL,
    fecha_ocupacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_liberacion DATETIME NULL,
    observaciones TEXT NULL,
    CONSTRAINT fk_parqueo_lugar FOREIGN KEY (id_lugar) REFERENCES Lugares(id_lugar),
    CONSTRAINT fk_parqueo_ticket FOREIGN KEY (id_ticket) REFERENCES Tickets(id_ticket),
    CONSTRAINT fk_parqueo_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuarios)
);

CREATE TABLE Usuarios_Detalle (
    id_historial_usuario INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_proceso INT NOT NULL,
    ip_dispositivo VARCHAR(45) NOT NULL,
    procedimiento DATETIME NOT NULL,
    operacion JSON NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    CONSTRAINT fk_detalle_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuarios),
    CONSTRAINT fk_detalle_proceso FOREIGN KEY (id_proceso) REFERENCES Procesos(id_proceso)
);

CREATE TABLE Vehiculos_Detalle (
    id_vehiculo_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_vehiculo INT NOT NULL,
    id_usuario INT NOT NULL,
    id_proceso INT NOT NULL,
    datos_anteriores JSON NOT NULL,
    fecha_hora DATETIME NOT NULL,
    CONSTRAINT fk_detalle_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES Vehiculos(id_vehiculo),
    CONSTRAINT fk_detalle_vehiculo_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuarios),
    CONSTRAINT fk_detalle_vehiculo_proceso FOREIGN KEY (id_proceso) REFERENCES Procesos(id_proceso)
);

CREATE TABLE Tickets_Detalle (
    id_ticket_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT NOT NULL,
    id_movimiento INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_hora DATETIME NOT NULL,
    datos_adicionales JSON NULL,
    ip_dispositivo VARCHAR(45) NULL,
    CONSTRAINT fk_detalle_ticket FOREIGN KEY (id_ticket) REFERENCES Tickets(id_ticket),
    CONSTRAINT fk_detalle_ticket_movimiento FOREIGN KEY (id_movimiento) REFERENCES Movimientos(id_movimiento),
    CONSTRAINT fk_detalle_ticket_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuarios)
);

CREATE TABLE Parqueos_Detalle (
    id_parqueo_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_lugar INT NOT NULL,
    id_usuario_accion INT NOT NULL,
    estado_anterior VARCHAR(20) NOT NULL,
    estado_nuevo VARCHAR(20) NOT NULL,
    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(255) NULL,
    datos_adicionales JSON NULL,
    ip_dispositivo VARCHAR(45) NULL,
    CONSTRAINT fk_detalle_parqueo_lugar FOREIGN KEY (id_lugar) REFERENCES Lugares(id_lugar),
    CONSTRAINT fk_detalle_parqueo_usuario FOREIGN KEY (id_usuario_accion) REFERENCES Usuarios(id_usuarios)
);

CREATE TABLE Pagos_Detalle (
    id_pago_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_pago INT NOT NULL,
    id_usuario_accion INT NOT NULL,
    id_movimiento INT NULL,
    accion VARCHAR(50) NOT NULL,
    estado_anterior VARCHAR(20) NULL,
    estado_nuevo VARCHAR(20) NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    codigo_verificacion VARCHAR(20) NULL,
    datos_adicionales JSON NULL,
    ip_dispositivo VARCHAR(45) NULL,
    observaciones TEXT NULL,
    CONSTRAINT fk_detalle_pago FOREIGN KEY (id_pago) REFERENCES Pagos(id_pago),
    CONSTRAINT fk_detalle_pago_usuario FOREIGN KEY (id_usuario_accion) REFERENCES Usuarios(id_usuarios),
    CONSTRAINT fk_detalle_pago_movimiento FOREIGN KEY (id_movimiento) REFERENCES Movimientos(id_movimiento)
);

INSERT INTO Procesos (nom_proceso, descripcion) VALUES
('creacion_usuario', 'Creación de nuevo usuario en el sistema'),
('actualizacion_usuario', 'Actualización de datos de usuario'),
('eliminacion_usuario', 'Eliminación de usuario'),
('creacion_vehiculo', 'Registro de nuevo vehículo'),
('actualizacion_vehiculo', 'Actualización de datos de vehículo'),
('eliminacion_vehiculo', 'Eliminación de vehículo'),
('creacion_ticket', 'Creación de nuevo ticket de estacionamiento'),
('actualizacion_ticket', 'Actualización de ticket'),
('creacion_pago', 'Registro de nuevo pago'),
('actualizacion_pago', 'Actualización de pago');

INSERT INTO Roles (nom_rol, descripcion) VALUES
('administrador', 'Administrador del sistema con todos los permisos'),
('guardia', 'Guardia de seguridad que gestiona el parqueo'),
('usuario', 'Usuario regular del parqueo');

INSERT INTO Movimientos (tipo_movimiento, descripcion) VALUES
('entrada', 'Registro de ingreso del vehículo'),
('salida', 'Registro de salida del vehículo'),
('asignacion', 'Asignación de lugar de estacionamiento'),
('cancelacion', 'Cancelación del ticket'),
('reasignacion', 'Reasignación de lugar'),
('pago_inicio', 'Inicio de proceso de pago'),
('pago_confirmacion', 'Confirmación de pago'),
('pago_fallido', 'Pago fallido'),
('autorizacion_salida', 'Autorización de salida');

INSERT INTO Tipos_pagos (nom_tipo_pago, descripcion, comision_porcentaje, comision_fija) VALUES
('efectivo', 'Pago en efectivo en el parqueo', NULL, NULL),
('linea', 'Pago en línea con tarjeta', 3.5, 2.00);

INSERT INTO Estados_Lugares (nom_estado, descripcion, color_hex) VALUES
('disponible', 'Lugar libre para estacionar', '#00CC00'),
('ocupado', 'Lugar actualmente ocupado por un vehículo', '#FF0000'),
('extra', 'Lugar adicional o de uso especial', '#FFA500');

INSERT INTO Marca_vehiculos (nom_marca) VALUES
('Toyota'),
('Honda'),
('Hyundai'),
('Nissan'),
('Ford'),
('Chevrolet'),
('Kia'),
('Suzuki'),
('Mitsubishi'),
('Volkswagen');

INSERT INTO Tipo_vehiculos (nom_tipo_vehiculo) VALUES
('moto'),
('carro');

INSERT INTO Horarios (nom_horario, hora) VALUES
('Apertura_Parqueo', '06:00:00'),
('Cierre_Parqueo', '18:00:00'),
('Inicio_Venta_Tickets', '16:00:00'),
('Fin_Venta_Tickets', '17:00:00');

INSERT INTO Zonas (nom_zona, ubicacion) VALUES
('Parqueo Principal', 'Frente al edificio principal del colegio'),
('Parqueo del Domo', 'Al lado del domo polideportivo');





INSERT INTO Tarifas (id_tipo_vehiculo, id_tipo_pago, precio, costo_transaccion, ganancia) VALUES
(1, 1, 15.00, NULL, NULL),
(1, 2, 22.00, 20.00, 2.00),
(2, 1, 20.00, NULL, NULL),
(2, 2, 27.00, 25.00, 2.00);

DELIMITER //

CREATE PROCEDURE sp_registrar_entrada(
    IN p_id_usuario INT,
    IN p_id_vehiculo INT,
    IN p_id_guardia INT,
    IN p_placa VARCHAR(10),
    OUT p_mensaje VARCHAR(200)
)
BEGIN
    DECLARE v_id_lugar INT;
    DECLARE v_numero_ticket VARCHAR(20);
    DECLARE v_id_ticket INT;
    DECLARE v_lugar VARCHAR(10);
    
    SELECT id_lugar, lugar INTO v_id_lugar, v_lugar
    FROM Lugares
    WHERE id_estado_lugar = 1 AND activo = 1
    LIMIT 1;
    
    IF v_id_lugar IS NULL THEN
        SET p_mensaje = 'No hay lugares disponibles';
    ELSE
        SET v_numero_ticket = CONCAT('TK-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', 
                                      LPAD((SELECT COUNT(*) + 1 FROM Tickets WHERE DATE(fecha_entrada) = CURDATE()), 4, '0'));
        
        INSERT INTO Tickets (
            id_lugar, id_usuario, id_vehiculo, numero_ticket, numero_marbete,
            placa_automovil, id_guardia, fecha_entrada, id_movimiento, activo
        ) VALUES (
            v_id_lugar, p_id_usuario, p_id_vehiculo, v_numero_ticket, 
            v_lugar, p_placa, p_id_guardia, NOW(), 1, 1
        );
        
        SET v_id_ticket = LAST_INSERT_ID();
        
        UPDATE Lugares SET id_estado_lugar = 2 WHERE id_lugar = v_id_lugar;
        
        INSERT INTO Parqueos (id_lugar, id_ticket, id_usuario, fecha_ocupacion)
        VALUES (v_id_lugar, v_id_ticket, p_id_usuario, NOW());
        
        INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario, fecha_hora)
        VALUES (v_id_ticket, 1, p_id_guardia, NOW());
        
        SET p_mensaje = CONCAT('Entrada registrada exitosamente. Ticket: ', v_numero_ticket);
    END IF;
END //

CREATE PROCEDURE sp_registrar_salida(
    IN p_id_ticket INT,
    IN p_id_guardia INT,
    OUT p_mensaje VARCHAR(200)
)
BEGIN
    DECLARE v_id_lugar INT;
    DECLARE v_pago_valido INT;
    
    SELECT id_lugar INTO v_id_lugar
    FROM Tickets
    WHERE id_ticket = p_id_ticket AND activo = 1;
    
    IF v_id_lugar IS NULL THEN
        SET p_mensaje = 'Ticket no válido o ya cerrado';
    ELSE
        SELECT COUNT(*) INTO v_pago_valido
        FROM Pagos
        WHERE id_ticket = p_id_ticket AND estado_pago = 'completado';
        
        IF v_pago_valido = 0 THEN
            SET p_mensaje = 'El vehículo no tiene pago completado';
        ELSE
            UPDATE Tickets 
            SET fecha_salida = NOW(), activo = 0, id_movimiento = 2
            WHERE id_ticket = p_id_ticket;
            
            UPDATE Lugares SET id_estado_lugar = 1 WHERE id_lugar = v_id_lugar;
            
            UPDATE Parqueos SET fecha_liberacion = NOW() WHERE id_ticket = p_id_ticket;
            
            INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario, fecha_hora)
            VALUES (p_id_ticket, 2, p_id_guardia, NOW());
            
            SET p_mensaje = 'Salida registrada exitosamente';
        END IF;
    END IF;
END //

CREATE PROCEDURE sp_retirar_vehiculo_por_placa(
    IN p_placa VARCHAR(10),
    IN p_id_guardia INT,
    OUT p_mensaje VARCHAR(200)
)
BEGIN
    DECLARE v_id_ticket INT;
    DECLARE v_id_lugar INT;
    DECLARE v_pago_valido INT;
    
    SELECT t.id_ticket, t.id_lugar
    INTO v_id_ticket, v_id_lugar
    FROM Tickets t
    WHERE t.placa_automovil = p_placa
      AND t.activo = 1
    LIMIT 1;
    
    IF v_id_ticket IS NULL THEN
        SET p_mensaje = 'No se encontró vehículo activo con esa placa';
    ELSE
        SELECT COUNT(*) INTO v_pago_valido
        FROM Pagos
        WHERE id_ticket = v_id_ticket AND estado_pago = 'completado';
        
        IF v_pago_valido = 0 THEN
            SET p_mensaje = 'El vehículo no tiene pago completado';
        ELSE
            UPDATE Tickets 
            SET fecha_salida = NOW(), activo = 0, id_movimiento = 2
            WHERE id_ticket = v_id_ticket;
            
            UPDATE Lugares 
            SET id_estado_lugar = 1 
            WHERE id_lugar = v_id_lugar;
            
            UPDATE Parqueos 
            SET fecha_liberacion = NOW() 
            WHERE id_ticket = v_id_ticket;
            
            INSERT INTO Tickets_Detalle (
                id_ticket, id_movimiento, id_usuario, fecha_hora, datos_adicionales
            ) VALUES (
                v_id_ticket, 2, p_id_guardia, NOW(), 
                JSON_OBJECT('metodo', 'busqueda_placa', 'placa', p_placa)
            );
            
            SET p_mensaje = CONCAT('Vehículo con placa ', p_placa, ' retirado exitosamente');
        END IF;
    END IF;
END //

DROP PROCEDURE loginN;
CREATE DEFINER=`u878723730_famkon`@`%` PROCEDURE `loginN`(
    IN p_identificador VARCHAR(100),
    IN p_contraseña VARCHAR(200),
    IN p_ip VARCHAR(45),
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE v_id_usuarios INT DEFAULT NULL;
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

    -- Buscar usuario por email o DPI
    SELECT 
        u.id_usuarios, 
        u.pass, 
        r.nom_rol, 
        u.email, 
        u.DPI, 
        u.nombres, 
        u.apellidos, 
        u.activo
    INTO 
        v_id_usuarios, 
        v_pass, 
        v_rol, 
        v_email, 
        v_dpi, 
        v_nombres, 
        v_apellidos, 
        v_activo
    FROM Usuarios u
    JOIN Roles r ON r.id_rol = u.id_rol
    WHERE u.email = p_identificador OR u.DPI = p_identificador
    LIMIT 1;

    -- Validar credenciales
    CASE
        WHEN v_id_usuarios IS NULL THEN
            SET pcodigo_s = 400;
            SET pmensaje = 'Credenciales inválidas';
            SET pdata = NULL;
        WHEN v_activo = 0 THEN
            SET pcodigo_s = 401;
            SET pmensaje = 'Usuario desactivado';
            SET pdata = NULL;
        ELSE
            -- Actualizar IP del dispositivo (si tienes el campo en tu nueva tabla)
            -- UPDATE Usuarios SET ip_dispositivo = p_ip WHERE id_usuarios = v_id_usuarios;
            SET pcodigo_s = 200;
            SET pmensaje = 'Operación realizada exitosamente.';
            SET pdata = JSON_OBJECT(
                'id_usuario', v_id_usuarios,
                'rol', v_rol,
                'email', v_email,
                'dpi', v_dpi,
                'nombres', v_nombres,
                'apellidos', v_apellidos,
                'pass', v_pass
            );
    END CASE;
END //


DROP PROCEDURE usuariosM;
CREATE DEFINER=`u878723730_famkon`@`%` PROCEDURE `usuariosM`(
    IN p_opcion VARCHAR(20),
    IN p_correo VARCHAR(120),
    IN p_contraseña VARCHAR(200),
    IN p_nombres VARCHAR(120),
    IN p_apellidos VARCHAR(120),
    IN p_dpi CHAR(13),
    IN p_rol INT,
    IN p_foto_perfil LONGTEXT,
    IN p_vehiculo VARCHAR(50),
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
    DECLARE v_datos_anteriores JSON DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error en usuariosM. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    CASE p_opcion

        -- ============================================================
        -- CREAR USUARIO
        -- ============================================================
        WHEN 'crear' THEN
            IF p_correo IS NULL OR p_contraseña IS NULL OR p_nombres IS NULL
               OR p_apellidos IS NULL OR p_dpi IS NULL OR p_rol IS NULL THEN
                SET pcodigo_s = 400;
                SET pmensaje = 'Faltan campos obligatorios: correo, contraseña, nombres, apellidos, dpi, rol';
                SET pdata = NULL;
            ELSE
                SELECT COUNT(*) INTO v_count
                FROM Usuarios
                WHERE email = p_correo OR DPI = p_dpi;

                IF v_count > 0 THEN
                    SET pcodigo_s = 409;
                    SET pmensaje = 'Ya existe un usuario con ese correo o DPI';
                    SET pdata = NULL;
                ELSE
                    INSERT INTO Usuarios (
                        id_rol, email, pass, nombres, apellidos, DPI, foto_perfil, activo, fecha_creacion
                    ) VALUES (
                        p_rol, p_correo, p_contraseña, p_nombres, p_apellidos, p_dpi,
                        IFNULL(p_foto_perfil, NULL), 1, NOW()
                    );

                    SET v_id_usuario = LAST_INSERT_ID();

                    -- Obtener id_proceso para 'creacion_usuario'
                    SELECT id_proceso INTO v_id_proceso FROM Procesos WHERE nom_proceso = 'creacion_usuario' LIMIT 1;

                    -- Registrar auditoría
                    INSERT INTO Usuarios_Detalle (
                        id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion
                    ) VALUES (
                        v_id_usuario, v_id_proceso, p_ip_dispositivo, NOW(),
                        JSON_OBJECT(
                            'accion', 'crear',
                            'email', p_correo,
                            'nombres', p_nombres,
                            'apellidos', p_apellidos,
                            'dpi', p_dpi,
                            'rol', p_rol
                        ),
                        CONCAT('Usuario creado: ', p_nombres, ' ', p_apellidos)
                    );

                    SET pcodigo_s = 201;
                    SET pmensaje = 'Usuario creado exitosamente';
                    SET pdata = JSON_OBJECT(
                        'id_usuario', v_id_usuario,
                        'email', p_correo,
                        'nombres', p_nombres,
                        'apellidos', p_apellidos,
                        'rol', p_rol
                    );
                END IF;
            END IF;

        -- ============================================================
        -- BUSCAR USUARIO
        -- ============================================================
        WHEN 'buscar' THEN
            IF p_id_usuario IS NOT NULL THEN
                SELECT JSON_OBJECT(
                    'id_usuario', u.id_usuarios,
                    'email', u.email,
                    'nombres', u.nombres,
                    'apellidos', u.apellidos,
                    'dpi', u.DPI,
                    'rol', r.nom_rol,
                    'id_rol', u.id_rol,
                    'activo', u.activo,
                    'foto_perfil', u.foto_perfil,
                    'fecha_creacion', u.fecha_creacion
                ) INTO pdata
                FROM Usuarios u
                JOIN Roles r ON r.id_rol = u.id_rol
                WHERE u.id_usuarios = p_id_usuario;

                IF pdata IS NULL THEN
                    SET pcodigo_s = 404;
                    SET pmensaje = 'Usuario no encontrado';
                    SET pdata = NULL;
                ELSE
                    SET pcodigo_s = 200;
                    SET pmensaje = 'Usuario encontrado';
                END IF;

            ELSEIF p_correo IS NOT NULL THEN
                SELECT JSON_OBJECT(
                    'id_usuario', u.id_usuarios,
                    'email', u.email,
                    'nombres', u.nombres,
                    'apellidos', u.apellidos,
                    'dpi', u.DPI,
                    'rol', r.nom_rol,
                    'id_rol', u.id_rol,
                    'activo', u.activo,
                    'foto_perfil', u.foto_perfil,
                    'fecha_creacion', u.fecha_creacion
                ) INTO pdata
                FROM Usuarios u
                JOIN Roles r ON r.id_rol = u.id_rol
                WHERE u.email = p_correo;

                IF pdata IS NULL THEN
                    SET pcodigo_s = 404;
                    SET pmensaje = 'Usuario no encontrado por correo';
                    SET pdata = NULL;
                ELSE
                    SET pcodigo_s = 200;
                    SET pmensaje = 'Usuario encontrado';
                END IF;

            ELSEIF p_dpi IS NOT NULL THEN
                SELECT JSON_OBJECT(
                    'id_usuario', u.id_usuarios,
                    'email', u.email,
                    'nombres', u.nombres,
                    'apellidos', u.apellidos,
                    'dpi', u.DPI,
                    'rol', r.nom_rol,
                    'id_rol', u.id_rol,
                    'activo', u.activo,
                    'foto_perfil', u.foto_perfil,
                    'fecha_creacion', u.fecha_creacion
                ) INTO pdata
                FROM Usuarios u
                JOIN Roles r ON r.id_rol = u.id_rol
                WHERE u.DPI = p_dpi;

                IF pdata IS NULL THEN
                    SET pcodigo_s = 404;
                    SET pmensaje = 'Usuario no encontrado por DPI';
                    SET pdata = NULL;
                ELSE
                    SET pcodigo_s = 200;
                    SET pmensaje = 'Usuario encontrado';
                END IF;

            ELSE
                SET pcodigo_s = 400;
                SET pmensaje = 'Debe proporcionar id_usuario, correo o dpi para buscar';
                SET pdata = NULL;
            END IF;

        -- ============================================================
        -- ACTUALIZAR USUARIO
        -- ============================================================
        WHEN 'actualizar' THEN
            IF p_id_usuario IS NULL THEN
                SET pcodigo_s = 400;
                SET pmensaje = 'Debe proporcionar el id_usuario para actualizar';
                SET pdata = NULL;
            ELSE
                SELECT COUNT(*) INTO v_count FROM Usuarios WHERE id_usuarios = p_id_usuario;

                IF v_count = 0 THEN
                    SET pcodigo_s = 404;
                    SET pmensaje = 'Usuario no encontrado';
                    SET pdata = NULL;
                ELSE
                    -- Obtener datos anteriores para auditoría
                    SELECT JSON_OBJECT(
                        'email', email,
                        'nombres', nombres,
                        'apellidos', apellidos,
                        'dpi', DPI,
                        'id_rol', id_rol,
                        'activo', activo
                    ) INTO v_datos_anteriores
                    FROM Usuarios
                    WHERE id_usuarios = p_id_usuario;

                    UPDATE Usuarios SET
                        email = IFNULL(p_correo, email),
                        pass = IFNULL(p_contraseña, pass),
                        nombres = IFNULL(p_nombres, nombres),
                        apellidos = IFNULL(p_apellidos, apellidos),
                        DPI = IFNULL(p_dpi, DPI),
                        id_rol = IFNULL(p_rol, id_rol),
                        foto_perfil = IFNULL(p_foto_perfil, foto_perfil)
                    WHERE id_usuarios = p_id_usuario;

                    -- Obtener id_proceso para 'actualizacion_usuario'
                    SELECT id_proceso INTO v_id_proceso FROM Procesos WHERE nom_proceso = 'actualizacion_usuario' LIMIT 1;

                    -- Registrar auditoría
                    INSERT INTO Usuarios_Detalle (
                        id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion
                    ) VALUES (
                        p_id_usuario, v_id_proceso, p_ip_dispositivo, NOW(),
                        JSON_OBJECT(
                            'accion', 'actualizar',
                            'datos_anteriores', v_datos_anteriores,
                            'nuevos_datos', JSON_OBJECT(
                                'email', IFNULL(p_correo, (SELECT email FROM Usuarios WHERE id_usuarios = p_id_usuario)),
                                'nombres', IFNULL(p_nombres, (SELECT nombres FROM Usuarios WHERE id_usuarios = p_id_usuario)),
                                'apellidos', IFNULL(p_apellidos, (SELECT apellidos FROM Usuarios WHERE id_usuarios = p_id_usuario))
                            )
                        ),
                        CONCAT('Usuario actualizado ID: ', p_id_usuario)
                    );

                    SET pcodigo_s = 200;
                    SET pmensaje = 'Usuario actualizado exitosamente';
                    SET pdata = JSON_OBJECT(
                        'id_usuario', p_id_usuario,
                        'email', IFNULL(p_correo, (SELECT email FROM Usuarios WHERE id_usuarios = p_id_usuario)),
                        'nombres', IFNULL(p_nombres, (SELECT nombres FROM Usuarios WHERE id_usuarios = p_id_usuario)),
                        'apellidos', IFNULL(p_apellidos, (SELECT apellidos FROM Usuarios WHERE id_usuarios = p_id_usuario))
                    );
                END IF;
            END IF;

        -- ============================================================
        -- DESACTIVAR USUARIO
        -- ============================================================
        WHEN 'desactivar' THEN
            IF p_id_usuario IS NULL THEN
                SET pcodigo_s = 400;
                SET pmensaje = 'Debe proporcionar el id_usuario para desactivar';
                SET pdata = NULL;
            ELSE
                SELECT COUNT(*) INTO v_count FROM Usuarios WHERE id_usuarios = p_id_usuario;

                IF v_count = 0 THEN
                    SET pcodigo_s = 404;
                    SET pmensaje = 'Usuario no encontrado';
                    SET pdata = NULL;
                ELSE
                    -- Obtener datos anteriores para auditoría
                    SELECT JSON_OBJECT(
                        'email', email,
                        'nombres', nombres,
                        'apellidos', apellidos,
                        'activo', activo
                    ) INTO v_datos_anteriores
                    FROM Usuarios
                    WHERE id_usuarios = p_id_usuario;

                    UPDATE Usuarios SET activo = 0 WHERE id_usuarios = p_id_usuario;

                    -- Obtener id_proceso para 'eliminacion_usuario'
                    SELECT id_proceso INTO v_id_proceso FROM Procesos WHERE nom_proceso = 'eliminacion_usuario' LIMIT 1;

                    -- Registrar auditoría
                    INSERT INTO Usuarios_Detalle (
                        id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion
                    ) VALUES (
                        p_id_usuario, v_id_proceso, p_ip_dispositivo, NOW(),
                        JSON_OBJECT(
                            'accion', 'desactivar',
                            'datos_anteriores', v_datos_anteriores
                        ),
                        CONCAT('Usuario desactivado ID: ', p_id_usuario)
                    );

                    SET pcodigo_s = 200;
                    SET pmensaje = 'Usuario desactivado exitosamente';
                    SET pdata = JSON_OBJECT(
                        'id_usuario', p_id_usuario,
                        'activo', 0
                    );
                END IF;
            END IF;

        -- ============================================================
        -- ACTIVAR USUARIO
        -- ============================================================
        WHEN 'activar' THEN
            IF p_id_usuario IS NULL THEN
                SET pcodigo_s = 400;
                SET pmensaje = 'Debe proporcionar el id_usuario para activar';
                SET pdata = NULL;
            ELSE
                SELECT COUNT(*) INTO v_count FROM Usuarios WHERE id_usuarios = p_id_usuario;

                IF v_count = 0 THEN
                    SET pcodigo_s = 404;
                    SET pmensaje = 'Usuario no encontrado';
                    SET pdata = NULL;
                ELSE
                    UPDATE Usuarios SET activo = 1 WHERE id_usuarios = p_id_usuario;

                    SET pcodigo_s = 200;
                    SET pmensaje = 'Usuario activado exitosamente';
                    SET pdata = JSON_OBJECT(
                        'id_usuario', p_id_usuario,
                        'activo', 1
                    );
                END IF;
            END IF;

        -- ============================================================
        -- LISTAR TODOS LOS USUARIOS
        -- ============================================================
        WHEN 'listar' THEN
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id_usuario', u.id_usuarios,
                    'email', u.email,
                    'nombres', u.nombres,
                    'apellidos', u.apellidos,
                    'dpi', u.DPI,
                    'rol', r.nom_rol,
                    'activo', u.activo,
                    'fecha_creacion', u.fecha_creacion
                )
            ) INTO pdata
            FROM Usuarios u
            JOIN Roles r ON r.id_rol = u.id_rol
            WHERE u.activo = 1;

            SET pcodigo_s = 200;
            SET pmensaje = 'Usuarios listados exitosamente';

        -- ============================================================
        -- OPCIÓN NO VÁLIDA
        -- ============================================================
        ELSE
            SET pcodigo_s = 400;
            SET pmensaje = CONCAT('Opción no válida: ', IFNULL(p_opcion, 'NULL'), '. Use: crear, buscar, actualizar, desactivar, activar, listar');
            SET pdata = NULL;

    END CASE;
END //



DELIMITER ;