-- Agrega únicamente el movimiento faltante. Se puede ejecutar más de una vez.
INSERT INTO Movimientos (nombre, descripcion)
SELECT 'autorizacion_salida', 'Validación de pago para autorizar la salida'
WHERE NOT EXISTS (SELECT 1 FROM Movimientos WHERE nombre = 'autorizacion_salida');
