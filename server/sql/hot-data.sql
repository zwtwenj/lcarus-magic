-- 热点列表（与上游 JSON 数组项字段一致）+ time = 用户请求 YYYYMMDD
-- 执行：mysql -h ... -u ... -p lcarus-magic < sql/hot-data.sql

CREATE TABLE IF NOT EXISTS `hot-data` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `time` CHAR(8) NOT NULL COMMENT '用户传入 YYYYMMDD',
  `title` TEXT NOT NULL,
  `summary` TEXT NULL,
  `material` JSON NULL COMMENT '素材 URL 数组',
  `remake` VARCHAR(512) NULL,
  `source` JSON NULL COMMENT '来源 URL 数组',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hot_data_time` (`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
