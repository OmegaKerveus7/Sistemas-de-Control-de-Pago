-- ============================================================
-- MIGRACIÓN: Eliminar tarifas, recrear vehiculos, crear usuario_vehiculos
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Eliminar tabla tarifas (no existe en el negocio)
DROP TABLE IF EXISTS `tarifas`;

-- Recrear tabla vehiculos con campos completos
DROP TABLE IF EXISTS `vehiculos`;

-- Crear tabla vehiculos correctamente
CREATE TABLE `vehiculos` (
  `id_vehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) NOT NULL,
  `marca` varchar(50) NOT NULL,
  `modelo` varchar(50) NOT NULL,
  `color` varchar(30) NOT NULL,
  `tipo` enum('automovil','motocicleta','camioneta','otro') NOT NULL DEFAULT 'automovil',
  `foto` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `uq_vehiculos_placa` (`placa`),
  KEY `idx_vehiculos_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla intermedia: relación usuario ↔ vehículos (un usuario tiene muchos vehículos)
CREATE TABLE `usuario_vehiculos` (
  `id_usuario_vehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_vehiculo` int(11) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario_vehiculo`),
  UNIQUE KEY `uq_usuario_vehiculo` (`id_usuario`, `id_vehiculo`),
  KEY `idx_uv_usuario` (`id_usuario`),
  KEY `idx_uv_vehiculo` (`id_vehiculo`),
  CONSTRAINT `fk_uv_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_uv_vehiculo` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
