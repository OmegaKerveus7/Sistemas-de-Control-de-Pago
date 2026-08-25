-- SP usuariosM: gestión de usuarios con opciones múltiples
-- Opciones: 'crear', 'buscar', 'desactivar'
DROP PROCEDURE IF EXISTS `usuariosM`;

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
  DECLARE v_hash VARCHAR(200);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO, @msg = MESSAGE_TEXT;
    SET pcodigo_s = 400;
    SET pmensaje = CONCAT('Error en usuariosM. SQLERRNO: ', @errno, ' / Mensaje: ', @msg);
    SET pdata = NULL;
  END;

  CASE p_opcion

    -- ===================== CREAR USUARIO =====================
    WHEN 'crear' THEN
      -- Validar campos obligatorios
      IF p_correo IS NULL OR p_contraseña IS NULL OR p_nombres IS NULL
         OR p_apellidos IS NULL OR p_dpi IS NULL OR p_rol IS NULL THEN
        SET pcodigo_s = 400;
        SET pmensaje = 'Faltan campos obligatorios: correo, contraseña, nombres, apellidos, dpi, rol';
        SET pdata = NULL;
      ELSE
        -- Verificar que no exista correo o DPI duplicado
        SELECT COUNT(*) INTO v_count
          FROM usuarios
         WHERE correo = p_correo OR dpi = p_dpi;

        IF v_count > 0 THEN
          SET pcodigo_s = 409;
          SET pmensaje = 'Ya existe un usuario con ese correo o DPI';
          SET pdata = NULL;
        ELSE
          -- El hash se genera en el backend, aquí se recibe directo
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

    -- ===================== BUSCAR USUARIO =====================
    WHEN 'buscar' THEN
      IF p_id_usuario IS NOT NULL THEN
        -- Buscar por ID
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
        -- Buscar por correo
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
        -- Buscar por DPI
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

    -- ===================== DESACTIVAR USUARIO =====================
    WHEN 'desactivar' THEN
      IF p_id_usuario IS NULL THEN
        SET pcodigo_s = 400;
        SET pmensaje = 'Debe proporcionar el id_usuario para desactivar';
        SET pdata = NULL;
      ELSE
        -- Verificar que el usuario exista
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

    -- ===================== OPCIÓN INVÁLIDA =====================
    ELSE
      SET pcodigo_s = 400;
      SET pmensaje = CONCAT('Opción no válida: ', IFNULL(p_opcion, 'NULL'), '. Use: crear, buscar, desactivar');
      SET pdata = NULL;

  END CASE;
END
