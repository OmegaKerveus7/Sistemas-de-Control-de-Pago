-- Roles del sistema
CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `rol` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uq_roles_rol` (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar roles predeterminados
INSERT IGNORE INTO `roles` (`id_rol`, `rol`) VALUES
  (1, 'ADMIN'),
  (2, 'Administracion'),
  (3, 'Guardia'),
  (4, 'cliente'),
  (5, 'gerente');

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS `usuarios` (
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
