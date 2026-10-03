-- Para la estructura BD_final.sql. Selecciona la base de datos antes de ejecutar.
-- Ejecutar sin escrituras concurrentes y con respaldo: MySQL aplica DDL con commit
-- implícito. No ejecutar el script completo BD_final.sql sobre datos existentes.
-- Se conservan las placas actuales; no se infieren prefijos para datos antiguos.

ALTER TABLE Tickets DROP FOREIGN KEY fk_ticket_vehiculo;
ALTER TABLE Pagos DROP FOREIGN KEY fk_pago_vehiculo;

ALTER TABLE Vehiculos
    MODIFY COLUMN placa VARCHAR(7) NOT NULL,
    MODIFY COLUMN id_usuario INT NULL;
ALTER TABLE Tickets MODIFY COLUMN placa VARCHAR(7) NOT NULL;
ALTER TABLE Pagos MODIFY COLUMN placa VARCHAR(7) NOT NULL;

-- El trigger de actualización copia el propietario anterior al historial.
-- Un visitante todavía no tiene propietario ni usuario de acción asociado.
ALTER TABLE Log_Vehiculos
    MODIFY COLUMN placa VARCHAR(7) NOT NULL,
    MODIFY COLUMN id_usuario INT NULL,
    MODIFY COLUMN id_usuario_accion INT NULL;
ALTER TABLE Log_Tickets MODIFY COLUMN placa VARCHAR(7) NOT NULL;
ALTER TABLE Log_Pagos MODIFY COLUMN placa VARCHAR(7) NOT NULL;

ALTER TABLE Tickets ADD CONSTRAINT fk_ticket_vehiculo
    FOREIGN KEY (placa) REFERENCES Vehiculos(placa);
ALTER TABLE Pagos ADD CONSTRAINT fk_pago_vehiculo
    FOREIGN KEY (placa) REFERENCES Vehiculos(placa);
