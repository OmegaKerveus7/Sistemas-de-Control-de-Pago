-- Agrega el campo "modelo" a Vehiculos y actualiza sp_vehiculos_crear /
-- sp_vehiculos_actualizar para persistirlo. La columna se agrega solo si no
-- existe; los procedimientos siempre se recrean con la nueva firma.

SET @col_existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Vehiculos' AND COLUMN_NAME = 'modelo'
);
SET @ddl := IF(@col_existe = 0, 'ALTER TABLE Vehiculos ADD COLUMN modelo VARCHAR(60) NULL AFTER color', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP PROCEDURE IF EXISTS sp_vehiculos_crear;

CREATE PROCEDURE sp_vehiculos_crear(
    IN p_placa CHAR(7),
    IN p_id_usuario INT,
    IN p_id_tipo INT,
    IN p_id_marca INT,
    IN p_color VARCHAR(30),
    IN p_modelo VARCHAR(60),
    IN p_id_usuario_accion INT,
    IN p_ip VARCHAR(45),
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error en sp_vehiculos_crear. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    IF p_placa IS NULL OR p_id_usuario IS NULL OR p_id_tipo IS NULL THEN
        SET pcodigo_s = 400;
        SET pmensaje = 'Faltan campos obligatorios: placa, id_usuario, id_tipo';
        SET pdata = NULL;
    ELSE
        SELECT COUNT(*) INTO v_existe FROM Vehiculos WHERE placa = UPPER(p_placa);

        IF v_existe > 0 THEN
            SET pcodigo_s = 409;
            SET pmensaje = 'Ya existe un vehículo con esa placa';
            SET pdata = NULL;
        ELSE
            INSERT INTO Vehiculos (placa, id_usuario, id_tipo, id_marca, color, modelo, activo)
            VALUES (UPPER(p_placa), p_id_usuario, p_id_tipo, p_id_marca, p_color, p_modelo, 1);

            INSERT INTO Usuarios_Detalle (
                id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion
            ) VALUES (
                p_id_usuario_accion,
                (SELECT id_proceso FROM Procesos WHERE nom_proceso = 'registro_vehiculo' LIMIT 1),
                p_ip, NOW(),
                JSON_OBJECT(
                    'accion', 'crear_vehiculo',
                    'placa', UPPER(p_placa),
                    'id_usuario', p_id_usuario,
                    'id_tipo', p_id_tipo,
                    'id_marca', p_id_marca,
                    'color', p_color,
                    'modelo', p_modelo
                ),
                CONCAT('Vehículo creado: ', UPPER(p_placa))
            );

            SET pcodigo_s = 201;
            SET pmensaje = 'Vehículo creado exitosamente';
            SET pdata = JSON_OBJECT(
                'placa', UPPER(p_placa),
                'id_usuario', p_id_usuario,
                'id_tipo', p_id_tipo,
                'id_marca', p_id_marca,
                'color', p_color,
                'modelo', p_modelo
            );
        END IF;
    END IF;
END;

DROP PROCEDURE IF EXISTS sp_vehiculos_actualizar;

CREATE PROCEDURE sp_vehiculos_actualizar(
    IN p_placa CHAR(7),
    IN p_id_usuario INT,
    IN p_id_tipo INT,
    IN p_id_marca INT,
    IN p_color VARCHAR(30),
    IN p_modelo VARCHAR(60),
    IN p_activo TINYINT,
    IN p_id_usuario_accion INT,
    IN p_ip VARCHAR(45),
    OUT pcodigo_s INT,
    OUT pmensaje VARCHAR(500),
    OUT pdata TEXT
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_datos_anteriores JSON;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
        SET pcodigo_s = 400;
        SET pmensaje = CONCAT('Error en sp_vehiculos_actualizar. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
        SET pdata = NULL;
    END;

    IF p_placa IS NULL THEN
        SET pcodigo_s = 400;
        SET pmensaje = 'Debe proporcionar la placa del vehículo';
        SET pdata = NULL;
    ELSE
        SELECT COUNT(*) INTO v_existe FROM Vehiculos WHERE placa = UPPER(p_placa);

        IF v_existe = 0 THEN
            SET pcodigo_s = 404;
            SET pmensaje = 'Vehículo no encontrado';
            SET pdata = NULL;
        ELSE
            SELECT JSON_OBJECT(
                'id_usuario', id_usuario,
                'id_tipo', id_tipo,
                'id_marca', id_marca,
                'color', color,
                'modelo', modelo,
                'activo', activo
            ) INTO v_datos_anteriores
            FROM Vehiculos WHERE placa = UPPER(p_placa);

            UPDATE Vehiculos SET
                id_usuario = IFNULL(p_id_usuario, id_usuario),
                id_tipo = IFNULL(p_id_tipo, id_tipo),
                id_marca = IFNULL(p_id_marca, id_marca),
                color = IFNULL(p_color, color),
                modelo = IFNULL(p_modelo, modelo),
                activo = IFNULL(p_activo, activo)
            WHERE placa = UPPER(p_placa);

            INSERT INTO Usuarios_Detalle (
                id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion
            ) VALUES (
                p_id_usuario_accion,
                (SELECT id_proceso FROM Procesos WHERE nom_proceso = 'actualizacion_vehiculo' LIMIT 1),
                p_ip, NOW(),
                JSON_OBJECT(
                    'accion', 'actualizar_vehiculo',
                    'placa', UPPER(p_placa),
                    'datos_anteriores', v_datos_anteriores,
                    'nuevos_datos', JSON_OBJECT(
                        'id_usuario', p_id_usuario,
                        'id_tipo', p_id_tipo,
                        'id_marca', p_id_marca,
                        'color', p_color,
                        'modelo', p_modelo,
                        'activo', p_activo
                    )
                ),
                CONCAT('Vehículo actualizado: ', UPPER(p_placa))
            );

            SET pcodigo_s = 200;
            SET pmensaje = 'Vehículo actualizado exitosamente';
            SET pdata = JSON_OBJECT(
                'placa', UPPER(p_placa),
                'id_usuario', IFNULL(p_id_usuario, (SELECT id_usuario FROM Vehiculos WHERE placa = UPPER(p_placa))),
                'id_tipo', IFNULL(p_id_tipo, (SELECT id_tipo FROM Vehiculos WHERE placa = UPPER(p_placa))),
                'id_marca', IFNULL(p_id_marca, (SELECT id_marca FROM Vehiculos WHERE placa = UPPER(p_placa))),
                'color', IFNULL(p_color, (SELECT color FROM Vehiculos WHERE placa = UPPER(p_placa))),
                'modelo', IFNULL(p_modelo, (SELECT modelo FROM Vehiculos WHERE placa = UPPER(p_placa)))
            );
        END IF;
    END IF;
END;
