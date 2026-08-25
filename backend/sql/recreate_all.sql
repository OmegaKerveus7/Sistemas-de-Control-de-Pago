-- ============================================================
-- SCRIPT COMPLETO: Eliminar y recrear toda la base de datos
-- Base de datos: u878723730_parqueo
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Eliminar todos los procedimientos almacenados
DROP PROCEDURE IF EXISTS `loginN`;
DROP PROCEDURE IF EXISTS `usuariosM`;
DROP PROCEDURE IF EXISTS `registrarEntrada`;
DROP PROCEDURE IF EXISTS `registrarSalida`;
DROP PROCEDURE IF EXISTS `consultarHistorial`;

-- Eliminar todas las tablas
DROP TABLE IF EXISTS `auditoria`;
DROP TABLE IF EXISTS `pagos`;
DROP TABLE IF EXISTS `parqueo_historial`;
DROP TABLE IF EXISTS `parqueo`;
DROP TABLE IF EXISTS `vehiculos`;
DROP TABLE IF EXISTS `tarifas`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- TABLA: roles
-- ============================================================
CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `rol` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uq_roles_rol` (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id_rol`, `rol`) VALUES
  (1, 'ADMIN'),
  (2, 'Administracion'),
  (3, 'Guardia'),
  (4, 'cliente'),
  (5, 'gerente');

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `rol` int(11) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `contraseña` varchar(200) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `dpi` char(13) NOT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `vehiculo` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `dispositivo` varchar(45) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  UNIQUE KEY `uq_usuarios_dpi` (`dpi`),
  KEY `idx_usuarios_rol` (`rol`),
  KEY `idx_usuarios_activo` (`activo`),
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: vehiculos
-- ============================================================
CREATE TABLE `vehiculos` (
  `id_vehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `modelo_vehiculo` varchar(100) NOT NULL,
  `foto_vehiculo` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: tarifas
-- ============================================================
CREATE TABLE `tarifas` (
  `id_tarifa` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_vehiculo` enum('automovil','motocicleta','camioneta','otro') NOT NULL,
  `costo_por_hora` decimal(10,2) NOT NULL,
  `costo_maximo_diario` decimal(10,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tarifa`),
  KEY `idx_tarifas_tipo` (`tipo_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: parqueo
-- ============================================================
CREATE TABLE `parqueo` (
  `id_parqueo` bigint(20) NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) NOT NULL,
  `num_parqueo` varchar(10) NOT NULL,
  `hora_entrada` datetime NOT NULL,
  `hora_salida` datetime DEFAULT NULL,
  `costo` decimal(10,2) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `ticket` varchar(50) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_parqueo`),
  KEY `idx_parqueo_placa` (`placa`),
  KEY `idx_parqueo_estado` (`estado`),
  KEY `idx_parqueo_num` (`num_parqueo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: parqueo_historial
-- ============================================================
CREATE TABLE `parqueo_historial` (
  `id_historial` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_parqueo` bigint(20) NOT NULL,
  `placa` varchar(20) NOT NULL,
  `num_parqueo` varchar(10) NOT NULL,
  `fecha` date NOT NULL,
  `hora_entrada` datetime NOT NULL,
  `hora_salida` datetime DEFAULT NULL,
  `costo` decimal(10,2) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `ticket` varchar(50) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `idx_historial_parqueo` (`id_parqueo`),
  KEY `idx_historial_placa` (`placa`),
  KEY `idx_historial_fecha` (`fecha`),
  CONSTRAINT `fk_historial_parqueo` FOREIGN KEY (`id_parqueo`)
    REFERENCES `parqueo` (`id_parqueo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: pagos
-- ============================================================
CREATE TABLE `pagos` (
  `id_pago` bigint(20) NOT NULL AUTO_INCREMENT,
  `parqueo_id` bigint(20) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo` varchar(20) NOT NULL DEFAULT 'tarjeta',
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `referencia` varchar(100) DEFAULT NULL,
  `ip_inicio` varchar(45) DEFAULT NULL,
  `ip_pago` varchar(45) DEFAULT NULL,
  `procesado_por` int(11) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago`),
  UNIQUE KEY `uq_pagos_referencia` (`referencia`),
  KEY `idx_pagos_estado` (`estado`),
  KEY `idx_pagos_creado` (`creado_en`),
  KEY `idx_pagos_parqueo` (`parqueo_id`),
  CONSTRAINT `fk_pagos_parqueo` FOREIGN KEY (`parqueo_id`)
    REFERENCES `parqueo` (`id_parqueo`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: auditoria
-- ============================================================
CREATE TABLE `auditoria` (
  `id_auditoria` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(150) NOT NULL,
  `entidad` varchar(100) DEFAULT NULL,
  `detalle` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  KEY `idx_auditoria_usuario` (`id_usuario`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PROCEDIMIENTO: loginN
-- ============================================================
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
  DECLARE v_contraseña VARCHAR(200) DEFAULT NULL;
  DECLARE v_rol VARCHAR(100) DEFAULT NULL;
  DECLARE v_correo VARCHAR(100) DEFAULT NULL;
  DECLARE v_dpi CHAR(13) DEFAULT NULL;
  DECLARE v_nombres VARCHAR(100) DEFAULT NULL;
  DECLARE v_apellidos VARCHAR(100) DEFAULT NULL;
  DECLARE v_activo TINYINT DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
    SET pcodigo_s = 400;
    SET pmensaje = CONCAT('Error en loginN. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
    SET pdata = NULL;
  END;

  SELECT u.id_usuario, u.contraseña, r.rol, u.correo, u.dpi, u.nombres, u.apellidos, CAST(u.activo AS UNSIGNED)
    INTO v_id_usuario, v_contraseña, v_rol, v_correo, v_dpi, v_nombres, v_apellidos, v_activo
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.rol
    WHERE u.correo = p_identificador OR u.dpi = p_identificador
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
      UPDATE usuarios SET dispositivo = p_ip WHERE id_usuario = v_id_usuario;
      SET pcodigo_s = 200;
      SET pmensaje = 'Operación realizada exitosamente.';
      SET pdata = JSON_OBJECT(
        'id_usuario', v_id_usuario,
        'rol', v_rol,
        'correo', v_correo,
        'dpi', v_dpi,
        'nombres', v_nombres,
        'apellidos', v_apellidos,
        'contraseña', v_contraseña
      );
  END CASE;
END;

-- ============================================================
-- PROCEDIMIENTO: usuariosM
-- ============================================================
CREATE PROCEDURE `usuariosM`(
  IN p_opcion VARCHAR(20),
  IN p_correo VARCHAR(100),
  IN p_contraseña VARCHAR(200),
  IN p_nombres VARCHAR(100),
  IN p_apellidos VARCHAR(100),
  IN p_dpi CHAR(13),
  IN p_rol INT,
  IN p_foto_perfil VARCHAR(255),
  IN p_vehiculo VARCHAR(50),
  IN p_id_usuario INT,
  OUT pcodigo_s INT,
  OUT pmensaje VARCHAR(500),
  OUT pdata TEXT
)
BEGIN
  DECLARE v_count INT DEFAULT 0;

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
        SET pmensaje = 'Faltan campos obligatorios: correo, contraseña, nombres, apellidos, dpi, rol';
        SET pdata = NULL;
      ELSE
        SELECT COUNT(*) INTO v_count
          FROM usuarios
         WHERE correo = p_correo OR dpi = p_dpi;

        IF v_count > 0 THEN
          SET pcodigo_s = 409;
          SET pmensaje = 'Ya existe un usuario con ese correo o DPI';
          SET pdata = NULL;
        ELSE
          INSERT INTO usuarios (rol, correo, contraseña, nombres, apellidos, dpi, foto_perfil, vehiculo, activo)
          VALUES (p_rol, p_correo, p_contraseña, p_nombres, p_apellidos, p_dpi,
                  IFNULL(p_foto_perfil, NULL), IFNULL(p_vehiculo, NULL), 1);

          SET pcodigo_s = 201;
          SET pmensaje = 'Usuario creado exitosamente';
          SET pdata = JSON_OBJECT(
            'id_usuario', LAST_INSERT_ID(),
            'correo', p_correo,
            'nombres', p_nombres,
            'apellidos', p_apellidos,
            'rol', p_rol
          );
        END IF;
      END IF;

    WHEN 'buscar' THEN
      IF p_id_usuario IS NOT NULL THEN
        SELECT JSON_OBJECT(
          'id_usuario', u.id_usuario,
          'correo', u.correo,
          'nombres', u.nombres,
          'apellidos', u.apellidos,
          'dpi', u.dpi,
          'rol', r.rol,
          'activo', u.activo,
          'foto_perfil', u.foto_perfil,
          'vehiculo', u.vehiculo,
          'dispositivo', u.dispositivo,
          'creado_en', u.creado_en
        ) INTO pdata
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.rol
        WHERE u.id_usuario = p_id_usuario;

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
          'id_usuario', u.id_usuario,
          'correo', u.correo,
          'nombres', u.nombres,
          'apellidos', u.apellidos,
          'dpi', u.dpi,
          'rol', r.rol,
          'activo', u.activo,
          'foto_perfil', u.foto_perfil,
          'vehiculo', u.vehiculo,
          'dispositivo', u.dispositivo,
          'creado_en', u.creado_en
        ) INTO pdata
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.rol
        WHERE u.correo = p_correo;

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
          'id_usuario', u.id_usuario,
          'correo', u.correo,
          'nombres', u.nombres,
          'apellidos', u.apellidos,
          'dpi', u.dpi,
          'rol', r.rol,
          'activo', u.activo,
          'foto_perfil', u.foto_perfil,
          'vehiculo', u.vehiculo,
          'dispositivo', u.dispositivo,
          'creado_en', u.creado_en
        ) INTO pdata
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.rol
        WHERE u.dpi = p_dpi;

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

    WHEN 'desactivar' THEN
      IF p_id_usuario IS NULL THEN
        SET pcodigo_s = 400;
        SET pmensaje = 'Debe proporcionar el id_usuario para desactivar';
        SET pdata = NULL;
      ELSE
        SELECT COUNT(*) INTO v_count FROM usuarios WHERE id_usuario = p_id_usuario;

        IF v_count = 0 THEN
          SET pcodigo_s = 404;
          SET pmensaje = 'Usuario no encontrado';
          SET pdata = NULL;
        ELSE
          UPDATE usuarios SET activo = 0 WHERE id_usuario = p_id_usuario;

          SET pcodigo_s = 200;
          SET pmensaje = 'Usuario desactivado exitosamente';
          SET pdata = JSON_OBJECT(
            'id_usuario', p_id_usuario,
            'activo', 0
          );
        END IF;
      END IF;

    ELSE
      SET pcodigo_s = 400;
      SET pmensaje = CONCAT('Opción no válida: ', IFNULL(p_opcion, 'NULL'), '. Use: crear, buscar, desactivar');
      SET pdata = NULL;

  END CASE;
END;

-- ============================================================
-- PROCEDIMIENTO: registrarEntrada
-- ============================================================
CREATE PROCEDURE `registrarEntrada`(
  IN p_placa VARCHAR(20),
  IN p_num_parqueo VARCHAR(10),
  OUT pcodigo_s INT,
  OUT pmensaje VARCHAR(500),
  OUT pdata TEXT
)
BEGIN
  DECLARE v_id_parqueo BIGINT;
  DECLARE v_count INT DEFAULT 0;
  DECLARE v_ticket VARCHAR(50);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
    SET pcodigo_s = 400;
    SET pmensaje = CONCAT('Error al registrar entrada. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
    SET pdata = NULL;
  END;

  SELECT COUNT(*) INTO v_count
    FROM parqueo
   WHERE placa = p_placa AND estado = 'activo';

  IF v_count > 0 THEN
    SET pcodigo_s = 400;
    SET pmensaje = 'Ya hay un parqueo activo para esta placa';
    SET pdata = NULL;
  ELSE
    SELECT COUNT(*) INTO v_count
      FROM parqueo
     WHERE num_parqueo = p_num_parqueo AND estado = 'activo';

    IF v_count > 0 THEN
      SET pcodigo_s = 400;
      SET pmensaje = 'El número de parqueo ya está ocupado';
      SET pdata = NULL;
    ELSE
      SET v_ticket = CONCAT('TKT-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-',
                            LPAD(FLOOR(RAND() * 10000), 4, '0'));

      INSERT INTO parqueo (placa, num_parqueo, hora_entrada, estado, ticket)
      VALUES (UPPER(p_placa), p_num_parqueo, NOW(), 'activo', v_ticket);

      SET v_id_parqueo = LAST_INSERT_ID();

      INSERT INTO parqueo_historial (id_parqueo, placa, num_parqueo, fecha, hora_entrada, estado, ticket)
      VALUES (v_id_parqueo, UPPER(p_placa), p_num_parqueo, CURDATE(), NOW(), 'activo', v_ticket);

      SET pcodigo_s = 201;
      SET pmensaje = 'Entrada registrada exitosamente';
      SET pdata = JSON_OBJECT(
        'id_parqueo', v_id_parqueo,
        'placa', UPPER(p_placa),
        'num_parqueo', p_num_parqueo,
        'ticket', v_ticket,
        'hora_entrada', NOW()
      );
    END IF;
  END IF;
END;

-- ============================================================
-- PROCEDIMIENTO: registrarSalida
-- ============================================================
CREATE PROCEDURE `registrarSalida`(
  IN p_id_parqueo BIGINT,
  IN p_costo DECIMAL(10,2),
  OUT pcodigo_s INT,
  OUT pmensaje VARCHAR(500),
  OUT pdata TEXT
)
BEGIN
  DECLARE v_count INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
    SET pcodigo_s = 400;
    SET pmensaje = CONCAT('Error al registrar salida. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
    SET pdata = NULL;
  END;

  SELECT COUNT(*) INTO v_count
    FROM parqueo
   WHERE id_parqueo = p_id_parqueo AND estado = 'activo';

  IF v_count = 0 THEN
    SET pcodigo_s = 404;
    SET pmensaje = 'Parqueo no encontrado o ya completado';
    SET pdata = NULL;
  ELSE
    UPDATE parqueo
       SET hora_salida = NOW(),
           costo = p_costo,
           estado = 'completado'
     WHERE id_parqueo = p_id_parqueo AND estado = 'activo';

    UPDATE parqueo_historial
       SET hora_salida = NOW(),
           costo = p_costo,
           estado = 'completado'
     WHERE id_parqueo = p_id_parqueo
       AND fecha = CURDATE();

    SET pcodigo_s = 200;
    SET pmensaje = 'Salida registrada exitosamente';
    SET pdata = JSON_OBJECT(
      'id_parqueo', p_id_parqueo,
      'costo', p_costo,
      'hora_salida', NOW()
    );
  END IF;
END;

-- ============================================================
-- PROCEDIMIENTO: consultarHistorial
-- ============================================================
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
      'id_historial', h.id_historial,
      'id_parqueo', h.id_parqueo,
      'placa', h.placa,
      'num_parqueo', h.num_parqueo,
      'fecha', h.fecha,
      'hora_entrada', h.hora_entrada,
      'hora_salida', h.hora_salida,
      'costo', h.costo,
      'estado', h.estado,
      'ticket', h.ticket
    )
  ) INTO pdata
  FROM parqueo_historial h
  WHERE h.placa = UPPER(p_placa)
    AND h.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
  ORDER BY h.fecha DESC, h.hora_entrada DESC;

  IF pdata IS NULL OR pdata = 'null' THEN
    SET pcodigo_s = 404;
    SET pmensaje = 'No se encontraron registros para esta placa en el rango de fechas';
    SET pdata = '[]';
  ELSE
    SET pcodigo_s = 200;
    SET pmensaje = 'Historial consultado exitosamente';
  END IF;
END;
