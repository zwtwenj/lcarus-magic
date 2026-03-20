-- 若旧表已有 username 列、无 account，可执行本脚本对齐接口
USE `lcarus-magic`;

ALTER TABLE `users` CHANGE COLUMN `username` `account` VARCHAR(64) NOT NULL COMMENT '登录账号';
