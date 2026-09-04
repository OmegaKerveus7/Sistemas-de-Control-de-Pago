-- Propuesta aditiva. NO ejecutar en la BD centralizada sin aprobación explícita.
-- Motivo: Lugares no identifica el tipo de vehículo compatible; el módulo Guardian
-- necesita esa relación para asignar únicamente espacios compatibles.
--
-- UP
ALTER TABLE Lugares
  ADD COLUMN id_tipo_vehiculo INT NULL AFTER id_zona,
  ADD CONSTRAINT fk_lugar_tipo_vehiculo
    FOREIGN KEY (id_tipo_vehiculo) REFERENCES Tipo_vehiculos(id_modelo);

-- Después de aplicar UP, Administración debe clasificar cada lugar real. Los lugares
-- con id_tipo_vehiculo NULL no se asignarán automáticamente hasta ser clasificados.
-- Ejemplo manual, únicamente después de confirmar los IDs de catálogo:
-- UPDATE Lugares SET id_tipo_vehiculo = <id_tipo> WHERE id_lugar = <id_lugar>;
--
-- DOWN (elimina la relación y los valores de compatibilidad guardados en esta columna)
-- ALTER TABLE Lugares DROP FOREIGN KEY fk_lugar_tipo_vehiculo;
-- ALTER TABLE Lugares DROP COLUMN id_tipo_vehiculo;
