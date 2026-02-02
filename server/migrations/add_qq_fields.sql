-- QQ 登录相关字段迁移
-- 执行此脚本为 users 表添加 QQ 登录所需字段

ALTER TABLE users 
ADD COLUMN qq_openid VARCHAR(128) NULL UNIQUE COMMENT 'QQ OpenID',
ADD COLUMN qq_avatar VARCHAR(512) NULL COMMENT 'QQ 头像URL';

-- 创建索引加速查询
CREATE INDEX idx_users_qq_openid ON users(qq_openid);

-- 查看表结构
DESCRIBE users;
