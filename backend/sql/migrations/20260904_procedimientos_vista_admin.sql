-- Mueve a procedimientos almacenados las consultas que se agregaron en
-- "implementado vista administrador para gestion global de sistema" (Rama/Esteban),
-- que hasta ahora vivían como SQL crudo dentro de los repositorios de backend/src.
--
-- Alcance: SOLO las funciones de auditoria, pagos, parqueo, tarifas y vehiculos que
-- esa vista de administrador introdujo o modificó. No toca los flujos legacy marcados
-- con TODO en pagos.repository.ts / parqueo.repository.ts, ni las funciones antiguas de
-- vehiculos.repository.ts (tabla `vehiculos` en minúscula) que pertenecen a otras ramas.
--
-- NO ejecutar en la BD centralizada sin aprobación explícita.

DELIMITER //

-- ==================== AUDITORIA ====================

DROP PROCEDURE IF EXISTS sp_auditoria_registrar //
CREATE PROCEDURE sp_auditoria_registrar(
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

DROP PROCEDURE IF EXISTS sp_auditoria_listar //
CREATE PROCEDURE sp_auditoria_listar(
    IN p_limite INT
)
BEGIN
    SELECT * FROM (
        SELECT ud.procedimiento AS fecha, 'usuario' AS entidad, ud.id_historial_usuario AS entidad_id,
               COALESCE(p.nom_proceso, 'desconocido') AS accion,
               ud.id_usuario AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
               ud.descripcion AS descripcion, ud.ip_dispositivo AS ip
        FROM Usuarios_Detalle ud
        LEFT JOIN Procesos p ON p.id_proceso = ud.id_proceso
        LEFT JOIN Usuarios u ON u.id_usuarios = ud.id_usuario

        UNION ALL

        SELECT vd.fecha_hora AS fecha, 'vehiculo' AS entidad, vd.id_vehiculo_detalle AS entidad_id,
               COALESCE(p.nom_proceso, 'desconocido') AS accion,
               vd.id_usuario AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
               NULL AS descripcion, NULL AS ip
        FROM Vehiculos_Detalle vd
        LEFT JOIN Procesos p ON p.id_proceso = vd.id_proceso
        LEFT JOIN Usuarios u ON u.id_usuarios = vd.id_usuario

        UNION ALL

        SELECT td.fecha_hora AS fecha, 'ticket' AS entidad, td.id_ticket AS entidad_id,
               COALESCE(m.tipo_movimiento, 'desconocido') AS accion,
               td.id_usuario AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
               NULL AS descripcion, td.ip_dispositivo AS ip
        FROM Tickets_Detalle td
        LEFT JOIN Movimientos m ON m.id_movimiento = td.id_movimiento
        LEFT JOIN Usuarios u ON u.id_usuarios = td.id_usuario

        UNION ALL

        SELECT pd.fecha_cambio AS fecha, 'parqueo' AS entidad, pd.id_lugar AS entidad_id,
               CONCAT(pd.estado_anterior, ' -> ', pd.estado_nuevo) AS accion,
               pd.id_usuario_accion AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
               pd.motivo AS descripcion, pd.ip_dispositivo AS ip
        FROM Parqueos_Detalle pd
        LEFT JOIN Usuarios u ON u.id_usuarios = pd.id_usuario_accion

        UNION ALL

        SELECT pgd.fecha_hora AS fecha, 'pago' AS entidad, pgd.id_pago AS entidad_id,
               pgd.accion AS accion,
               pgd.id_usuario_accion AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
               pgd.observaciones AS descripcion, pgd.ip_dispositivo AS ip
        FROM Pagos_Detalle pgd
        LEFT JOIN Usuarios u ON u.id_usuarios = pgd.id_usuario_accion
    ) AS eventos
    ORDER BY fecha DESC
    LIMIT p_limite;
END //

-- ==================== PAGOS ====================

DROP PROCEDURE IF EXISTS sp_pagos_listar //
CREATE PROCEDURE sp_pagos_listar()
BEGIN
    SELECT
        pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
        pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
        tp.nom_tipo_pago AS metodo, pg.monto_total AS monto, pg.estado_pago AS estado,
        pg.codigo_pago, pg.fecha_pago, pg.fecha_confirmacion,
        pg.id_guardia, g.nombres AS guardia_nombres, g.apellidos AS guardia_apellidos
    FROM Pagos pg
    JOIN Tickets t ON t.id_ticket = pg.id_ticket
    JOIN Usuarios u ON u.id_usuarios = pg.id_usuario
    JOIN Tipos_pagos tp ON tp.id_tipo_pago = pg.id_tipo_pago
    LEFT JOIN Usuarios g ON g.id_usuarios = pg.id_guardia
    ORDER BY pg.fecha_pago DESC;
END //

DROP PROCEDURE IF EXISTS sp_pagos_obtener_por_id //
CREATE PROCEDURE sp_pagos_obtener_por_id(
    IN p_id INT
)
BEGIN
    SELECT
        pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
        pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
        tp.nom_tipo_pago AS metodo, pg.monto_total AS monto, pg.estado_pago AS estado,
        pg.codigo_pago, pg.fecha_pago, pg.fecha_confirmacion,
        pg.id_guardia, g.nombres AS guardia_nombres, g.apellidos AS guardia_apellidos
    FROM Pagos pg
    JOIN Tickets t ON t.id_ticket = pg.id_ticket
    JOIN Usuarios u ON u.id_usuarios = pg.id_usuario
    JOIN Tipos_pagos tp ON tp.id_tipo_pago = pg.id_tipo_pago
    LEFT JOIN Usuarios g ON g.id_usuarios = pg.id_guardia
    WHERE pg.id_pago = p_id;
END //

DROP PROCEDURE IF EXISTS sp_pagos_obtener_por_ticket //
CREATE PROCEDURE sp_pagos_obtener_por_ticket(
    IN p_id_ticket INT
)
BEGIN
    SELECT
        pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
        pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
        tp.nom_tipo_pago AS metodo, pg.monto_total AS monto, pg.estado_pago AS estado,
        pg.codigo_pago, pg.fecha_pago, pg.fecha_confirmacion,
        pg.id_guardia, g.nombres AS guardia_nombres, g.apellidos AS guardia_apellidos
    FROM Pagos pg
    JOIN Tickets t ON t.id_ticket = pg.id_ticket
    JOIN Usuarios u ON u.id_usuarios = pg.id_usuario
    JOIN Tipos_pagos tp ON tp.id_tipo_pago = pg.id_tipo_pago
    LEFT JOIN Usuarios g ON g.id_usuarios = pg.id_guardia
    WHERE pg.id_ticket = p_id_ticket;
END //

DROP PROCEDURE IF EXISTS sp_pagos_reporte_mensual //
CREATE PROCEDURE sp_pagos_reporte_mensual()
BEGIN
    SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
           COUNT(*) AS cantidad_pagos,
           COALESCE(SUM(monto_total), 0) AS total_cobrado
    FROM Pagos
    WHERE estado_pago = 'completado'
    GROUP BY mes
    ORDER BY mes DESC;
END //

-- Encapsula la transacción completa de "pago en efectivo" (validar ticket activo,
-- validar que no tenga pago, resolver tarifa y registrar el pago) que antes vivía
-- como varias consultas sueltas dentro de una transacción manual en Node.
DROP PROCEDURE IF EXISTS sp_pagos_crear_efectivo //
CREATE PROCEDURE sp_pagos_crear_efectivo(
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
    DECLARE v_id_tarifa INT DEFAULT NULL;
    DECLARE v_precio DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_codigo_pago VARCHAR(40);
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
    WHERE UPPER(placa_automovil) = UPPER(p_placa) AND activo = 1 AND fecha_salida IS NULL
    ORDER BY id_ticket DESC LIMIT 1
    FOR UPDATE;

    IF v_id_ticket IS NULL THEN
        SET p_mensaje = 'No hay un ticket activo para esa placa';
        ROLLBACK;
    ELSE
        SELECT id_pago INTO v_pago_existente FROM Pagos WHERE id_ticket = v_id_ticket LIMIT 1;

        IF v_pago_existente IS NOT NULL THEN
            SET p_mensaje = 'Este ticket ya tiene un pago registrado';
            ROLLBACK;
        ELSE
            SELECT id_tarifa, precio INTO v_id_tarifa, v_precio
            FROM Tarifas
            WHERE id_tipo_vehiculo = p_id_tipo_vehiculo AND id_tipo_pago = 1 AND activo = 1
            LIMIT 1;

            IF v_id_tarifa IS NULL THEN
                SET p_mensaje = 'No existe una tarifa en efectivo para este tipo de vehículo';
                ROLLBACK;
            ELSE
                IF v_id_usuario IS NULL THEN
                    SET v_id_usuario = p_id_guardia;
                END IF;

                SET v_codigo_pago = CONCAT('PAGO-', DATE_FORMAT(NOW(6), '%Y%m%d%H%i%s%f'));

                INSERT INTO Pagos (
                    id_ticket, id_tarifa, id_usuario, id_tipo_pago, monto_total, monto_neto,
                    codigo_pago, estado_pago, fecha_pago, fecha_confirmacion, id_guardia
                ) VALUES (
                    v_id_ticket, v_id_tarifa, v_id_usuario, 1, v_precio, v_precio,
                    v_codigo_pago, 'completado', NOW(), NOW(), p_id_guardia
                );

                SET p_id_pago = LAST_INSERT_ID();
                SET p_monto = v_precio;
                SET p_mensaje = 'OK';
                COMMIT;
            END IF;
        END IF;
    END IF;
END //

-- ==================== PARQUEO ====================

DROP PROCEDURE IF EXISTS sp_parqueo_listar //
CREATE PROCEDURE sp_parqueo_listar()
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.lugar, z.nom_zona AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
        t.fecha_entrada, t.fecha_salida,
        p.fecha_ocupacion, p.fecha_liberacion,
        el.nom_estado AS estado_lugar,
        pg.monto_total AS costo, pg.estado_pago,
        CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
    LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    ORDER BY p.id_parqueo DESC;
END //

DROP PROCEDURE IF EXISTS sp_parqueo_obtener_por_id //
CREATE PROCEDURE sp_parqueo_obtener_por_id(
    IN p_id INT
)
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.lugar, z.nom_zona AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
        t.fecha_entrada, t.fecha_salida,
        p.fecha_ocupacion, p.fecha_liberacion,
        el.nom_estado AS estado_lugar,
        pg.monto_total AS costo, pg.estado_pago,
        CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
    LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    WHERE p.id_parqueo = p_id;
END //

DROP PROCEDURE IF EXISTS sp_parqueo_obtener_activo_por_placa //
CREATE PROCEDURE sp_parqueo_obtener_activo_por_placa(
    IN p_placa VARCHAR(10)
)
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.lugar, z.nom_zona AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
        t.fecha_entrada, t.fecha_salida,
        p.fecha_ocupacion, p.fecha_liberacion,
        el.nom_estado AS estado_lugar,
        pg.monto_total AS costo, pg.estado_pago,
        CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
    LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    WHERE t.placa_automovil = UPPER(p_placa) AND p.fecha_liberacion IS NULL
    ORDER BY p.id_parqueo DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS sp_parqueo_historial_por_placa //
CREATE PROCEDURE sp_parqueo_historial_por_placa(
    IN p_placa VARCHAR(10),
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE
)
BEGIN
    SELECT
        p.id_parqueo AS id, p.id_lugar, l.lugar, z.nom_zona AS zona,
        p.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
        t.fecha_entrada, t.fecha_salida,
        p.fecha_ocupacion, p.fecha_liberacion,
        el.nom_estado AS estado_lugar,
        pg.monto_total AS costo, pg.estado_pago,
        CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado
    FROM Parqueos p
    JOIN Lugares l ON l.id_lugar = p.id_lugar
    JOIN Zonas z ON z.id_zona = l.id_zona
    JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
    LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
    LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
    WHERE t.placa_automovil = UPPER(p_placa) AND DATE(p.fecha_ocupacion) BETWEEN p_fecha_inicio AND p_fecha_fin
    ORDER BY p.fecha_ocupacion DESC;
END //

-- ==================== TARIFAS ====================

DROP PROCEDURE IF EXISTS sp_tarifas_listar //
CREATE PROCEDURE sp_tarifas_listar()
BEGIN
    SELECT
        t.id_tarifa, t.id_tipo_vehiculo, tv.nom_tipo_vehiculo, t.id_tipo_pago, tp.nom_tipo_pago,
        t.precio, t.costo_transaccion, t.ganancia, t.activo, t.fecha_creacion, t.fecha_modificacion
    FROM Tarifas t
    JOIN Tipo_vehiculos tv ON tv.id_modelo = t.id_tipo_vehiculo
    JOIN Tipos_pagos tp ON tp.id_tipo_pago = t.id_tipo_pago
    ORDER BY tv.nom_tipo_vehiculo, tp.nom_tipo_pago;
END //

DROP PROCEDURE IF EXISTS sp_tarifas_obtener_por_id //
CREATE PROCEDURE sp_tarifas_obtener_por_id(
    IN p_id INT
)
BEGIN
    SELECT
        t.id_tarifa, t.id_tipo_vehiculo, tv.nom_tipo_vehiculo, t.id_tipo_pago, tp.nom_tipo_pago,
        t.precio, t.costo_transaccion, t.ganancia, t.activo, t.fecha_creacion, t.fecha_modificacion
    FROM Tarifas t
    JOIN Tipo_vehiculos tv ON tv.id_modelo = t.id_tipo_vehiculo
    JOIN Tipos_pagos tp ON tp.id_tipo_pago = t.id_tipo_pago
    WHERE t.id_tarifa = p_id;
END //

DROP PROCEDURE IF EXISTS sp_tarifas_crear //
CREATE PROCEDURE sp_tarifas_crear(
    IN p_id_tipo_vehiculo INT,
    IN p_id_tipo_pago INT,
    IN p_precio DECIMAL(10,2),
    IN p_costo_transaccion DECIMAL(10,2),
    OUT p_id_tarifa INT
)
BEGIN
    DECLARE v_ganancia DECIMAL(10,2);
    SET v_ganancia = CASE WHEN p_costo_transaccion IS NULL THEN NULL ELSE ROUND(p_precio - p_costo_transaccion, 2) END;

    INSERT INTO Tarifas (id_tipo_vehiculo, id_tipo_pago, precio, costo_transaccion, ganancia, activo)
    VALUES (p_id_tipo_vehiculo, p_id_tipo_pago, p_precio, p_costo_transaccion, v_ganancia, 1);

    SET p_id_tarifa = LAST_INSERT_ID();
END //

-- Recibe los valores YA resueltos (el repositorio conserva la regla de "si no viene
-- el campo, se mantiene el valor actual"); el procedimiento solo calcula la ganancia
-- y aplica el UPDATE.
DROP PROCEDURE IF EXISTS sp_tarifas_actualizar //
CREATE PROCEDURE sp_tarifas_actualizar(
    IN p_id INT,
    IN p_precio DECIMAL(10,2),
    IN p_costo_transaccion DECIMAL(10,2),
    IN p_activo TINYINT,
    IN p_activo_provisto TINYINT,
    OUT p_afectado TINYINT
)
BEGIN
    UPDATE Tarifas
    SET precio = p_precio,
        costo_transaccion = p_costo_transaccion,
        ganancia = CASE WHEN p_costo_transaccion IS NULL THEN NULL ELSE ROUND(p_precio - p_costo_transaccion, 2) END,
        fecha_modificacion = NOW(),
        activo = CASE WHEN p_activo_provisto = 1 THEN p_activo ELSE activo END
    WHERE id_tarifa = p_id;

    SET p_afectado = ROW_COUNT() > 0;
END //

DROP PROCEDURE IF EXISTS sp_tarifas_existe_combinacion //
CREATE PROCEDURE sp_tarifas_existe_combinacion(
    IN p_id_tipo_vehiculo INT,
    IN p_id_tipo_pago INT,
    OUT p_existe TINYINT
)
BEGIN
    SELECT COUNT(*) > 0 INTO p_existe
    FROM Tarifas
    WHERE id_tipo_vehiculo = p_id_tipo_vehiculo AND id_tipo_pago = p_id_tipo_pago;
END //

-- ==================== VEHICULOS (admin) ====================
-- Solo las consultas de la vista de administrador (tabla `Vehiculos` con mayúscula).
-- Las funciones sobre la tabla legacy `vehiculos` no se tocan.

DROP PROCEDURE IF EXISTS sp_vehiculos_listar //
CREATE PROCEDURE sp_vehiculos_listar()
BEGIN
    SELECT
        v.id_vehiculo AS id, v.placa, v.modelo, v.color, v.año, v.activo,
        m.nom_marca AS marca, tv.nom_tipo_vehiculo AS tipo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.dpi AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Marca_vehiculos m ON m.id_marca = v.id_marca
    JOIN Tipo_vehiculos tv ON tv.id_modelo = v.id_tipo_vehiculo
    JOIN Usuarios u ON u.id_usuarios = v.id_usuario
    ORDER BY v.id_vehiculo;
END //

DROP PROCEDURE IF EXISTS sp_vehiculos_obtener_por_id //
CREATE PROCEDURE sp_vehiculos_obtener_por_id(
    IN p_id INT
)
BEGIN
    SELECT
        v.id_vehiculo AS id, v.placa, v.modelo, v.color, v.año, v.activo,
        m.nom_marca AS marca, tv.nom_tipo_vehiculo AS tipo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.dpi AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Marca_vehiculos m ON m.id_marca = v.id_marca
    JOIN Tipo_vehiculos tv ON tv.id_modelo = v.id_tipo_vehiculo
    JOIN Usuarios u ON u.id_usuarios = v.id_usuario
    WHERE v.id_vehiculo = p_id;
END //

DROP PROCEDURE IF EXISTS sp_vehiculos_obtener_por_placa //
CREATE PROCEDURE sp_vehiculos_obtener_por_placa(
    IN p_placa VARCHAR(10)
)
BEGIN
    SELECT
        v.id_vehiculo AS id, v.placa, v.modelo, v.color, v.año, v.activo,
        m.nom_marca AS marca, tv.nom_tipo_vehiculo AS tipo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.dpi AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Marca_vehiculos m ON m.id_marca = v.id_marca
    JOIN Tipo_vehiculos tv ON tv.id_modelo = v.id_tipo_vehiculo
    JOIN Usuarios u ON u.id_usuarios = v.id_usuario
    WHERE v.placa = UPPER(p_placa)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS sp_vehiculos_buscar //
CREATE PROCEDURE sp_vehiculos_buscar(
    IN p_filtro VARCHAR(100)
)
BEGIN
    DECLARE v_termino VARCHAR(102);
    SET v_termino = CONCAT('%', p_filtro, '%');

    SELECT
        v.id_vehiculo AS id, v.placa, v.modelo, v.color, v.año, v.activo,
        m.nom_marca AS marca, tv.nom_tipo_vehiculo AS tipo,
        v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
        u.dpi AS dueno_dpi, u.email AS dueno_email
    FROM Vehiculos v
    JOIN Marca_vehiculos m ON m.id_marca = v.id_marca
    JOIN Tipo_vehiculos tv ON tv.id_modelo = v.id_tipo_vehiculo
    JOIN Usuarios u ON u.id_usuarios = v.id_usuario
    WHERE v.placa LIKE v_termino OR m.nom_marca LIKE v_termino OR v.modelo LIKE v_termino
       OR u.nombres LIKE v_termino OR u.apellidos LIKE v_termino OR u.dpi LIKE v_termino
    ORDER BY v.id_vehiculo;
END //

DELIMITER ;
