-- 用户表：登录 account 对应 users.account 或 users.email
USE `lcarus-magic`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account`       VARCHAR(64)  NOT NULL COMMENT '登录账号',
  `email`         VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希',
  `display_name`  VARCHAR(64)  NULL,
  `role`          VARCHAR(32)  NOT NULL DEFAULT 'user',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1=正常 0=禁用',
  `last_login_at` DATETIME(3)  NULL,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_account` (`account`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
