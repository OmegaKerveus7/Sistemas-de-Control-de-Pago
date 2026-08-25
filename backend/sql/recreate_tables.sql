-- ============================================================
-- SCRIPT COMPLETO: Eliminar y recrear toda la base de datos
-- Base de datos: u878723730_parqueo
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS `loginN`;
DROP PROCEDURE IF EXISTS `usuariosM`;
DROP PROCEDURE IF EXISTS `registrarEntrada`;
DROP PROCEDURE IF EXISTS `registrarSalida`;
DROP PROCEDURE IF EXISTS `consultarHistorial`;

DROP TABLE IF EXISTS `auditoria`;
DROP TABLE IF EXISTS `pagos`;
DROP TABLE IF EXISTS `parqueo_historial`;
DROP TABLE IF EXISTS `parqueo`;
DROP TABLE IF EXISTS `vehiculos`;
DROP TABLE IF EXISTS `tarifas`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `rol` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uq_roles_rol` (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id_rol`, `rol`) VALUES
  (1, 'ADMIN'),
  (2, 'Administracion'),
  (3, 'Guardia'),
  (4, 'cliente'),
  (5, 'gerente');

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `rol` int(11) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `contraseña` varchar(200) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `dpi` char(13) NOT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `vehiculo` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `dispositivo` varchar(45) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  UNIQUE KEY `uq_usuarios_dpi` (`dpi`),
  KEY `idx_usuarios_rol` (`rol`),
  KEY `idx_usuarios_activo` (`activo`),
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vehiculos` (
  `id_vehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `modelo_vehiculo` varchar(100) NOT NULL,
  `foto_vehiculo` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tarifas` (
  `id_tarifa` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_vehiculo` enum('automovil','motocicleta','camioneta','otro') NOT NULL,
  `costo_por_hora` decimal(10,2) NOT NULL,
  `costo_maximo_diario` decimal(10,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tarifa`),
  KEY `idx_tarifas_tipo` (`tipo_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `parqueo` (
  `id_parqueo` bigint(20) NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) NOT NULL,
  `num_parqueo` varchar(10) NOT NULL,
  `hora_entrada` datetime NOT NULL,
  `hora_salida` datetime DEFAULT NULL,
  `costo` decimal(10,2) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `ticket` varchar(50) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_parqueo`),
  KEY `idx_parqueo_placa` (`placa`),
  KEY `idx_parqueo_estado` (`estado`),
  KEY `idx_parqueo_num` (`num_parqueo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `parqueo_historial` (
  `id_historial` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_parqueo` bigint(20) NOT NULL,
  `placa` varchar(20) NOT NULL,
  `num_parqueo` varchar(10) NOT NULL,
  `fecha` date NOT NULL,
  `hora_entrada` datetime NOT NULL,
  `hora_salida` datetime DEFAULT NULL,
  `costo` decimal(10,2) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'activo',
  `ticket` varchar(50) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `idx_historial_parqueo` (`id_parqueo`),
  KEY `idx_historial_placa` (`placa`),
  KEY `idx_historial_fecha` (`fecha`),
  CONSTRAINT `fk_historial_parqueo` FOREIGN KEY (`id_parqueo`)
    REFERENCES `parqueo` (`id_parqueo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pagos` (
  `id_pago` bigint(20) NOT NULL AUTO_INCREMENT,
  `parqueo_id` bigint(20) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo` varchar(20) NOT NULL DEFAULT 'tarjeta',
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `referencia` varchar(100) DEFAULT NULL,
  `ip_inicio` varchar(45) DEFAULT NULL,
  `ip_pago` varchar(45) DEFAULT NULL,
  `procesado_por` int(11) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago`),
  UNIQUE KEY `uq_pagos_referencia` (`referencia`),
  KEY `idx_pagos_estado` (`estado`),
  KEY `idx_pagos_creado` (`creado_en`),
  KEY `idx_pagos_parqueo` (`parqueo_id`),
  CONSTRAINT `fk_pagos_parqueo` FOREIGN KEY (`parqueo_id`)
    REFERENCES `parqueo` (`id_parqueo`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auditoria` (
  `id_auditoria` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(150) NOT NULL,
  `entidad` varchar(100) DEFAULT NULL,
  `detalle` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  KEY `idx_auditoria_usuario` (`id_usuario`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
