-- 字幕表：名称 + 业务侧唯一编号（如 guodong），与自增 id 独立
USE `lcarus-magic`;

CREATE TABLE IF NOT EXISTS `subtitles` (
  `id`    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`  VARCHAR(255) NOT NULL COMMENT '名称，如：果冻',
  `code`  VARCHAR(64)  NOT NULL COMMENT '唯一编号，如：guodong（字幕1）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subtitles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 示例：
-- INSERT INTO `subtitles` (`id`, `name`, `code`) VALUES (1, '果冻', 'guodong');
