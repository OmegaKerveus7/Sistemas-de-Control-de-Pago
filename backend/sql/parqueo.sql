-- Parqueo: registros de entrada y salida de vehículos.
-- Un pago queda asociado a un parqueo mediante parqueo_id (ver pagos.sql).
CREATE TABLE IF NOT EXISTS `parqueo` (
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

-- Historial de parqueos: guarda un registro por cada día que un vehículo estuvo en el parqueo.
-- Útil para reportes y consulta del historial completo.
CREATE TABLE IF NOT EXISTS `parqueo_historial` (
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

-- =====================================================
-- SP para registrar entrada con num_parqueo y crear
-- automáticamente el registro en historial
-- =====================================================
DROP PROCEDURE IF EXISTS `registrarEntrada`;

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

  -- Validar que la placa no tenga un parqueo activo
  SELECT COUNT(*) INTO v_count
    FROM parqueo
   WHERE placa = p_placa AND estado = 'activo';

  IF v_count > 0 THEN
    SET pcodigo_s = 400;
    SET pmensaje = 'Ya hay un parqueo activo para esta placa';
    SET pdata = NULL;
  ELSE
    -- Validar que el número de parqueo no esté ocupado
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

      -- Insertar en tabla parqueo
      INSERT INTO parqueo (placa, num_parqueo, hora_entrada, estado, ticket)
      VALUES (UPPER(p_placa), p_num_parqueo, NOW(), 'activo', v_ticket);

      SET v_id_parqueo = LAST_INSERT_ID();

      -- Insertar en historial del día actual
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

-- =====================================================
-- SP para registrar salida y actualizar historial
-- =====================================================
DROP PROCEDURE IF EXISTS `registrarSalida`;

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
    -- Actualizar tabla parqueo
    UPDATE parqueo
       SET hora_salida = NOW(),
           costo = p_costo,
           estado = 'completado'
     WHERE id_parqueo = p_id_parqueo AND estado = 'activo';

    -- Actualizar historial del mismo día
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

-- =====================================================
-- SP para consultar historial de parqueo por placa
-- =====================================================
DROP PROCEDURE IF EXISTS `consultarHistorial`;

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
