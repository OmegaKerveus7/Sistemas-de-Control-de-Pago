-- Quién pagó en línea: nombre y correo que el pagador escribió en el checkout de Recurrente.
-- Selecciona la base de datos antes de ejecutar. Ejecutar UNA sola vez y con respaldo:
-- MySQL aplica DDL con commit implícito, y ADD COLUMN falla si la columna ya existe.
-- No toca filas existentes. Ejecutar ANTES de desplegar el backend que las escribe.
--
-- Pagos.id_usuario sigue siendo el dueño del ticket (o el guardia de la entrada) en el pago
-- público; estas columnas guardan a la persona que realmente pagó. Quedan NULL en pagos en
-- efectivo, en pagos sin dato y en pruebas con datos de relleno del sandbox.

ALTER TABLE Pagos
    ADD COLUMN pagador_nombre VARCHAR(120) NULL AFTER nombre_facturacion,
    ADD COLUMN pagador_correo VARCHAR(254) NULL AFTER pagador_nombre;

-- El trigger de actualización copia la fila a Log_Pagos: debe conocer las columnas nuevas.
ALTER TABLE Log_Pagos
    ADD COLUMN pagador_nombre VARCHAR(120) NULL AFTER nombre_facturacion,
    ADD COLUMN pagador_correo VARCHAR(254) NULL AFTER pagador_nombre;

DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_pagos_update$$
CREATE TRIGGER trg_log_pagos_update
BEFORE UPDATE ON Pagos
FOR EACH ROW
BEGIN
    INSERT INTO Log_Pagos (
        id_pago, id_ticket, id_usuario, placa, id_tipo,
        metodo_pago, monto, codigo_validacion, estado_pago,
        fecha_pago, fecha_confirmacion, fecha_vigencia, nit, nombre_facturacion,
        pagador_nombre, pagador_correo,
        fecha_autorizacion_salida,
        transaction_id, gateway_response, observacion,
        accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.id_pago, OLD.id_ticket, OLD.id_usuario, OLD.placa, OLD.id_tipo,
        OLD.metodo_pago, OLD.monto, OLD.codigo_validacion, OLD.estado_pago,
        OLD.fecha_pago, OLD.fecha_confirmacion, OLD.fecha_vigencia, OLD.nit, OLD.nombre_facturacion,
        OLD.pagador_nombre, OLD.pagador_correo,
        OLD.fecha_autorizacion_salida,
        OLD.transaction_id, OLD.gateway_response, OLD.observacion,
        'UPDATE', IFNULL(OLD.id_usuario, 1), NULL
    );
END$$
DELIMITER ;
