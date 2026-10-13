-- Pago público por placa (sin sesión) con permiso vigente por día.
-- Selecciona la base de datos antes de ejecutar. Ejecutar UNA sola vez y con respaldo:
-- MySQL aplica DDL con commit implícito, y ADD COLUMN falla si la columna ya existe.
-- No toca filas existentes (no hay backfill: un UPDATE masivo dispararía el trigger de Log_Pagos).
--
-- Antes: cada pago pertenecía a un ticket abierto (Pagos.id_ticket NOT NULL) y a un usuario.
-- Ahora: un pago puede existir ANTES de la entrada. Queda ligado a la placa y a un día
-- (fecha_vigencia); la entrada del guardia lo enlaza al ticket (id_ticket) y los reingresos
-- del mismo día lo reutilizan. Los pagos anteriores conservan fecha_vigencia NULL y siguen
-- validándose por id_ticket.

ALTER TABLE Pagos
    MODIFY COLUMN id_ticket INT NULL,
    ADD COLUMN fecha_vigencia DATE NULL AFTER fecha_confirmacion,
    ADD COLUMN nit VARCHAR(15) NULL AFTER fecha_vigencia,
    ADD COLUMN nombre_facturacion VARCHAR(120) NULL AFTER nit;

-- El trigger de actualización copia la fila a Log_Pagos: sin esto, confirmar un pago
-- sin ticket (webhook/reconciliación) fallaría al insertar el historial.
ALTER TABLE Log_Pagos
    MODIFY COLUMN id_ticket INT NULL,
    ADD COLUMN fecha_vigencia DATE NULL AFTER fecha_confirmacion,
    ADD COLUMN nit VARCHAR(15) NULL AFTER fecha_vigencia,
    ADD COLUMN nombre_facturacion VARCHAR(120) NULL AFTER nit;

CREATE INDEX idx_pagos_placa_vigencia ON Pagos (placa, fecha_vigencia, estado_pago);

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
        fecha_autorizacion_salida,
        transaction_id, gateway_response, observacion,
        accion, id_usuario_accion, ip_dispositivo
    ) VALUES (
        OLD.id_pago, OLD.id_ticket, OLD.id_usuario, OLD.placa, OLD.id_tipo,
        OLD.metodo_pago, OLD.monto, OLD.codigo_validacion, OLD.estado_pago,
        OLD.fecha_pago, OLD.fecha_confirmacion, OLD.fecha_vigencia, OLD.nit, OLD.nombre_facturacion,
        OLD.fecha_autorizacion_salida,
        OLD.transaction_id, OLD.gateway_response, OLD.observacion,
        'UPDATE', IFNULL(OLD.id_usuario, 1), NULL
    );
END$$
DELIMITER ;
