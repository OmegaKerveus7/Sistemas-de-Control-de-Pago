-- Login en estilo CRUD: recibe identificador (correo o DPI), contraseña y la IP del dispositivo,
-- y devuelve por parámetros OUT:
--   pcodigo_s: 200 = ok, 400 = credenciales inválidas, 401 = usuario desactivado
--   pmensaje : mensaje de resultado o del error más simple
--   pdata    : JSON con los datos del usuario cuando pcodigo_s = 200
-- Nota: la contraseña se guarda con bcrypt; el backend verifica el hash.
-- El SP valida identidad (correo/DPI), estado (activo) y registra la IP en usuarios.dispositivo.
DROP PROCEDURE IF EXISTS `loginN`;

CREATE PROCEDURE `loginN` (
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
END