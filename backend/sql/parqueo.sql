-- Parqueo: registros de entrada y salida de vehículos.
-- Un pago queda asociado a un parqueo mediante parqueo_id (ver pagos.sql).
CREATE TABLE IF NOT EXISTS `parqueo` (
  `id_parqueo` bigint(20) NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) NOT NULL,
  `hora_entrada` datetime NOT NULL,
  `hora_salida` datetime DEFAULT NULL,
  `costo` decimal(10,2) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `ticket` varchar(50) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_parqueo`),
  KEY `idx_parqueo_placa` (`placa`),
  KEY `idx_parqueo_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;