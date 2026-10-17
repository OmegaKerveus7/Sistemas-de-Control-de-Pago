-- Agrega el campo `telefono` al procedimiento almacenado `usuariosM`.
--
-- Contexto: la tabla `Usuarios` ya cuenta con la columna `telefono VARCHAR(15) NULL`
-- (ver `BD_final.sql`), pero el SP `usuariosM` (opciones crear / actualizar / buscar /
-- listar) no recibía ni persistía ese valor, por lo que las llamadas al procedimiento
-- lo descartaban. Esta migración recrea el SP aceptando `p_telefono` y lo refleja en
-- INSERT, UPDATE y SELECT, además de devolverlo en los JSON de salida.

DELIMITER //

DROP PROCEDURE IF EXISTS `usuariosM` //
CREATE PROCEDURE `usuariosM`(
    IN p_opcion VARCHAR(20),
    IN p_correo VARCHAR(120),
    IN p_contraseña VARCHAR(200),
    IN p_nombres VARCHAR(120),
    IN p_apellidos VARCHAR(120),
    IN p_dpi CHAR(13),
    IN p_telefono VARCHAR(15),
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
                    INSERT INTO Usuarios (id_rol, email, pass, nombres, apellidos, DPI, telefono, activo)
                    VALUES (p_rol, p_correo, p_contraseña, p_nombres, p_apellidos, p_dpi, p_telefono, 1);

                    SET v_id_usuario = LAST_INSERT_ID();
                    SELECT id_proceso INTO v_id_proceso FROM Procesos WHERE nom_proceso = 'creacion_usuario' LIMIT 1;

                    INSERT INTO Usuarios_Detalle (id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion)
                    VALUES (v_id_usuario, v_id_proceso, p_ip_dispositivo, NOW(),
                            JSON_OBJECT('accion', 'crear', 'email', p_correo, 'telefono', p_telefono),
                            CONCAT('Usuario creado: ', p_nombres));

                    SET pcodigo_s = 201;
                    SET pmensaje = 'Usuario creado exitosamente';
                    SET pdata = JSON_OBJECT('id_usuario', v_id_usuario, 'email', p_correo, 'telefono', p_telefono);
                END IF;
            END IF;

        WHEN 'buscar' THEN
            IF p_id_usuario IS NOT NULL THEN
                SELECT JSON_OBJECT(
                    'id_usuario', u.id_usuario, 'email', u.email, 'nombres', u.nombres,
                    'apellidos', u.apellidos, 'dpi', u.DPI, 'telefono', u.telefono,
                    'rol', r.nom_rol, 'activo', u.activo
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
                    telefono = IFNULL(p_telefono, telefono),
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
                    'apellidos', u.apellidos, 'dpi', u.DPI, 'telefono', u.telefono,
                    'rol', r.nom_rol, 'activo', u.activo
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
