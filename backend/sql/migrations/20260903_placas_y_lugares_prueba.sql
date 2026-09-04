-- Placas nacionales usadas por el flujo del proyecto:
-- carro P123ABC y moto M123ABC (7 caracteres).
ALTER TABLE Vehiculos MODIFY COLUMN placa VARCHAR(7) NOT NULL;
ALTER TABLE Tickets MODIFY COLUMN placa_automovil VARCHAR(7) NOT NULL;

-- Normaliza exclusivamente los datos QA creados para las pruebas anteriores.
UPDATE Vehiculos SET placa = 'P111AAA' WHERE placa = 'CAR001';
UPDATE Vehiculos SET placa = 'P222BBB' WHERE placa = 'CAR002';
UPDATE Vehiculos SET placa = 'P333CCC' WHERE placa = 'PEND01';
UPDATE Vehiculos SET placa = 'M111AAA' WHERE placa = 'MOT001';
UPDATE Vehiculos SET placa = 'M222BBB' WHERE placa = 'MOT002';
UPDATE Tickets SET placa_automovil = 'P111AAA' WHERE placa_automovil = 'CAR001';
UPDATE Tickets SET placa_automovil = 'P222BBB' WHERE placa_automovil = 'CAR002';
UPDATE Tickets SET placa_automovil = 'P333CCC' WHERE placa_automovil = 'PEND01';
UPDATE Tickets SET placa_automovil = 'M111AAA' WHERE placa_automovil = 'MOT001';
UPDATE Tickets SET placa_automovil = 'M222BBB' WHERE placa_automovil = 'MOT002';
UPDATE Tickets
SET qr_data = REPLACE(qr_data, 'MOT002', 'M222BBB')
WHERE qr_data LIKE '%MOT002%';

-- Añade 5 lugares de carro y 5 de moto en cada zona activa.
-- El nombre es una convención visual; la compatibilidad real se guarda en id_tipo_vehiculo.
INSERT INTO Lugares (id_zona, id_tipo_vehiculo, lugar, id_estado_lugar, activo, fecha_creacion, fecha_modificacion)
SELECT z.id_zona, tipo.id_modelo, CONCAT(prefijo.valor, numero.valor), estado.id_estado_lugar, 1, NOW(), NOW()
FROM Zonas z
JOIN Tipo_vehiculos tipo ON tipo.nom_tipo_vehiculo IN ('carro', 'moto') AND tipo.activo = 1
JOIN Estados_Lugares estado ON estado.nom_estado = 'disponible' AND estado.activo = 1
JOIN (
  SELECT 'C' AS valor UNION ALL SELECT 'M'
) prefijo ON (prefijo.valor = 'C' AND tipo.nom_tipo_vehiculo = 'carro')
             OR (prefijo.valor = 'M' AND tipo.nom_tipo_vehiculo = 'moto')
JOIN (
  SELECT '03' AS valor UNION ALL SELECT '04' UNION ALL SELECT '05' UNION ALL SELECT '06' UNION ALL SELECT '07'
) numero
WHERE z.activo = 1
  AND NOT EXISTS (
    SELECT 1 FROM Lugares existente
    WHERE existente.id_zona = z.id_zona AND existente.lugar = CONCAT(prefijo.valor, numero.valor)
  );
