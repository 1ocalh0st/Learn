-- GitHub 登录相关字段迁移
-- 执行此脚本为 users 表添加 GitHub 登录所需字段

ALTER TABLE users 
ADD COLUMN github_id VARCHAR(64) NULL UNIQUE COMMENT 'GitHub 用户ID',
ADD COLUMN github_login VARCHAR(128) NULL COMMENT 'GitHub 用户名',
ADD COLUMN github_avatar VARCHAR(512) NULL COMMENT 'GitHub 头像URL',
ADD COLUMN email VARCHAR(256) NULL COMMENT '邮箱地址';

-- 创建索引加速查询
CREATE INDEX idx_users_github_id ON users(github_id);

-- 查看表结构
DESCRIBE users;
